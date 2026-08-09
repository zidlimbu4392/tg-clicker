# TG Clicker — Architecture (standalone spec)

> Standalone specification for the **TG Clicker** Telegram Mini App. The source
> code in this repository is the source of truth. Everything below describes
> what **actually exists** (read from the code), not a plan.

---

## 1. Project Overview

**TG Clicker** is a full-stack Telegram Mini App (Web App) that implements a
"clicker + crypto dashboard" game in the style of popular Telegram crypto
tappers (crash games, taps, upgrades, tasks, NFT marketplace, staking,
leaderboard). It runs inside the Telegram client and talks to the backend over
WebSockets (Socket.io) and the Telegram Bot API.

The product is **simulated**: balances, top-ups, withdrawals, market prices and
NFT ranks are fake/static data — there are **no real payments or crypto** on
chain. That matters for scoping (see §9).

### High-level flow

```
Telegram Mini App (frontend, Next.js)
        │  initData (Telegram HMAC) auth
        ▼
Node HTTP server (server.js)  +  Socket.io (real-time crash game)
        │
        ▼
better-sqlite3 (WAL)  <────  Telegram Bot (polling) for admin broadcasts
```

### Tech stack (exact, from package.json / code)

| Concern | Choice |
|---|---|
| Framework | Next.js **16.2.9** (App Router), custom `server.js` |
| Renderer | react / react-dom **19.2.4** |
| Real-time | `socket.io` + `socket.io-client` 4.8.x |
| DB | `better-sqlite3` 11.x, WAL + busy_timeout 5000 |
| Telegram | `@twa-dev/sdk` 8.x (client), `node-telegram-bot-api` 0.66 (server, polling) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Animation | framer-motion 12.x |
| Icons | lucide-react |
| Lint | eslint 9 + eslint-config-next |
| Language | TypeScript 5 |

---

## 2. Repository structure

```
tg-clicker/
├── server.js               ← custom Node server: HTTP + Socket.io + Telegram bot
├── next.config.ts / tsconfig.json / eslint.config.mjs / postcss.config.mjs
├── package.json / package-lock.json
├── Dockerfile / docker-compose.yml
├── README.md / CLAUDE.md / AGENTS.md
├── data/                   ← runtime SQLite DB (game.db) — created at boot
├── public/                 ← static assets (bg.png, NFT dog images, svg icons)
└── src/
    ├── app/                ← Next.js App Router pages
    │   ├── layout.tsx / globals.css / favicon.ico
    │   ├── page.tsx        ← main game (crash + clicker), uses Socket.io
    │   ├── tasks/page.tsx  ← tasks system
    │   ├── market/page.tsx ← NFT dog marketplace (static cards)
    │   ├── runner/page.tsx ← canvas "dino runner" mini-game
    │   ├── staking/page.tsx← staking pools (14-day lock)
    │   ├── top/page.tsx    ← leaderboard (top users)
    │   └── admin/page.tsx  ← admin panel
    ├── components/
    │   ├── TabBar.tsx      ← bottom navigation
    │   └── AdminPanel.tsx  ← admin UI (stats, balance, broadcast)
    └── lib/
        ├── db.ts           ← SQLite schema + user/transaction helpers
        ├── gameConfig.ts   ← UPGRADES, TASKS, energy constants
        ├── auth.ts         ← Telegram initData HMAC validation
        └── GameContext.tsx ← global game state (user, balance, energy, tokens)
```

---

## 3. Backend / server (`server.js`)

A **custom Node HTTP server** wraps Next.js (`app.getRequestHandler()`) and adds
Socket.io. Key responsibilities:

- **Next.js request handling** — all page/API routes.
- **Socket.io** (`origin: "*"`, GET/POST) — the real-time crash game
  (`waiting → running → crashed`) plus live user updates.
- **Telegram Bot** (`node-telegram-bot-api`, polling, `deleteWebHook()` on boot):
  - accepts messages **only** from `ADMIN_ID`;
  - a broadcast **state machine** in a `state` table (`admin_broadcast_state` =
    `WAITING` → sends the drafted text/photo to all users);
  - `polling_error` and message logging to console.
- **Fake players** — a hardcoded list (`FAKE_PLAYERS`: Alex_pro, CryptoKing, …)
  used to simulate activity in the crash game.
- **initData validation** — HMAC-SHA256 of sorted `initData` params with the
  bot-token secret (`secretKey = HMAC_SHA256("WebAppData", botToken)`); mock
  user `123456789` in non-production when initData starts with `mock`.

---

## 4. Database (better-sqlite3, WAL)

Path `data/game.db`, `PRAGMA journal_mode = WAL`, `busy_timeout = 5000`.

| Table | Columns |
|---|---|
| `users` | `telegram_id` PK, `balance`, `energy`, `max_energy`, `passive_income`, `last_sync`, `upgrades` (JSON), `completed_tasks` (JSON) |
| `transactions` | `id` PK, `telegram_id`, `type`, `amount`, `currency` (USDT), `status` (completed), `address`, `timestamp` |
| `state` | `key` PK, `value` (admin broadcast state) |

Helpers in `src/lib/db.ts`: `getUser`, `createUser`, `updateUser`,
`logTransaction`, plus task/upgrade persistence.

---

## 5. Auth

Telegram `initData` validation (`src/lib/auth.ts` and `server.js`):

1. take `initData` query params, drop `hash`, sort by key;
2. `dataCheckString = params.join("\n")`;
3. `secretKey = HMAC_SHA256(key="WebAppData", botToken)`;
4. compare `HMAC_SHA256(secretKey, dataCheckString)` to the client `hash`;
5. parse `user` JSON → `{ id, first_name, username, ... }`.

In dev (`NODE_ENV !== 'production'`) any initData starting with `mock` → mock
user `123456789`.

---

## 6. Game configuration (`src/lib/gameConfig.ts`)

- **Upgrades** — two families:
  - passive income: `u1` Auto-clicker (100, ×1.5, +10/h) → `u6` AI Data Center
    (250 000, ×2.5, +100 000/h);
  - click power: `c1` Multi-tap (200, ×2, +1) → `c3` Cyber Arm (5 000, ×3, +10).
- **Tasks** — 9: Subscribe to Channel (1 000), Invite a Friend (5 000),
  Watch a Video (500), Connect Wallet (10 000), Make a Repost (2 000),
  Follow X (3 000), Join Discord (1 500), Daily Login (200), Mint NFT (25 000).
- **Energy** — base `MAX_ENERGY_BASE = 1000`, regen `ENERGY_REGEN_RATE = 1/sec`.

---

## 7. Frontend

- **Design tokens** (`globals.css`, exact):
  `--bg: #080510`, `--surface: rgba(255,255,255,.05)`,
  `--accent: #a78bfa`, `--green: #34d399`, `--orange: #fb923c`,
  `--text: #fff`; font Inter. Cosmic background `url('/bg.png') cover`, hidden
  scrollbars, `user-select:none`, `100dvh` layout, bottom nav with
  `padding-bottom: 110px` on `.screen`.
- **Main page** (`page.tsx`): crash game — `GamePhase: waiting|running|crashed`,
  bets, Socket.io events; clicker with energy; connected to `GameContext`.
- **Market** (`market/page.tsx`): static NFT dog cards (`MARKET_ITEMS` m1–m5+),
  rank/percent fields, `include` lists, spent amounts (static data).
- **Runner** (`runner/page.tsx`): canvas dino game → `addTokens()`.
- **Staking** (`staking/page.tsx`): amount + lock period (14 days default).
- **Top** (`top/page.tsx`): leaderboard of `TopUser` (telegram_id, …).
- **Admin** (`admin/page.tsx` + `AdminPanel.tsx`): stats, manage balances,
  trigger bot broadcast.
- **TabBar**: bottom navigation across the pages.

---

## 8. Environment & deployment

Required env vars:

| Var | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | bot token (also used for initData HMAC secret) |
| `ADMIN_ID` | the only Telegram ID allowed to broadcast |
| `PORT` | HTTP port (default 3000) |

Deployment: `docker-compose up -d --build` (Dockerfile + compose), the app runs
`node server.js` (Next production + Socket.io + bot). SQLite lives in a volume /
`data/` dir. In production the app is expected to be behind the Telegram Web App
initData gate; the DB file is created on first boot.

---

## 9. What is NOT done yet / gaps (honest audit)

> **Security audit: NOT done.** This repository has never had a security
> review. Do not run it with real funds/user data until the items below are
> addressed.

1. **Security audit** — never performed (auth flows, HMAC validation,
   WebSocket abuse, DB access, admin broadcast).
2. **No tests** — zero unit/integration/e2e coverage.
3. **Real-time abuse** — Socket.io `origin: "*"`, no rate limiting, no
   anti-automation for the crash game (bets, cash-out timing).
4. **Admin gated by Telegram ID only** (`ADMIN_ID` in env) — no password, no
   audit log; any leaked/mistaken ADMIN_ID grants full broadcast + balance
   control.
5. **Simulated economy** — balances/top-ups/withdrawals/NFT are fake; there is
   no real payment gateway, crypto on-chain flow or KYC.
6. **Broadcast state machine** is a single-row `state` table — no queue,
   retries, or dedupe.
7. **No rate limiting** on API/WebSocket; energy/balance updates trust the
   client unless re-validated server-side.
8. **Secrets in env only** — the repo's `.env` (bot token) is gitignored but
   there is no rotation/CI secrets story.
9. **SQLite single-file** — fine for a demo, not for horizontal scaling or
   multi-instance WebSockets (state is in-process).
10. **No monitoring/logging** beyond console; no structured error reporting.
11. **Accessibility / i18n** — UI is Russian/English mixed, no localization
    layer, no a11y audit.
