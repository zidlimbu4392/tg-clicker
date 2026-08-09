import { NextResponse } from 'next/server';
import db from '@/lib/db';

const ADMIN_ID = process.env.ADMIN_ID;

export async function POST(req: Request) {
  try {
    const { admin_telegram_id, transaction_id, action } = await req.json();
    const ADMIN_ID = process.env.ADMIN_ID || process.env.NEXT_PUBLIC_ADMIN_ID;
    
    // Auth check
    if (admin_telegram_id !== ADMIN_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!transaction_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transaction_id) as any;
    if (!tx || tx.type !== 'withdraw') {
      return NextResponse.json({ error: 'Transaction not found or is not a withdraw' }, { status: 404 });
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({ error: `Withdrawal is already ${tx.status}` }, { status: 400 });
    }

    if (action === 'approve') {
      // Admin already sent funds manually, mark as completed
      db.prepare('UPDATE transactions SET status = "completed" WHERE id = ?').run(transaction_id);
    } else if (action === 'reject') {
      // Refund user
      const user = db.prepare('SELECT balance FROM users WHERE telegram_id = ?').get(tx.telegram_id) as any;
      if (user) {
        db.prepare('UPDATE users SET balance = balance + ? WHERE telegram_id = ?').run(tx.amount, tx.telegram_id);
      }
      db.prepare('UPDATE transactions SET status = "rejected" WHERE id = ?').run(transaction_id);
    }

    return NextResponse.json({ success: true, id: transaction_id, status: action === 'approve' ? 'completed' : 'rejected' });
  } catch (err: any) {
    console.error('Admin withdrawal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
