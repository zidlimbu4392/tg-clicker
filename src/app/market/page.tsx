'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/lib/GameContext';

const MARKET_ITEMS = [
  { id: 'm1', name: 'Thief Dog', price: 90, image: '/1y.png', rank: 471, head: 'Red Mask', headPercent: '1.6%', outfit: 'Overalls', outfitPercent: '1.6%', paw: 'Cash Stack', pawPercent: '1.5%', backdrop: 'Neuro Cells', backdropPercent: '0.8%', includes: ['1 Head', '1 Body', '1 Paw', '2 Backs'], spent: 44.19 },
  { id: 'm2', name: 'Reaper Dog', price: 98, image: '/2y.png', rank: 245, head: 'Green Trilby', headPercent: '0.8%', outfit: 'Pinstripe', outfitPercent: '1.0%', paw: 'Diamond', pawPercent: '0.5%', backdrop: 'Dark City', backdropPercent: '1.2%', includes: ['1 Head', '1 Body', '1 Paw'], spent: 50.21 },
  { id: 'm3', name: 'Frog Dog', price: 100, image: '/3y.png', rank: 960, head: 'Robo Helmet', headPercent: '1.2%', outfit: 'Cyber Armor', outfitPercent: '2.1%', paw: 'Laser', pawPercent: '1.1%', backdrop: 'Matrix', backdropPercent: '1.5%', includes: ['1 Head', '1 Body', '1 Paw'], spent: 30.50 },
  { id: 'm4', name: 'Surgeon Dog', price: 105, image: '/4y.png', rank: 52, head: 'Blonde Hair', headPercent: '0.5%', outfit: 'Black Suit', outfitPercent: '0.4%', paw: 'Scalpel', pawPercent: '0.8%', backdrop: 'Hospital', backdropPercent: '0.9%', includes: ['1 Head', '1 Body', '1 Paw', '1 Acc'], spent: 120.00 },
  { id: 'm5', name: 'Knight Dog', price: 105, image: '/5y.png', rank: 617, head: 'Bat Mask', headPercent: '2.1%', outfit: 'Dark Cape', outfitPercent: '2.5%', paw: 'Sword', pawPercent: '1.9%', backdrop: 'Castle', backdropPercent: '3.0%', includes: ['1 Head', '1 Body', '1 Paw'], spent: 25.10 },
  { id: 'm6', name: 'Pimp Dog', price: 110, image: '/6y.png', rank: 581, head: 'Grad Cap', headPercent: '1.9%', outfit: 'White Robe', outfitPercent: '2.0%', paw: 'Cane', pawPercent: '1.5%', backdrop: 'Mansion', backdropPercent: '2.2%', includes: ['1 Head', '1 Body', '1 Paw'], spent: 28.90 },
  { id: 'm8', name: 'Robber Dog', price: 118, image: '/8y.png', rank: 416, head: 'Fedora', headPercent: '1.1%', outfit: 'Trench Coat', outfitPercent: '1.3%', paw: 'Bag', pawPercent: '1.0%', backdrop: 'Alley', backdropPercent: '1.4%', includes: ['1 Head', '1 Body', '1 Paw'], spent: 40.00 },
  { id: 'm9', name: 'King Dog', price: 119, image: '/9y.png', rank: 315, head: 'Spiky Hair', headPercent: '0.7%', outfit: 'Punk Jacket', outfitPercent: '0.9%', paw: 'Guitar', pawPercent: '0.6%', backdrop: 'Stage', backdropPercent: '0.5%', includes: ['1 Head', '1 Body', '1 Paw'], spent: 80.55 },
];

export default function MarketPage() {
  const { user, loading, addTokens } = useGame();
  
  const [selectedNft, setSelectedNft] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeSheet = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedNft(null);
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    const tg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    if (tg && tg.BackButton) {
      if (selectedNft && !isClosing) {
        tg.BackButton.show();
        const onBack = () => closeSheet();
        tg.BackButton.onClick(onBack);
        return () => {
          tg.BackButton.offClick(onBack);
          tg.BackButton.hide();
        };
      } else {
        tg.BackButton.hide();
      }
    }
  }, [selectedNft, isClosing]);

  const handleBuy = async () => {
    if (!selectedNft || isBuying || !user) return;
    setIsBuying(true);

    try {
      if (user.balance >= selectedNft.price) {
        addTokens(-selectedNft.price);
        closeSheet();
      } else {
        alert('Not enough balance!');
      }
    } catch (error) {
      console.error('Buy error:', error);
      alert('Error processing purchase');
    } finally {
      setIsBuying(false);
    }
  };

  if (loading || !user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="market-screen">
      <div className="market-grid">
        {MARKET_ITEMS.map((item, index) => (
          <div key={item.id} className="market-card" onClick={() => setSelectedNft(item)}>
            <div className="market-card-tag">#{item.rank}</div>
            <img src={item.image} alt={item.name} className="market-card-img" />
            <div className="market-card-price">
              <img 
                src="/Gram Diamond Mark.svg" 
                alt="Diamond" 
                className="nft-currency-icon" 
                style={{ filter: 'hue-rotate(55deg) brightness(1.3)' }} 
              />
              <span>{item.price}</span>
            </div>
          </div>
        ))}
      </div>

      {mounted && selectedNft && createPortal(
        <div className={`nft-full-screen ${isClosing ? 'closing' : ''}`}>
          <div 
            className="nft-fs-bg-blur" 
            style={{ backgroundImage: `url(${selectedNft.image})` }} 
          />

          <div className="nft-fs-content">
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '12px' }}>
              <div className="nft-fs-img-box">
                <img src={selectedNft.image} alt={selectedNft.name} className="nft-fs-img" />
                <div className="nft-fs-badge">#{selectedNft.rank} / 1 000</div>
              </div>

              <div className="nft-traits-table">
                <div className="nft-trait-row">
                  <div className="nft-trait-label">Rank</div>
                  <div className="nft-trait-value">#{selectedNft.rank}</div>
                </div>
                <div className="nft-trait-row">
                  <div className="nft-trait-label">Head</div>
                  <div className="nft-trait-value">
                    {selectedNft.head} <span className="nft-trait-percent">{selectedNft.headPercent}</span>
                  </div>
                </div>
                <div className="nft-trait-row">
                  <div className="nft-trait-label">Outfit</div>
                  <div className="nft-trait-value">
                    {selectedNft.outfit} <span className="nft-trait-percent">{selectedNft.outfitPercent}</span>
                  </div>
                </div>
                <div className="nft-trait-row">
                  <div className="nft-trait-label">Paw</div>
                  <div className="nft-trait-value">
                    {selectedNft.paw} <span className="nft-trait-percent">{selectedNft.pawPercent}</span>
                  </div>
                </div>
                <div className="nft-trait-row">
                  <div className="nft-trait-label">Backdrop</div>
                  <div className="nft-trait-value">
                    {selectedNft.backdrop} <span className="nft-trait-percent">{selectedNft.backdropPercent}</span>
                  </div>
                </div>
                <div className="nft-trait-row">
                  <div className="nft-trait-label">NFT Includes</div>
                  <div className="nft-trait-value">
                    <div className="nft-includes-list">
                      {selectedNft.includes.map((inc: string, i: number) => (
                        <span key={i} className="nft-trait-percent">{inc}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="nft-trait-row">
                  <div className="nft-trait-label">Total spent</div>
                  <div className="nft-trait-value">
                    <img 
                      src="/Gram Diamond Mark.svg" 
                      alt="Diamond" 
                      className="nft-currency-icon" 
                      style={{ filter: 'hue-rotate(55deg) brightness(1.3)', width: 14, height: 14 }} 
                    />
                    {selectedNft.spent}
                  </div>
                </div>
              </div>

              <div className="nft-fs-buy-wrapper">
                <button 
                  className="nft-fs-buy-btn" 
                  onClick={handleBuy}
                  disabled={isBuying}
                >
                  {isBuying ? 'Processing...' : (
                    <>
                      <img 
                        src="/Gram Diamond Mark.svg" 
                        alt="Diamond" 
                        className="nft-currency-icon" 
                        style={{ filter: 'hue-rotate(55deg) brightness(1.3)', width: 20, height: 20 }} 
                      />
                      {selectedNft.price}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
