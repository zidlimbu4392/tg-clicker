import { NextResponse } from 'next/server';
import db, { logTransaction } from '@/lib/db';
import { validateInitData } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { initData, amount, method, address } = await req.json();
    
    if (!initData || !amount || !address) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegram_id = authResult.user.id.toString();

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 10) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is 10 USDT' }, { status: 400 });
    }

    // Verify balance
    const user = db.prepare('SELECT balance FROM users WHERE telegram_id = ?').get(telegram_id) as { balance: number } | undefined;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.balance < parsedAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const newBalance = user.balance - parsedAmount;
    db.prepare('UPDATE users SET balance = ? WHERE telegram_id = ?').run(newBalance, telegram_id);

    logTransaction(telegram_id, 'withdraw', parsedAmount, method || 'USDT', 'pending', address);

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (err: any) {
    console.error('Withdrawal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
