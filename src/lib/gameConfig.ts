export interface Upgrade {
  id: string;
  name: string;
  baseCost: number;
  costMultiplier: number;
  baseIncome?: number; // Income per hour per level
  baseClickPower?: number; // Click power per level
}

export interface Task {
  id: string;
  description: string;
  reward: number;
}

export const UPGRADES: Upgrade[] = [
  // Passive Income Upgrades
  { id: 'u1', name: 'Auto-clicker', baseCost: 100, costMultiplier: 1.5, baseIncome: 10 },
  { id: 'u2', name: 'Mining Farm', baseCost: 500, costMultiplier: 1.6, baseIncome: 60 },
  { id: 'u3', name: 'ASIC Miner', baseCost: 2000, costMultiplier: 1.8, baseIncome: 300 },
  { id: 'u4', name: 'Quantum PC', baseCost: 10000, costMultiplier: 2.0, baseIncome: 2000 },
  { id: 'u5', name: 'Neural Net', baseCost: 50000, costMultiplier: 2.2, baseIncome: 15000 },
  { id: 'u6', name: 'AI Data Center', baseCost: 250000, costMultiplier: 2.5, baseIncome: 100000 },
  // Click Power Upgrades
  { id: 'c1', name: 'Multi-tap', baseCost: 200, costMultiplier: 2.0, baseClickPower: 1 },
  { id: 'c2', name: 'Turbo Finger', baseCost: 1000, costMultiplier: 2.5, baseClickPower: 3 },
  { id: 'c3', name: 'Cyber Arm', baseCost: 5000, costMultiplier: 3.0, baseClickPower: 10 },
];

export const TASKS: Task[] = [
  { id: 't1', description: 'Subscribe to Channel', reward: 1000 },
  { id: 't2', description: 'Invite a Friend', reward: 5000 },
  { id: 't3', description: 'Watch a Video', reward: 500 },
  { id: 't4', description: 'Connect Wallet', reward: 10000 },
  { id: 't5', description: 'Make a Repost', reward: 2000 },
  { id: 't6', description: 'Follow X (Twitter)', reward: 3000 },
  { id: 't7', description: 'Join Discord Server', reward: 1500 },
  { id: 't8', description: 'Daily Login Reward', reward: 200 },
  { id: 't9', description: 'Mint NFT Avatar', reward: 25000 },
];

export const MAX_ENERGY_BASE = 1000;
export const ENERGY_REGEN_RATE = 1; // 1 energy per second
