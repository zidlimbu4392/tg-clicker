'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from '@/lib/GameContext';

type TopUser = {
  telegram_id: string;
  name: string;
  balance: number;
  avatar: string;
};

export default function TopScreen() {
  const { topUsers, loadingTop } = useGame();

  const getPositionStyle = (index: number) => {
    if (index === 0) return { background: '#fbbf24', color: '#fff' }; // Gold
    if (index === 1) return { background: '#94a3b8', color: '#fff' }; // Silver
    if (index === 2) return { background: '#b45309', color: '#fff' }; // Bronze
    return { color: 'rgba(255,255,255,0.4)', background: 'transparent' };
  };

  if (loadingTop) {
    return (
      <div className="loader">
        <div className="loader-spinner" />
      </div>
    );
  }

  return (
    <div className="top-screen" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      paddingTop: '80px', // Pushed down
      paddingBottom: '100px', // for TabBar
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Exact same background effect as Market */}
      <div 
        style={{ 
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: -1,
          pointerEvents: 'none'
        }} 
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', padding: '0 20px' }}>
          <img src="/cup-1-svgrepo-com.svg" alt="Cup" style={{ width: '90px', height: '90px', marginBottom: '16px', filter: 'brightness(0) invert(1)' }} />
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Leaderboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '15px', lineHeight: '1.4' }}>
            Объединяйтесь, чтобы выиграть призы<br/>из фонда в криптоактивах.
          </p>
        </div>

        {/* List Area */}
        <div style={{ flex: 1, padding: '0 16px' }}>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.4)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '24px', 
            padding: '8px 0',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          }}>
            {topUsers.map((user, idx) => {
              const posStyle = getPositionStyle(idx);
              const isYou = user.name === 'You';
              
              return (
                <div key={user.telegram_id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '10px 16px',
                  borderBottom: idx < topUsers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: isYou ? 'rgba(167, 139, 250, 0.1)' : 'transparent'
                }}>
                  {/* Position */}
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: '50%', 
                    fontSize: '13px', 
                    fontWeight: 800,
                    marginRight: '12px',
                    ...posStyle
                  }}>
                    {idx + 1}
                  </div>
                  
                  {/* Avatar */}
                  <img src={user.avatar} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginRight: '12px' }} />
                  
                  {/* Name */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{user.name}</span>
                    {isYou && (
                      <span style={{ fontSize: '10px', background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        YOU
                      </span>
                    )}
                  </div>
                  
                  {/* Balance */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                      {user.balance.toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <img src="/usdt.svg" alt="USDT" style={{ width: '12px', height: '12px' }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>USDT</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
