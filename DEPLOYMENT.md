# Deployment — TG Clicker (Telegram Mini App)

## TL;DR

| Action | Command |
|---|---|
| Build | `npm install && npm run build` |
| Run (prod) | `NODE_ENV=production node server.js` |
| Run (docker) | `docker-compose up -d --build` |
| Health | `curl http://localhost:3000` |

The app is a **Next.js 16** project with a **custom Node HTTP server** (`server.js`)
that also runs **Socket.io** and the **Telegram Bot** (polling). The SQLite DB is
created on first boot — there are **no migrations to run**.

---

## Required environment

| Var | Purpose | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token; also the HMAC secret for initData auth | **yes** |
| `ADMIN_ID` | The only Telegram user ID allowed to run broadcasts | **yes** |
| `PORT` | HTTP port (default `3000`) | no |

`.env` is gitignored; copy `.env.example` and fill it.

> In non-production (`NODE_ENV !== 'production'`) any initData starting with
> `mock` is accepted as the mock user `123456789` — do **not** run with
> `NODE_ENV=development` in production.

---

## Building & running

```bash
# local
npm install
npm run build
NODE_ENV=production node server.js        # listens on $PORT (3000)

# docker
docker-compose up -d --build
```

The server:
1. prepares Next.js (`app.getRequestHandler()`);
2. opens `data/game.db` (better-sqlite3, WAL) — created automatically;
3. starts Socket.io (crash game real-time events);
4. starts the Telegram bot in **polling** mode (`deleteWebHook()` on boot) and
   processes admin broadcasts.

---

## Telegram Mini App hosting

Telegram Web Apps are opened over HTTPS inside the Telegram client. The bot
must be set to the Mini App (via BotFather `/newapp`), and the app must be
reachable at a public HTTPS URL. Common setups:

- **Cloudflare quick tunnel** (used in this repo's history):
  `cloudflared tunnel --url http://localhost:3000` → a `*.trycloudflare.com` URL.
  Note the URL changes on restart.
- **Reverse proxy** (nginx/Caddy) with TLS in front of `:3000`.

The bot itself uses **polling**, so it does **not** need a public webhook URL —
only the Web App must be public.

---

## Database safety

- SQLite at `data/game.db`, `PRAGMA journal_mode = WAL`, `busy_timeout = 5000`.
- Tables: `users`, `transactions`, `state` — all created with
  `CREATE TABLE IF NOT EXISTS` on boot.
- Keep the `data/` directory on a persistent volume (docker volume / host dir);
  a redeploy never recreates it.
- Manual backup:
  ```bash
  sqlite3 data/game.db ".backup 'data/backup.db'"
  ```

---

## Server layout (reference)

```
/app (container) / <repo>
├── server.js          ← entrypoint (Next + Socket.io + bot)
├── next.config.ts
├── data/game.db       ← runtime SQLite (persistent volume)
├── public/            ← static (bg, NFT images, icons)
└── src/               ← Next.js App Router pages + lib + components
```

---

## What does NOT deploy automatically

- `.env` (bot token, ADMIN_ID) — must exist on the host / in compose env.
- The `data/` volume — provisioned once, survives redeploys.
- The Telegram Mini App URL — configured in BotFather, not in the repo.

---

## Monitoring & operations

- All logging goes to stdout/stderr (docker logs).
- Bot polling errors are printed to console (`BOT POLLING ERROR`).
- There is **no structured logging, metrics, or alerting** — see
  `SECURITY_AUDIT.md` (gap).
