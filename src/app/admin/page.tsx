'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/lib/GameContext';
import { ShieldAlert, Users, TrendingUp, Settings, Edit2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const { user } = useGame();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');

  useEffect(() => {
    if (user && process.env.NEXT_PUBLIC_ADMIN_ID && user.telegram_id === process.env.NEXT_PUBLIC_ADMIN_ID) {
      fetchUsers();
    } else if (user) {
      router.push('/');
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_users', telegram_id: user?.telegram_id })
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveBalance = async (target_id: string) => {
    try {
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_balance', 
          telegram_id: user?.telegram_id,
          target_id,
          new_balance: parseInt(editBalance, 10)
        })
      });
      setEditingId(null);
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  if (!user || !process.env.NEXT_PUBLIC_ADMIN_ID || user.telegram_id !== process.env.NEXT_PUBLIC_ADMIN_ID) {
    return <div className="p-8 text-white">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-[#080510] text-white p-6 pb-24 overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="text-red-500" size={32} />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Users className="text-blue-400 mb-2" size={24} />
          <div className="text-sm text-gray-400">Total Users</div>
          <div className="text-2xl font-bold">{users.length}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <TrendingUp className="text-green-400 mb-2" size={24} />
          <div className="text-sm text-gray-400">Total Balance</div>
          <div className="text-2xl font-bold">
            {users.reduce((acc, u) => acc + u.balance, 0).toLocaleString()}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">User Management</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="flex flex-col">
            <div className="flex bg-white/10 p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <div className="flex-1">ID</div>
              <div className="w-24 text-right">Balance</div>
              <div className="w-16 text-center">Action</div>
            </div>
            {users.map(u => (
              <div key={u.telegram_id} className="flex items-center p-3 border-t border-white/5 text-sm">
                <div className="flex-1 truncate pr-2 text-gray-300 font-mono">
                  {u.telegram_id}
                </div>
                <div className="w-24 text-right font-bold">
                  {editingId === u.telegram_id ? (
                    <input 
                      type="number" 
                      className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-right text-white"
                      value={editBalance}
                      onChange={e => setEditBalance(e.target.value)}
                    />
                  ) : (
                    u.balance.toLocaleString()
                  )}
                </div>
                <div className="w-16 flex justify-center">
                  {editingId === u.telegram_id ? (
                    <button onClick={() => saveBalance(u.telegram_id)} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg">
                      <Check size={16} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setEditingId(u.telegram_id); setEditBalance(u.balance.toString()); }}
                      className="p-1.5 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
