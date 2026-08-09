'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UPGRADES } from './gameConfig';
interface UserData {
  telegram_id: string;
  balance: number;
  energy: number;
  max_energy: number;
  passive_income: number;
  upgrades: Record<string, number>;
  completed_tasks: string[];
  isAdmin?: boolean;
}

interface GameContextType {
  user: UserData | null;
  loading: boolean;
  initData: string;
  tap: () => void;
  addTokens: (amount: number) => void;
  buyUpgrade: (upgradeId: string) => Promise<boolean>;
  completeTask: (taskId: string) => Promise<boolean>;
  refreshUser: (telegramId: string) => Promise<void>;
  topUsers: any[];
  loadingTop: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingTaps = useRef(0);
  const syncInterval = useRef<NodeJS.Timeout | null>(null);
  const initDataRef = useRef('mock_init_data');
  const tgIdRef = useRef('123456789');
  
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  useEffect(() => {
    // Dynamically import WebApp to avoid "window is not defined" error during Next.js SSR build
    import('@twa-dev/sdk').then((WebAppModule) => {
      const WebApp = WebAppModule.default;
      
      if (typeof window !== 'undefined' && WebApp.initData) {
        initDataRef.current = WebApp.initData;
        if (WebApp.initDataUnsafe?.user?.id) {
          tgIdRef.current = WebApp.initDataUnsafe.user.id.toString();
        }
      }
      
      WebApp.ready();
      WebApp.expand();
      
      // Fullscreen + black header
      try {
        if (WebApp.requestFullscreen) WebApp.requestFullscreen();
      } catch (e) { /* not supported */ }
      try {
        WebApp.setHeaderColor('#080510');
        WebApp.setBackgroundColor('#080510');
      } catch (e) { /* not supported */ }

      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRef.current })
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser({
              ...data.user,
              upgrades: JSON.parse(data.user.upgrades),
              completed_tasks: JSON.parse(data.user.completed_tasks)
            });
          }
          setLoading(false);
        });

      // Fetch top users once on init
      fetch('/api/top', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRef.current })
      })
        .then(res => res.json())
        .then(data => {
          if (data.top) {
            setTopUsers(data.top);
          }
          setLoadingTop(false);
        })
        .catch(() => setLoadingTop(false));
    }).catch(console.error);

    // Sync taps periodically
    syncInterval.current = setInterval(() => {
      if (pendingTaps.current > 0) {
        const tapsToSync = pendingTaps.current;
        pendingTaps.current = 0;
        
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: initDataRef.current, tapsCount: tapsToSync })
        })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              setUser(prev => prev ? {
                ...prev,
                balance: data.user.balance,
                energy: data.user.energy,
              } : null);
            }
          });
      }
    }, 2000);

    return () => {
      if (syncInterval.current) clearInterval(syncInterval.current);
    };
  }, []);

  const tap = () => {
    if (!user || user.energy <= 0) return;
    
    // Calculate click power
    let power = 1;
    for (const [id, level] of Object.entries(user.upgrades)) {
      const upgrade = UPGRADES.find(u => u.id === id);
      if (upgrade && upgrade.baseClickPower) {
        power += upgrade.baseClickPower * (level as number);
      }
    }
    
    const consumed = Math.min(power, user.energy);
    
    // Optimistic update
    setUser(prev => prev ? {
      ...prev,
      balance: prev.balance + consumed,
      energy: prev.energy - consumed
    } : null);
    
    pendingTaps.current += consumed;
  };

  const addTokens = (amount: number) => {
    if (!user) return;
    pendingTaps.current += amount;
    setUser(prev => prev ? {
      ...prev,
      balance: prev.balance + amount
    } : null);
  };

  const buyUpgrade = async (upgradeId: string) => {
    if (!user) return false;
    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRef.current, upgrade_id: upgradeId })
      });
      const data = await res.json();
      if (data.success) {
        setUser({
          ...data.user,
          upgrades: JSON.parse(data.user.upgrades),
          completed_tasks: JSON.parse(data.user.completed_tasks)
        });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const completeTask = async (taskId: string) => {
    if (!user) return false;
    try {
      const res = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRef.current, task_id: taskId })
      });
      const data = await res.json();
      if (data.success) {
        setUser({
          ...data.user,
          upgrades: JSON.parse(data.user.upgrades),
          completed_tasks: JSON.parse(data.user.completed_tasks)
        });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const refreshUser = async (telegramId: string) => {
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initDataRef.current })
      });
      const data = await res.json();
      if (data.user) {
        setUser({
          ...data.user,
          upgrades: JSON.parse(data.user.upgrades),
          completed_tasks: JSON.parse(data.user.completed_tasks)
        });
      }
    } catch(e) {}
  };

  useEffect(() => {
    // Preload images in JS so they are absolutely instantly available when Market is opened
    if (typeof window !== 'undefined') {
      const imagesToPreload = ['1y.png', '2y.png', '3y.png', '4y.png', '5y.png', '6y.png', '8y.png', '9y.png', 'Gram Diamond Mark.svg'];
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = '/' + src;
      });
    }
  }, []);

  return (
    <GameContext.Provider value={{
      user, loading, initData: initDataRef.current, tap, addTokens, buyUpgrade, completeTask, refreshUser, topUsers, loadingTop
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) throw new Error('useGame must be used within GameProvider');
  return context;
};
