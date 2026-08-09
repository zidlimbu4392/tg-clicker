import { NextResponse } from 'next/server';
import { getUser, updateUser } from '@/lib/db';
import { UPGRADES } from '@/lib/gameConfig';
import { validateInitData } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { initData, upgrade_id } = await req.json();
    if (!initData || !upgrade_id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegram_id = authResult.user.id.toString();

    const user = getUser(telegram_id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const upgradeDef = UPGRADES.find(u => u.id === upgrade_id);
    if (!upgradeDef) return NextResponse.json({ error: 'Upgrade not found' }, { status: 404 });

    const upgrades = JSON.parse(user.upgrades);
    const currentLevel = upgrades[upgrade_id] || 0;
    
    // Calculate cost: baseCost * (costMultiplier ^ currentLevel)
    const cost = Math.floor(upgradeDef.baseCost * Math.pow(upgradeDef.costMultiplier, currentLevel));

    if (user.balance < cost) {
      return NextResponse.json({ error: 'Not enough coins' }, { status: 400 });
    }

    // Buy upgrade
    upgrades[upgrade_id] = currentLevel + 1;
    const newBalance = user.balance - cost;
    const newPassiveIncome = user.passive_income + (upgradeDef.baseIncome || 0);

    updateUser(telegram_id, {
      balance: newBalance,
      passive_income: newPassiveIncome,
      upgrades: JSON.stringify(upgrades)
    });

    user.balance = newBalance;
    user.passive_income = newPassiveIncome;
    user.upgrades = JSON.stringify(upgrades);

    return NextResponse.json({ user, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
