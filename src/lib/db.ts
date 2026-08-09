import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'game.db'));
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    energy INTEGER DEFAULT 1000,
    max_energy INTEGER DEFAULT 1000,
    passive_income INTEGER DEFAULT 0,
    last_sync INTEGER,
    upgrades TEXT DEFAULT '{}',
    completed_tasks TEXT DEFAULT '[]'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT,
    type TEXT,
    amount INTEGER,
    currency TEXT DEFAULT 'USDT',
    status TEXT DEFAULT 'completed',
    address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec('ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT "completed"'); } catch(e) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN address TEXT'); } catch(e) {}

export interface User {
  telegram_id: string;
  balance: number;
  energy: number;
  max_energy: number;
  passive_income: number;
  last_sync: number;
  upgrades: string; // JSON
  completed_tasks: string; // JSON
}

export const getUser = (telegram_id: string): User | undefined => {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id) as User | undefined;
};

export const createUser = (telegram_id: string, now: number): User => {
  db.prepare(
    'INSERT INTO users (telegram_id, last_sync) VALUES (?, ?)'
  ).run(telegram_id, now);
  return getUser(telegram_id)!;
};

export const updateUser = (
  telegram_id: string,
  data: Partial<Omit<User, 'telegram_id'>>
) => {
  const keys = Object.keys(data);
  if (keys.length === 0) return;
  
  const setString = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k as keyof typeof data]);
  
  db.prepare(`UPDATE users SET ${setString} WHERE telegram_id = ?`).run(...values, telegram_id);
};

export interface Transaction {
  id: number;
  telegram_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  address?: string;
  timestamp: string;
}

export const logTransaction = (
  telegram_id: string,
  type: string,
  amount: number,
  currency: string = 'USDT',
  status: string = 'completed',
  address: string | null = null
) => {
  db.prepare(
    'INSERT INTO transactions (telegram_id, type, amount, currency, status, address) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(telegram_id, type, amount, currency, status, address);
};

export const getTransactions = (limit: number = 50): Transaction[] => {
  return db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ?').all(limit) as Transaction[];
};

export const getSystemStats = () => {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const totalBalance = db.prepare('SELECT SUM(balance) as total FROM users').get() as { total: number };
  
  const totalDeposits = db.prepare('SELECT SUM(amount) as total FROM transactions WHERE type = \'deposit\'').get() as { total: number };
  const totalWithdrawals = db.prepare('SELECT SUM(amount) as total FROM transactions WHERE type = \'withdraw\'').get() as { total: number };
  
  // Bets are negative (deducted from balance), wins are positive (added to balance)
  const totalBets = db.prepare('SELECT SUM(amount) as total FROM transactions WHERE type = \'bet\'').get() as { total: number };
  const totalWins = db.prepare('SELECT SUM(amount) as total FROM transactions WHERE type = \'win\'').get() as { total: number };

  return {
    totalUsers: usersCount.count,
    totalBalance: totalBalance.total || 0,
    totalDeposits: totalDeposits.total || 0,
    totalWithdrawals: Math.abs(totalWithdrawals.total || 0),
    systemProfit: Math.abs(totalBets.total || 0) - (totalWins.total || 0)
  };
};

export default db;
