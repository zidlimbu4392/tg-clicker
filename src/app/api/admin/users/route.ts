import { NextResponse } from 'next/server';
import db from '@/lib/db';

import { getSystemStats, getTransactions, logTransaction } from '@/lib/db';

const ADMIN_ID = process.env.ADMIN_ID;

export async function POST(req: Request) {
  try {
    const { action, telegram_id, target_id, new_balance } = await req.json();
    const ADMIN_ID = process.env.ADMIN_ID || process.env.NEXT_PUBLIC_ADMIN_ID;
    // Auth check
    if (telegram_id !== ADMIN_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'get_users') {
      const users = db.prepare('SELECT * FROM users ORDER BY balance DESC LIMIT 100').all();
      return NextResponse.json({ users });
    }

    if (action === 'get_stats') {
      const stats = getSystemStats();
      const transactions = getTransactions(100);
      const users = db.prepare('SELECT * FROM users ORDER BY balance DESC LIMIT 100').all();
      return NextResponse.json({ stats, transactions, users });
    }

    if (action === 'update_balance') {
      db.prepare('UPDATE users SET balance = ? WHERE telegram_id = ?').run(new_balance, target_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
