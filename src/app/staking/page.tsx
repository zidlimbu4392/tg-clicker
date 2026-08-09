'use client';

import React, { useState } from 'react';
import { useGame } from '@/lib/GameContext';

export default function StakingPage() {
  const { user, loading } = useGame();
  const [amount, setAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState(14); // days

  if (loading || !user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="staking-screen">
      <div className="staking-header">
        <h1 className="section-title">Stake & Earn</h1>
        <p className="subtitle">Lock your tokens to earn up to 30% APY</p>
      </div>

      <div className="staking-hero">
        <div className="hero-label">Total Staked</div>
        <div className="hero-value">0</div>
        <div className="hero-reward">Estimated Reward: <span className="highlight">0 TOKENS</span></div>
      </div>

      <div className="staking-main-card">
        <div className="card-top">
          <span className="balance-label">Available: {user.balance.toLocaleString()} TOKENS</span>
          <button className="max-btn" onClick={() => setAmount(user.balance.toString())}>MAX</button>
        </div>
        
        <div className="staking-input-wrapper">
          <input 
            type="number" 
            placeholder="0" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="staking-input-large"
          />
          <span className="input-currency">TOKENS</span>
        </div>

        <div className="period-toggle">
          <div className={`toggle-pill ${lockPeriod === 14 ? 'active' : ''}`} onClick={() => setLockPeriod(14)}>14D</div>
          <div className={`toggle-pill ${lockPeriod === 30 ? 'active' : ''}`} onClick={() => setLockPeriod(30)}>30D</div>
          <div className={`toggle-pill ${lockPeriod === 90 ? 'active' : ''}`} onClick={() => setLockPeriod(90)}>90D</div>
        </div>

        <button className="primary-stake-btn">Stake Now</button>
      </div>
    </div>
  );
}
