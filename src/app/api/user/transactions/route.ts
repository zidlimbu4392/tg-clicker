import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { validateInitData } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { initData } = await req.json();
    if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegram_id = authResult.user.id.toString();

    // Get latest 20 transactions for user
    const transactions = db.prepare('SELECT * FROM transactions WHERE telegram_id = ? ORDER BY timestamp DESC LIMIT 20').all(telegram_id);

    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
