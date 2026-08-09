# Telegram Web App: Clicker & Crypto Dashboard

A modern, full-stack Telegram Mini App (Web App) built with Next.js, Node.js, and SQLite. This project implements a complete "Clicker" and "Crypto Dashboard" experience, simulating core mechanics found in popular Telegram crypto games.

## ✨ Features

- **Real-time Clicker (Crash):** Tap-to-earn mechanics with energy regeneration, upgrades, and passive income. Real-time synchronization via WebSockets (Socket.io).
- **Tasks System:** Users can complete tasks (e.g., subscribing to channels) to earn rewards. Includes fake API verification delays for UX realism.
- **Premium UI/UX:** Built with Tailwind CSS and Framer Motion. Features bottom sheets, dark mode (`#1e1e2e`), glassmorphism, and smooth animations.
- **Admin Panel:** Built-in dashboard (protected by Telegram ID) to view user statistics, manage balances, and send global broadcast messages via the Telegram Bot.
- **Wallet & Transactions:** Simulated Top-Up and Withdraw systems with full transaction history and status tracking.
- **SQLite Database:** Lightweight, fast persistent storage using `better-sqlite3` in WAL mode.

## 🚀 Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Socket.io (WebSockets).
- **Database:** SQLite (`better-sqlite3`).
- **Telegram Integration:** `@twa-dev/sdk` (Client-side), `node-telegram-bot-api` (Server-side Bot).

## 🛠 Setup & Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tg-crypto-clicker.git
   cd tg-crypto-clicker
   ```

2. Create a `.env` file based on the template:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and add your Telegram Bot Token and your personal Telegram ID (for Admin access).*

3. Run with Docker (Recommended):
   ```bash
   docker-compose up -d --build
   ```
   *The app will be available at `http://localhost:3000`.*

4. Or run locally without Docker:
   ```bash
   npm install
   npm run build
   npm start
   ```

## 🔐 Security
- All sensitive variables (Bot Tokens, Admin IDs) are secured via environment variables (`.env`).
- Database is stored locally in the `/data` directory (persisted via Docker volumes).

## 📄 License
MIT License
