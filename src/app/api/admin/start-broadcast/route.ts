import { NextResponse } from 'next/server';
import db from '@/lib/db';

const ADMIN_ID = process.env.ADMIN_ID;

export async function POST(req: Request) {
  try {
    const { telegram_id } = await req.json();
    
    // Auth check
    if (telegram_id !== ADMIN_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not configured in .env' }, { status: 500 });
    }

    // Ping the admin in Telegram
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: '📢 <b>Настройка Рассылки</b>\n\nПришлите мне сообщение (можно с фото), которое вы хотите отправить всем пользователям бота.',
        parse_mode: 'HTML'
      })
    });
    
    if (res.ok) {
      // Set the admin_state in DB to 'WAITING_FOR_BROADCAST_CONTENT'
      // Wait, there's no admin_state table. Let's create one or just use a temp file/memory.
      // Since server.js runs the bot, we can use a db table `keyval` for simple state sharing between route.ts and server.js.
      db.exec('CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT)');
      db.prepare('INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)').run('admin_broadcast_state', 'WAITING');

      return NextResponse.json({ success: true });
    } else {
      const data = await res.json();
      return NextResponse.json({ error: data.description }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
