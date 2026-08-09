import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { validateInitData } from '@/lib/auth';

// In a real application, this would be a webhook called by Telegram Stars API or TON Connect server.
// It would verify a cryptographic signature to ensure the request is legit.
// For the portfolio, we're simulating a successful payment return.

export async function POST(req: Request) {
  try {
    const { initData, amount, method } = await req.json();
    
    if (!initData || !amount) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegram_id = authResult.user.id.toString();

    // Mock payment verification delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update database
    const user = db.prepare('SELECT balance FROM users WHERE telegram_id = ?').get(telegram_id) as { balance: number } | undefined;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newBalance = user.balance + amount;
    db.prepare('UPDATE users SET balance = ? WHERE telegram_id = ?').run(newBalance, telegram_id);
    
    // Log transaction
    db.prepare('INSERT INTO transactions (telegram_id, type, amount, currency) VALUES (?, ?, ?, ?)').run(
      telegram_id, 'deposit', amount, method === 'USDT' ? 'USDT' : 'STARS'
    );

    return NextResponse.json({ success: true, newBalance, method });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
