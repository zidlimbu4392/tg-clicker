'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGame } from '@/lib/GameContext';

export const TabBar = () => {
  const pathname = usePathname();
  const { user, refreshUser, initData } = useGame();
  
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isBalanceMenuOpen, setIsBalanceMenuOpen] = useState(false);
  const [isBalanceClosing, setIsBalanceClosing] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isWithdrawClosing, setIsWithdrawClosing] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  
  const [paymentMethod, setPaymentMethod] = useState('СБП');
  const [topUpAmount, setTopUpAmount] = useState('100');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const tabs = [
    { href: '/', iconSrc: '/gamepad.svg', label: 'Crash' },
    { href: '/market', iconSrc: '/shopping-cart.svg', label: 'Market' },
    { href: '/top', iconSrc: '/cup-1-svgrepo-com.svg', label: 'Top' },
  ];

  if (pathname === '/runner') return null;

  const activeIndex = tabs.findIndex(t => t.href === pathname);
  const validIndex = activeIndex >= 0 ? activeIndex : 0;

  const closeTopUp = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsTopUpOpen(false);
      setIsTopUpOpen(false);
    }, 300);
  };

  useEffect(() => {
    if (isBalanceMenuOpen && initData) {
      setLoadingTx(true);
      fetch('/api/user/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      })
      .then(res => res.json())
      .then(data => {
        if (data.transactions) setTransactions(data.transactions);
        setLoadingTx(false);
      })
      .catch(e => {
        console.error(e);
        setLoadingTx(false);
      });
    }
  }, [isBalanceMenuOpen, initData]);

  const closeBalanceMenu = () => {
    setIsBalanceClosing(true);
    setTimeout(() => {
      setIsBalanceMenuOpen(false);
      setIsBalanceClosing(false);
    }, 300);
  };



  const closeWithdraw = () => {
    setIsWithdrawClosing(true);
    setTimeout(() => {
      setIsWithdrawOpen(false);
      setIsWithdrawClosing(false);
      setWithdrawAmount('');
      setWithdrawAddress('');
    }, 300);
  };

  const getBtnText = () => {
    if (paymentMethod === 'USDT') return 'I paid';
    return 'Pay';
  };

  const handleQuickAdd = (add: number) => {
    const current = parseInt(topUpAmount) || 0;
    const next = current + add;
    if (next < 1) return;
    setTopUpAmount(next.toString());
  };

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayment = async () => {
    if (!user || isProcessingPayment) return;
    setIsProcessingPayment(true);
    try {
      const amount = parseInt(topUpAmount) || 0;
      if (amount <= 0) return;
      
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, amount, method: paymentMethod })
      });
      
      const data = await res.json();
      if (data.success) {
        if (refreshUser && user.telegram_id) {
          refreshUser(user.telegram_id);
        }
        closeTopUp();
      }
    } catch (e) {
      console.error(e);
    }
    setIsProcessingPayment(false);
  };

  const handleWithdraw = async () => {
    if (!user || !user.telegram_id || !withdrawAmount || !withdrawAddress) return;
    setIsProcessingWithdraw(true);
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, amount: withdrawAmount, address: withdrawAddress, method: 'USDT' })
      });
      
      const data = await res.json();
      if (data.success) {
        if (refreshUser && user.telegram_id) {
          refreshUser(user.telegram_id);
        }
        closeWithdraw();
        alert('Заявка на вывод создана! Ожидайте подтверждения.');
      } else {
        alert(data.error || 'Withdrawal failed');
      }
    } catch (e) {
      console.error(e);
      alert('Error occurred while requesting withdrawal');
    }
    setIsProcessingWithdraw(false);
  };

  return (
    <>
      <div className="bottom-nav-container">
        <div className="nav-balance-wrapper">
          <div className="nav-balance-pill" onClick={() => setIsBalanceMenuOpen(true)} style={{ cursor: 'pointer' }}>
            <img src={selectedCurrency === 'USDT' ? '/usdt.svg' : selectedCurrency === 'Stars' ? '/stars.svg' : '/rub.svg'} alt={selectedCurrency} className="nav-currency-icon" />
            <span className="nav-balance-val">{user ? Math.floor(user.balance).toLocaleString() : '...'}</span>
          </div>
        </div>

        <nav className="tab-bar-compact">
          <div 
            className="tab-highlight"
            style={{ transform: `translateX(${validIndex * 100}%)` }}
          />

          {tabs.map(({ href, iconSrc }, index) => {
            const isActive = index === activeIndex;
            return (
              <Link key={href} href={href} className={`tab-item-compact ${isActive ? 'active' : ''}`}>
                <div 
                  className="tab-icon-compact" 
                  style={{ WebkitMaskImage: `url(${iconSrc})`, maskImage: `url(${iconSrc})` }} 
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {isBalanceMenuOpen && (
        <div className={`topup-overlay ${isBalanceClosing ? 'closing' : ''}`} onClick={closeBalanceMenu}>
          <div className={`balance-sheet ${isBalanceClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div 
                onClick={() => { setSelectedCurrency('USDT'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: selectedCurrency === 'USDT' ? 'rgba(167, 139, 250, 0.12)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', borderBottom: '2px solid #1e1e2e' }}
              >
                <img src="/usdt.svg" alt="USDT" style={{ width: '24px', height: '24px' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>USDT</span>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginLeft: 'auto' }}>{user ? Math.floor(user.balance).toLocaleString() : '...'}</span>
                {selectedCurrency === 'USDT' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>

              <div 
                onClick={() => { setSelectedCurrency('Stars'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: selectedCurrency === 'Stars' ? 'rgba(167, 139, 250, 0.12)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s', borderBottom: '2px solid #1e1e2e' }}
              >
                <img src="/stars.svg" alt="Stars" style={{ width: '24px', height: '24px' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>Stars</span>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginLeft: 'auto' }}>0</span>
                {selectedCurrency === 'Stars' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>

              <div 
                onClick={() => { setSelectedCurrency('RUB'); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: selectedCurrency === 'RUB' ? 'rgba(167, 139, 250, 0.12)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <img src="/rub.svg" alt="RUB" style={{ width: '24px', height: '24px' }} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>RUB</span>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginLeft: 'auto' }}>0</span>
                {selectedCurrency === 'RUB' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', paddingLeft: '4px' }}>History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {loadingTx ? (
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px 0' }}>Loading...</div>
                ) : transactions.length === 0 ? (
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px 0' }}>Нет транзакций</div>
                ) : (
                  transactions.map(tx => {
                    const isWithdraw = tx.type === 'withdraw';
                    const amountStr = isWithdraw ? `−${tx.amount.toLocaleString()}` : `+${tx.amount.toLocaleString()}`;
                    const dateStr = new Date(tx.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                            {isWithdraw ? 'Withdraw' : 'Top Up'}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '2px' }}>
                            {dateStr} · {tx.currency}
                          </div>
                        </div>
                        <div style={{ color: isWithdraw ? '#ef4444' : '#4ade80', fontWeight: 700, fontSize: '14px' }}>
                          {amountStr}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Floating Bottom Buttons */}
            <div style={{ position: 'sticky', bottom: '-40px', margin: '0 -24px -40px -24px', padding: '40px 24px 24px 24px', background: 'linear-gradient(to top, #1e1e2e 50%, transparent 100%)', display: 'flex', gap: '10px', zIndex: 10, pointerEvents: 'none' }}>
              <button 
                onClick={() => { setIsBalanceMenuOpen(false); setIsTopUpOpen(true); }}
                style={{ flex: 1, padding: '16px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px', pointerEvents: 'auto' }}
              >
                Top Up
              </button>
              <button 
                onClick={() => { setIsBalanceMenuOpen(false); setIsWithdrawOpen(true); }}
                style={{ flex: 1, padding: '16px 0', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px', backdropFilter: 'blur(10px)', pointerEvents: 'auto' }}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {isTopUpOpen && (
        <div className={`topup-overlay ${isClosing ? 'closing' : ''}`} onClick={closeTopUp}>
          <div className={`topup-sheet ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="topup-amount-input-container">
              <button className="amount-adjust-btn" onClick={() => handleQuickAdd(-1)}>-1</button>
              <div className="topup-amount-display">
                {topUpAmount} <span className="topup-amount-currency">
                  {paymentMethod === 'USDT' ? 'USDT' : paymentMethod === 'Stars' ? 'Stars' : 'RUB'}
                </span>
              </div>
              <button className="amount-adjust-btn" onClick={() => handleQuickAdd(1)}>+1</button>
            </div>

            <div className="quick-amounts">
              {[10, 50, 100, 500].map(amt => (
                <button key={amt} className="quick-amount-chip" onClick={() => handleQuickAdd(amt)}>
                  +{amt}
                </button>
              ))}
            </div>

            <div className="payment-methods">
              <div className={`payment-method-box ${paymentMethod === 'СБП' ? 'active' : ''}`} onClick={() => setPaymentMethod('СБП')}>
                <div className="payment-name">СБП</div>
              </div>
              <div className={`payment-method-box ${paymentMethod === 'USDT' ? 'active' : ''}`} onClick={() => setPaymentMethod('USDT')}>
                <div className="payment-name">USDT</div>
              </div>
              <div className={`payment-method-box ${paymentMethod === 'Stars' ? 'active' : ''}`} onClick={() => setPaymentMethod('Stars')}>
                <div className="payment-name">Stars</div>
              </div>
            </div>

            {paymentMethod === 'USDT' && (
              <div className="crypto-wallet-card">
                <div className="crypto-network">Network: <b>TRC20</b></div>
                <div className="crypto-address-label">Transfer address:</div>
                <div className="crypto-address-row">
                  <div className="crypto-address">UQBvW8Z5huBc72s1yP_P2uS8n2Fq4k5r6G7d8J9L0K1M2N3</div>
                  <button className="crypto-copy-btn">Copy</button>
                </div>
              </div>
            )}

            <button className="btn-primary" onClick={handlePayment} disabled={isProcessingPayment}>
              {isProcessingPayment ? 'Processing...' : getBtnText()}
            </button>
          </div>
        </div>
      )}

      {isWithdrawOpen && (
        <div className={`topup-overlay ${isWithdrawClosing ? 'closing' : ''}`} onClick={closeWithdraw}>
          <div className={`topup-sheet ${isWithdrawClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Withdraw</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '50px' }}>
                <img src="/usdt.svg" alt="USDT" style={{ width: '16px', height: '16px' }} />
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{user ? Math.floor(user.balance).toLocaleString() : '0'}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600, textAlign: 'left', paddingLeft: '4px' }}>Amount to withdraw</div>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Min. 10 USDT"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', borderRadius: '20px', color: '#fff', fontSize: '16px', outline: 'none', fontFamily: 'inherit', fontWeight: 500 }}
                />
                <button 
                  onClick={() => setWithdrawAmount(user ? Math.floor(user.balance).toString() : '0')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  MAX
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: 600, textAlign: 'left', paddingLeft: '4px' }}>Destination address (TRC-20)</div>
              <input 
                type="text" 
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="Paste TRC-20 address"
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', borderRadius: '20px', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: 'inherit', fontWeight: 500 }}
              />
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                 <span style={{ color: 'rgba(255,255,255,0.4)' }}>Network Fee</span>
                 <span style={{ color: '#fff', fontWeight: 600 }}>0 USDT</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                 <span style={{ color: 'rgba(255,255,255,0.4)' }}>Estimated Time</span>
                 <span style={{ color: '#fff', fontWeight: 600 }}>~5 mins</span>
               </div>
            </div>

            <button className="btn-primary" onClick={handleWithdraw} disabled={isProcessingWithdraw || !withdrawAmount || !withdrawAddress || parseFloat(withdrawAmount) < 10}>
              {isProcessingWithdraw ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </div>
        </div>
      )}


    </>
  );
};
