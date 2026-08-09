'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '@/lib/GameContext';
import { AdminPanel } from '@/components/AdminPanel';

import { io, Socket } from 'socket.io-client';

type GamePhase = 'waiting' | 'running' | 'crashed';

type BetEntry = {
  id?: string;
  name: string;
  bet: number;
  cashout: number | null;
  multiplier: number | null;
  isBot?: boolean;
};

export default function CrashScreen() {
  const { user, addTokens, initData, loading } = useGame();

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(5);
  const [betAmount, setBetAmount] = useState(50);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMultiplier, setCashoutMultiplier] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const handleAdminClose = React.useCallback(() => setIsAdminOpen(false), []);
  
  const socketRef = useRef<Socket | null>(null);
  const lastPhaseRef = useRef<GamePhase>('waiting');

  useEffect(() => {
    if (loading) return; // Wait for GameContext to fetch real initData

    // Connect to custom server with initData auth
    const socket = io({
      auth: { initData }
    });
    socketRef.current = socket;

    socket.on('gameState', (data: any) => {
      setIsReady(true);
      setPhase(data.phase);
      setMultiplier(data.multiplier);
      setCountdown(data.countdown);
      setHistory(data.history);
      setBets(data.bets);
      
      // Reset local state if it's a new round (only on transition from crashed to waiting)
      if (lastPhaseRef.current === 'crashed' && data.phase === 'waiting') {
        setHasBet(false);
        setCashedOut(false);
        setCashoutMultiplier(0);
      }
      lastPhaseRef.current = data.phase;
    });

    socket.on('multiplierUpdate', (data: any) => {
      setMultiplier(data.multiplier);
    });

    socket.on('cashedOut', (data: any) => {
      setCashedOut(true);
      setCashoutMultiplier(data.multiplier);
      addTokens(data.cashout); // Real balance update would happen via backend API, but for now we sync locally
    });

    return () => {
      socket.disconnect();
    };
  }, [loading, initData]); // Re-run when loading is finished

  const placeBet = () => {
    if (phase !== 'waiting' || !user || user.balance < betAmount) return;
    setHasBet(true);
    addTokens(-betAmount); // Optimistic deduction
    socketRef.current?.emit('placeBet', { telegram_id: user.telegram_id, name: 'You', amount: betAmount });
  };

  const cashOut = () => {
    if (phase !== 'running' || !hasBet || cashedOut) return;
    socketRef.current?.emit('cashOut');
  };

  const balance = user?.balance ?? 0;
  const currentWin = (betAmount * multiplier).toFixed(1);

  if (loading || !isReady) {
    return (
      <div className="loader-overlay">
        <div className="flipper"></div>
        <div className="loader-text">Loading game session...</div>
      </div>
    );
  }

  return (
    <div className="crash-screen">
      {user && user.isAdmin && (
        <button 
          onClick={() => setIsAdminOpen(true)}
          style={{ position: 'absolute', bottom: 90, right: 20, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', color: '#fff', padding: '8px 16px', borderRadius: '20px', zIndex: 100, fontWeight: 700, border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
        >
          Admin
        </button>
      )}

      {isAdminOpen && <AdminPanel onClose={handleAdminClose} />}
      
      {/* Multiplier */}
      <div className="crash-display">
        <div className={`crash-multiplier ${phase === 'crashed' ? 'crashed' : ''} ${phase === 'running' ? 'running' : ''}`}>
          {phase === 'waiting' ? countdown : `${multiplier.toFixed(2)}x`}
        </div>
        {phase === 'crashed' && <div className="crash-label">CRASHED</div>}
        {cashedOut && <div className="cashout-label">Cashed out at {cashoutMultiplier.toFixed(2)}x</div>}
      </div>

      {/* History (Outside bottom sheet) */}
      <div className="crash-history">
        <div className={`history-pill ${phase === 'waiting' ? 'waiting-pill' : ''}`}>
          {phase === 'waiting' ? 'Waiting...' : phase === 'running' ? 'LIVE' : 'Crashed'}
        </div>
        {history.slice(0, 5).map((h, i) => (
          <div key={i} className={`history-pill ${h >= 2 ? 'green' : ''}`}>
            {h.toFixed(2)}x
          </div>
        ))}
      </div>

      {/* Bottom Sheet containing Bet Controls and Players */}
      <div className="crash-bottom-sheet">

        {/* Bet section */}
        <div className="crash-bet-section">
          <div className="bet-controls-row">
            <div className={`bet-stepper ${phase !== 'waiting' || hasBet ? 'disabled' : ''}`}>
              <button 
                className="stepper-btn" 
                onClick={() => phase === 'waiting' && !hasBet && setBetAmount(a => Math.max(10, a - 10))}
              >−</button>
              <div className="stepper-val-wrap">
                <img src="/usdt.svg" alt="" className="currency-tiny-icon" />
                <span className="stepper-val">{betAmount}</span>
              </div>
              <button 
                className="stepper-btn" 
                onClick={() => phase === 'waiting' && !hasBet && setBetAmount(a => a + 10)}
              >+</button>
            </div>

            {phase === 'waiting' && !hasBet && (
              <button className="action-btn place-bet" onClick={placeBet}>Place Bet</button>
            )}
            {phase === 'waiting' && hasBet && (
              <button className="action-btn waiting-btn">Wait...</button>
            )}
            {phase === 'running' && hasBet && !cashedOut && (
              <button className="action-btn cashout-btn" onClick={cashOut}>
                {currentWin} USDT
              </button>
            )}
            {phase === 'running' && (!hasBet || cashedOut) && (
              <button className="action-btn disabled-btn">Wait...</button>
            )}
            {phase === 'crashed' && (
              <button className="action-btn disabled-btn">Next...</button>
            )}
          </div>
        </div>

        {/* Players */}
        <div className="crash-players">
          <div className="players-header">
            <span className="ph-name">Player</span>
            <span className="ph-bet">Bet</span>
            <span className="ph-cashout">Cashout</span>
          </div>
          <div className="players-list">
            {bets.map((b, i) => (
              <div key={i} className={`player-row ${b.name === 'You' ? 'you' : ''}`}>
                <div className="player-name">{b.name}</div>
                <div className="player-bet">{b.bet}</div>
                <div className="player-cashout">
                  {b.cashout !== null ? (
                    b.cashout > 0 ? (
                      <span className="cashout-win">+{b.cashout}</span>
                    ) : (
                      <span className="cashout-lose">−{b.bet}</span>
                    )
                  ) : (
                    <span className="cashout-pending">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
