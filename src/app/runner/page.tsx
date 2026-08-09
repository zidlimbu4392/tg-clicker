'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/GameContext';

export default function DinoGame() {
  const router = useRouter();
  const { addTokens } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coinsCollected, setCoinsCollected] = useState(0);

  // Game physics state stored in refs to avoid React re-renders
  const gameState = useRef({
    isPlaying: false,
    playerY: 0,
    playerVy: 0,
    jumpCount: 0,
    gravity: 2400,
    jumpPower: 800,
    speed: 300, // pixels per second
    bgOffset: 0,
    entities: [] as { x: number, y: number, w: number, h: number, type: 'cactus' | 'bird' | 'coin' | 'gap', collected?: boolean }[],
    spawnTimer: 0,
    lastTime: 0,
    coins: 0
  });

  const requestRef = useRef<number>(0);

  useEffect(() => {
    // Setup Telegram BackButton
    const tg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    if (tg && tg.BackButton) {
      tg.BackButton.show();
      const onBack = () => router.push('/');
      tg.BackButton.onClick(onBack);
      
      return () => {
        tg.BackButton.offClick(onBack);
        tg.BackButton.hide();
      };
    }
  }, [router]);

  useEffect(() => {
    draw();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setCoinsCollected(0);

    gameState.current = {
      isPlaying: true,
      playerY: 0,
      playerVy: 0,
      jumpCount: 0,
      gravity: 2400,
      jumpPower: 750,
      speed: 350,
      bgOffset: 0,
      entities: [],
      spawnTimer: 0,
      lastTime: performance.now(),
      coins: 0
    };

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const gameOver = () => {
    setIsPlaying(false);
    setIsGameOver(true);
    gameState.current.isPlaying = false;
  };

  const spawnEntity = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const r = Math.random();
    let type: 'cactus' | 'bird' | 'coin' | 'gap' = 'cactus';
    let y = 0;
    let w = 40;
    let h = 40;

    if (r > 0.85) {
      type = 'gap';
      y = 0;
      w = 120 + Math.random() * 80; // wide gap
      h = 10;
    } else if (r > 0.65) {
      type = 'bird';
      y = 40 + Math.random() * 60; // Fly above ground
    } else if (r > 0.4) {
      type = 'coin';
      y = 40 + Math.random() * 80; // High or low
      w = 30;
      h = 30;
    }

    gameState.current.entities.push({
      x: canvas.width + 50,
      y,
      w,
      h,
      type
    });
  };

  const gameLoop = (time: number) => {
    const state = gameState.current;
    if (!state.isPlaying) return;

    const deltaTime = Math.min((time - state.lastTime) / 1000, 0.05); // cap at 50ms to prevent glitches
    state.lastTime = time;

    // Difficulty increases speed slowly
    state.speed += deltaTime * 5; 
    state.bgOffset -= (state.speed * 0.2) * deltaTime;

    // Move entities
    let hit = false;
    let isOverGap = false;

    const pX = 60; 
    const pW = 30;
    const pH = 40;

    for (let i = state.entities.length - 1; i >= 0; i--) {
      const ent = state.entities[i];
      ent.x -= state.speed * deltaTime;

      if (ent.x < -200) {
        state.entities.splice(i, 1);
        continue;
      }

      if (ent.type === 'gap') {
        // Check if player is completely inside gap
        if (pX + pW / 2 > ent.x && pX + pW / 2 < ent.x + ent.w) {
          isOverGap = true;
        }
      } else {
        // AABB Collision for others
        if (
          pX < ent.x + ent.w - 10 &&
          pX + pW > ent.x + 10 &&
          state.playerY < ent.y + ent.h - 10 &&
          state.playerY + pH > ent.y + 10 &&
          !ent.collected
        ) {
          if (ent.type === 'coin') {
            ent.collected = true;
            state.coins += 10;
            setCoinsCollected(state.coins);
            addTokens(10); // Instant reward!
          } else {
            hit = true;
          }
        }
      }
    }

    // Player Physics
    state.playerVy -= state.gravity * deltaTime;
    state.playerY += state.playerVy * deltaTime;

    const floor = isOverGap ? -200 : 0;
    if (state.playerY <= floor) {
      state.playerY = floor;
      state.playerVy = 0;
      state.jumpCount = 0; // reset double jump
    }

    // Fall in gap
    if (state.playerY < -50) {
      hit = true;
    }

    if (hit) {
      gameOver();
      draw(); // draw one last frame
      return;
    }

    // Spawning logic
    state.spawnTimer += deltaTime;
    const spawnThreshold = Math.max(0.6, 250 / state.speed);
    if (state.spawnTimer > spawnThreshold) {
      state.spawnTimer = 0;
      spawnEntity();
    }

    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameState.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw Sunset Gradient Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, rect.height);
    skyGrad.addColorStop(0, '#2b1055'); // Deep purple
    skyGrad.addColorStop(1, '#7597de'); // Sunset blueish
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 2. Draw Parallax City Silhouette
    ctx.fillStyle = '#170b2e'; // dark city color
    const cityW = 60;
    const maxBuildings = Math.ceil(rect.width / cityW) + 2;
    for (let i = 0; i < maxBuildings; i++) {
      // Create a deterministic but pseudo-random building height based on index
      const bIndex = i + Math.floor(Math.abs(state.bgOffset) / cityW);
      const bHeight = 50 + (Math.sin(bIndex * 12.3) * 30 + 30);
      const bx = (bIndex * cityW) + (state.bgOffset % cityW);
      ctx.fillRect(bx, rect.height - 40 - bHeight, cityW + 1, bHeight);
    }

    // 3. Draw Ground
    const groundY = rect.height - 40;
    ctx.fillStyle = '#a78bfa'; // Purple ground line
    
    // Draw ground by skipping gaps
    let cx = 0;
    const gaps = state.entities.filter(e => e.type === 'gap').sort((a,b) => a.x - b.x);
    
    ctx.beginPath();
    for (const gap of gaps) {
      if (gap.x > cx) {
        ctx.rect(cx, groundY, gap.x - cx, rect.height - groundY);
      }
      cx = gap.x + gap.w;
    }
    if (cx < rect.width) {
      ctx.rect(cx, groundY, rect.width - cx, rect.height - groundY);
    }
    ctx.fill();

    // 4. Draw Player
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const playerIcon = state.playerY > 10 ? '🏃‍♂️' : '🚶‍♂️';
    ctx.fillText(playerIcon, 60 + 15, groundY - state.playerY);

    // 5. Draw Entities
    for (const ent of state.entities) {
      if (ent.collected || ent.type === 'gap') continue;
      
      let icon = '🌵';
      if (ent.type === 'bird') icon = '🦅';
      if (ent.type === 'coin') icon = '💎';
      
      ctx.font = ent.type === 'coin' ? '30px Arial' : '40px Arial';
      ctx.fillText(icon, ent.x + ent.w / 2, groundY - ent.y);
    }
  };

  const handleJump = (e: React.PointerEvent) => {
    if (!isPlaying && !isGameOver) {
      startGame();
    } else if (isPlaying && gameState.current.jumpCount < 2) {
      // Double jump allowed
      gameState.current.playerVy = gameState.current.jumpPower;
      gameState.current.jumpCount++;
    }
  };

  return (
    <div className="dino-screen" onPointerDown={handleJump} style={{ touchAction: 'none' }}>
      <div className="dino-header">
        <div className="runner-score">Coins: {coinsCollected}</div>
      </div>

      <div className="dino-game-area" style={{ padding: 0, background: 'transparent' }}>
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {!isPlaying && !isGameOver && (
          <div className="runner-overlay">
            <h1>Neon Run</h1>
            <p>Tap to jump. Double tap for double-jump!</p>
            <button className="primary-stake-btn" onClick={(e) => { e.stopPropagation(); startGame(); }}>PLAY NOW</button>
          </div>
        )}

        {isGameOver && (
          <div className="runner-overlay">
            <h1>CRASHED!</h1>
            <p>Earned: {coinsCollected} Tokens</p>
            <button className="primary-stake-btn" onClick={(e) => { e.stopPropagation(); startGame(); }}>PLAY AGAIN</button>
          </div>
        )}
      </div>
    </div>
  );
}
