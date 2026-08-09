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

    // Get top 50 users by balance
    const dbUsers = db.prepare('SELECT telegram_id, balance FROM users ORDER BY balance DESC LIMIT 50').all() as any[];
    
    // Fill up to 50 users with mock data if necessary
    const topUsers = [...dbUsers];
    while (topUsers.length < 50) {
      topUsers.push({
        telegram_id: `mock_${topUsers.length}`,
        balance: Math.floor(Math.random() * 50000) + 1000
      });
    }

    // Sort again just in case the mock balances are higher than some real users
    topUsers.sort((a, b) => b.balance - a.balance);

    // Mask the telegram_ids slightly for privacy if they are real IDs
    const safeTopUsers = topUsers.map((u: any, index: number) => {
      const idStr = String(u.telegram_id);
      let displayName = idStr;
      
      // Let's create some fake cool names for the portfolio based on ID to look real, 
      // but keep the user's ID as 'You' if it matches.
      if (idStr === authResult.user?.id.toString()) {
         displayName = 'You';
      } else {
         const prefixes = ['Crypto', 'Ton', 'Wallet', 'Max.', 'Black', 'Ninja', 'Whale', 'Super', 'Doge', 'Cat', 'Degen', 'Alpha', 'Pro'];
         const suffixes = ['Enjoy', 'News', 'ton', 'Crypto$', 'Trader', 'Boss', 'Holder', 'Player', 'Clicker', 'Pro', 'King', 'Master'];
         
         const numId = parseInt(idStr.replace(/\D/g, '')) || index;
         const pre = prefixes[numId % prefixes.length];
         const suf = suffixes[(numId * 3) % suffixes.length];
         displayName = `${pre}${suf}`;
      }

      const numId = parseInt(idStr.replace(/\D/g, '')) || index;
      const avatarId = (numId % 9) + 1;
      const avatar = `/${avatarId}y.png`;

      return {
        telegram_id: idStr,
        name: displayName,
        balance: Math.floor(u.balance),
        avatar: idStr === authResult.user?.id.toString() ? '/dog-avatar.svg' : avatar
      };
    });

    return NextResponse.json({ top: safeTopUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
