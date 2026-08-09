import { NextResponse } from 'next/server';
import db, { getUser, createUser, updateUser } from '@/lib/db';
import { ENERGY_REGEN_RATE } from '@/lib/gameConfig';
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

    const now = Date.now();
    let user = getUser(telegram_id);

    if (!user) {
      user = createUser(telegram_id, now);
    } else {
      // Calculate offline passive income and energy regeneration
      const timeDiffSeconds = Math.floor((now - user.last_sync) / 1000);
      if (timeDiffSeconds > 0) {
        const earned = Math.floor(user.passive_income * (timeDiffSeconds / 3600)); // income per hour
        const newBalance = user.balance + earned;
        
        const regeneratedEnergy = timeDiffSeconds * ENERGY_REGEN_RATE;
        const newEnergy = Math.min(user.max_energy, user.energy + regeneratedEnergy);

        updateUser(telegram_id, {
          balance: newBalance,
          energy: newEnergy,
          last_sync: now
        });
        
        user.balance = newBalance;
        user.energy = newEnergy;
        user.last_sync = now;
      }
    }

    const isAdmin = process.env.NEXT_PUBLIC_ADMIN_ID === telegram_id || process.env.ADMIN_ID === telegram_id;

    return NextResponse.json({ 
      user: {
        ...user,
        isAdmin
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
