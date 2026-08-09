'use client';

import React, { useState } from 'react';
import { useGame } from '@/lib/GameContext';
import { TASKS } from '@/lib/gameConfig';
import { CheckCircle2, CircleDashed, Users, Tv, MessageCircle, Wallet, Megaphone, Check } from 'lucide-react';

const getTaskIcon = (id: string) => {
  switch(id) {
    case 't1': return <Megaphone size={20} color="#a78bfa" />;
    case 't2': return <Users size={20} color="#a78bfa" />;
    case 't3': return <Tv size={20} color="#a78bfa" />;
    case 't4': return <Wallet size={20} color="#a78bfa" />;
    case 't5': return <CircleDashed size={20} color="#a78bfa" />;
    case 't6': return <MessageCircle size={20} color="#a78bfa" />;
    case 't7': return <MessageCircle size={20} color="#a78bfa" />;
    case 't8': return <CheckCircle2 size={20} color="#a78bfa" />;
    case 't9': return <CircleDashed size={20} color="#a78bfa" />;
    default: return <CircleDashed size={20} color="#a78bfa" />;
  }
};

export default function TasksScreen() {
  const { user, loading, completeTask } = useGame();
  const [claiming, setClaiming] = useState<string | null>(null);

  if (loading || !user) {
    return (
      <div className="loader">
        <div className="loader-spinner" />
      </div>
    );
  }

  const handleClaim = async (taskId: string) => {
    setClaiming(taskId);
    // Fake delay to simulate checking subscription/task completion
    await new Promise(resolve => setTimeout(resolve, 1500));
    await completeTask(taskId);
    setClaiming(null);
  };

  return (
    <div className="tasks-screen">
        <div className="tasks-list">
        {TASKS.map(task => {
          const isCompleted = user.completed_tasks.includes(task.id);
          const isClaiming = claiming === task.id;

          return (
            <div key={task.id} className={`task-card ${isCompleted ? 'completed' : ''}`}>
              <div className="task-left">
                <div className="task-icon">
                  {isCompleted ? <CheckCircle2 size={20} color="#34d399" /> : getTaskIcon(task.id)}
                </div>
                <div className="task-info">
                  <h3>{task.description}</h3>
                  <div className="task-reward">+{task.reward.toLocaleString()}</div>
                </div>
              </div>

              {isCompleted ? (
                <div className="task-done"><Check size={16} /></div>
              ) : (
                <button 
                  className="task-btn" 
                  onClick={() => alert('Coming soon!')}
                >
                  Start
                </button>
              )}
            </div>
          );
        })}
        </div>
    </div>
  );
}
