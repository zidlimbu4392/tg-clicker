import { NextResponse } from 'next/server';
import { getUser, updateUser } from '@/lib/db';
import { TASKS } from '@/lib/gameConfig';
import { validateInitData } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { initData, task_id } = await req.json();
    if (!initData || !task_id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const authResult = validateInitData(initData);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegram_id = authResult.user.id.toString();

    const user = getUser(telegram_id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const taskDef = TASKS.find(t => t.id === task_id);
    if (!taskDef) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const completedTasks = JSON.parse(user.completed_tasks);
    if (completedTasks.includes(task_id)) {
      return NextResponse.json({ error: 'Task already completed' }, { status: 400 });
    }

    // Complete task and give reward
    completedTasks.push(task_id);
    const newBalance = user.balance + taskDef.reward;

    updateUser(telegram_id, {
      balance: newBalance,
      completed_tasks: JSON.stringify(completedTasks)
    });

    user.balance = newBalance;
    user.completed_tasks = JSON.stringify(completedTasks);

    return NextResponse.json({ user, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
