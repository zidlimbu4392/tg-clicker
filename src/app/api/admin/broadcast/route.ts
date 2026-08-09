import { NextResponse } from 'next/server';
import db from '@/lib/db';

const ADMIN_ID = process.env.ADMIN_ID || '';

export async function POST(req: Request) {
  try {
    const { telegram_id, text, image_url } = await req.json();
    
    // Auth check
    if (telegram_id !== ADMIN_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    // Fetch all users to broadcast to
    const users = db.prepare('SELECT telegram_id FROM users').all() as { telegram_id: string }[];
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN is not set! Mocking broadcast success for ' + users.length + ' users.');
      // Simulate delay for realism
      await new Promise(resolve => setTimeout(resolve, 1500));
      return NextResponse.json({ success: true, count: users.length, mocked: true });
    }

    let successCount = 0;
    
    // Send to Telegram API (Note: In production, use a queue or batching to avoid rate limits)
    const sendMessage = async (chatId: string) => {
      try {
        let url = `https://api.telegram.org/bot${botToken}/`;
        let payload: any = {
          chat_id: chatId,
          parse_mode: 'HTML'
        };

        if (image_url) {
          url += 'sendPhoto';
          payload.photo = image_url;
          payload.caption = text;
        } else {
          url += 'sendMessage';
          payload.text = text;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) successCount++;
      } catch (e) {
        console.error('Failed to send to', chatId, e);
      }
    };

    // Send in small batches to respect rate limits roughly
    for (let i = 0; i < users.length; i += 10) {
      const batch = users.slice(i, i + 10);
      await Promise.all(batch.map(u => sendMessage(u.telegram_id)));
      if (i + 10 < users.length) await new Promise(res => setTimeout(res, 500)); // Sleep 500ms between batches
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
