'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/lib/GameContext';
import { ShieldAlert, Users, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Activity, Edit2, Check, Clock } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { user } = useGame();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'history'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  
  const [broadcastStatus, setBroadcastStatus] = useState('');

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    const tg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    if (tg && tg.BackButton) {
      tg.BackButton.show();
      const onBack = () => onClose();
      tg.BackButton.onClick(onBack);
      return () => {
        tg.BackButton.offClick(onBack);
        tg.BackButton.hide();
      };
    }
  }, [onClose]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_stats', telegram_id: user?.telegram_id })
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.stats) setStats(data.stats);
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  const saveBalance = async (targetId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_balance', telegram_id: user?.telegram_id, target_id: targetId, new_balance: parseFloat(editBalance) })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.telegram_id === targetId ? { ...u, balance: parseFloat(editBalance) } : u));
        setEditingId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdrawAction = async (txId: number, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this withdrawal?`)) return;
    try {
      const res = await fetch('/api/admin/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_telegram_id: user?.telegram_id, transaction_id: txId, action })
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(transactions.map(t => t.id === txId ? { ...t, status: action === 'approve' ? 'completed' : 'rejected' } : t));
      } else {
        alert(data.error || 'Failed to perform action');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user || !user.isAdmin) {
    return null;
  }

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '50px', overflowX: 'auto' }}>
      {['overview', 'users', 'history'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as any)}
          style={{
            flex: 1,
            padding: '8px 16px',
            textAlign: 'center',
            background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)',
            borderRadius: '50px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
            textTransform: 'capitalize',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderOverview = () => {
    if (!stats) return <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Loading stats...</div>;
    
    const withdrawals = transactions.filter(t => t.type === 'withdraw');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* System Profit Card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>System Profit</div>
            <div style={{ width: '60px', height: '2px', background: stats.systemProfit >= 0 ? '#4ade80' : '#ef4444', borderRadius: '2px' }}></div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: stats.systemProfit >= 0 ? '#4ade80' : '#ef4444' }}>
            {stats.systemProfit > 0 ? '+' : ''}{stats.systemProfit.toLocaleString()}
          </div>
        </div>

        {/* Total Users Card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)' }}>Total Users</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalUsers}</div>
        </div>

        {/* Withdrawals List */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#fff' }}>Withdrawals (Выводы)</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {withdrawals.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                No withdrawals yet
              </div>
            ) : (
              withdrawals.map((tx: any) => (
                <div key={tx.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'monospace' }}>User: {tx.telegram_id}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>
                      -{tx.amount.toLocaleString()} {tx.currency}
                    </div>
                  </div>
                  
                  {tx.address && (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      Wallet: {tx.address}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      color: tx.status === 'completed' ? '#4ade80' : tx.status === 'rejected' ? '#ef4444' : '#fbbf24',
                      background: tx.status === 'completed' ? 'rgba(74, 222, 128, 0.1)' : tx.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      textTransform: 'uppercase'
                    }}>
                      {tx.status || 'completed'}
                    </span>

                    {(!tx.status || tx.status === 'pending') && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleWithdrawAction(tx.id, 'approve')}
                          style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Approve ✅
                        </button>
                        <button 
                          onClick={() => handleWithdrawAction(tx.id, 'reject')}
                          style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Reject ❌
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
      {loading ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', padding: '12px', fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <div style={{ flex: 1 }}>ID</div>
            <div style={{ width: '96px', textAlign: 'right' }}>Balance</div>
            <div style={{ width: '64px', textAlign: 'center' }}>Act</div>
          </div>
          {users.map(u => (
            <div key={u.telegram_id} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
              <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px', color: '#d1d5db', fontFamily: 'monospace' }}>
                {u.telegram_id}
              </div>
              <div style={{ width: '96px', textAlign: 'right', fontWeight: 'bold' }}>
                {editingId === u.telegram_id ? (
                  <input 
                    type="number" 
                    style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 8px', textAlign: 'right', color: '#fff', outline: 'none' }}
                    value={editBalance}
                    onChange={e => setEditBalance(e.target.value)}
                  />
                ) : (
                  u.balance.toLocaleString()
                )}
              </div>
              <div style={{ width: '64px', display: 'flex', justifyContent: 'center' }}>
                {editingId === u.telegram_id ? (
                  <button onClick={() => saveBalance(u.telegram_id)} style={{ padding: '6px', background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                    <Check size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => { setEditingId(u.telegram_id); setEditBalance(u.balance.toString()); }}
                    style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', color: '#d1d5db', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
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
  );

  const getTxIcon = (type: string) => {
    switch(type) {
      case 'deposit': return <ArrowDownRight size={16} color="#4ade80" />;
      case 'withdraw': return <ArrowUpRight size={16} color="#ef4444" />;
      case 'win': return <TrendingUp size={16} color="#4ade80" />;
      case 'bet': return <TrendingDown size={16} color="#ef4444" />;
      default: return <Clock size={16} color="#888" />;
    }
  };

  const renderHistory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {transactions.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No transactions yet</div>
      )}
      {transactions.map(tx => (
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getTxIcon(tx.type)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'capitalize' }}>{tx.type}</div>
            <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>{tx.telegram_id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', color: (tx.type === 'win' || tx.type === 'deposit') ? '#4ade80' : '#ef4444' }}>
              {(tx.type === 'win' || tx.type === 'deposit') ? '+' : '-'}{tx.amount} {tx.currency}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {new Date(tx.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const handleBroadcastInit = async () => {
    setBroadcastStatus('Check your Telegram bot...');
    try {
      const res = await fetch('/api/admin/start-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: user?.telegram_id })
      });
      const data = await res.json();
      if (!data.success) {
        setBroadcastStatus('Error: ' + data.error);
      } else {
        setTimeout(() => setBroadcastStatus(''), 3000);
      }
    } catch (e: any) {
      setBroadcastStatus('Error: ' + e.message);
    }
  };

  const panelContent = (
    <div className="admin-panel-slide-in" style={{ paddingTop: '100px', paddingBottom: '120px' }}>
      {renderTabs()}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'history' && renderHistory()}

      {/* Floating Action Button for Broadcast */}
      <div style={{ position: 'fixed', bottom: '24px', left: '24px', right: '24px', zIndex: 100 }}>
        <button
          onClick={handleBroadcastInit}
          style={{ width: '100%', padding: '16px', background: '#a855f7', color: '#fff', borderRadius: '50px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
        >
          Create Broadcast
        </button>
        {broadcastStatus && (
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#a855f7', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {broadcastStatus}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(panelContent, document.body);
  }
  return null;
}
