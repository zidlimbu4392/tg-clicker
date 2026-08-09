import { NextResponse } from 'next/server';
import db, { getUser } from '@/lib/db';
import { ENERGY_REGEN_RATE } from '@/lib/gameConfig';
import { validateInitData } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { initData, tapsCount } = await req.json();
    if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegram_id = authResult.user.id.toString();

    const now = Date.now();
    let user = getUser(telegram_id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Validate if user has enough energy for the taps
    // For simplicity, we just subtract taps from energy
    // In a real app we'd rigorously validate this to prevent cheating
    
    // First apply offline generation
    const timeDiffSeconds = Math.floor((now - user.last_sync) / 1000);
    let currentEnergy = user.energy;
    let currentBalance = user.balance;

    let earned = 0;
    if (timeDiffSeconds > 0) {
      earned = Math.floor(user.passive_income * (timeDiffSeconds / 3600));
      currentBalance += earned;
      
      const regeneratedEnergy = timeDiffSeconds * ENERGY_REGEN_RATE;
      currentEnergy = Math.min(user.max_energy, currentEnergy + regeneratedEnergy);
    }

    // Apply taps
    const actualTaps = Math.min(currentEnergy, tapsCount); // Cannot tap more than energy
    currentBalance += actualTaps;
    currentEnergy -= actualTaps;

    // Atomic update to avoid race conditions with crash game bets
    db.prepare(`
      UPDATE users 
      SET balance = balance + ?, 
          energy = ?, 
          last_sync = ? 
      WHERE telegram_id = ?
    `).run(earned + actualTaps, currentEnergy, now, telegram_id);
    
    user.balance = currentBalance;
    user.energy = currentEnergy;
    user.last_sync = now;

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
