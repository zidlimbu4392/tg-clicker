# Security audit — TG Clicker

> **Status: security audit has NOT been performed.** This document is the
> first honest pass over the code. Do not run this app with real money or
> real user data until the HIGH findings are closed.

Date: 2026-08-09 · Source: repository code (server.js, src/lib/*, src/app/*).

---

## Summary

| # | Зона | Статус | Серьёзность |
|---|------|--------|-------------|
| 1 | Админ-доступ по Telegram ID, без пароля/2FA/аудит-лога | НЕ закрыто | HIGH |
| 2 | Socket.io CORS `origin:"*"` + нет рейт-лимита/антибота | НЕ закрыто | HIGH |
| 3 | Мок-режим auth (`initData` = `mock…`) в non-production | Частично (dev-only) | MEDIUM |
| 4 | Доверие клиентскому состоянию (balance/energy/upgrades) | Не проверено | MEDIUM |
| 5 | Нет тестов / нет валидации на уровне API | НЕ закрыто | MEDIUM |
| 6 | Broadcast: однорядный state, без очереди/ретраев | НЕ закрыто | LOW |
| 7 | Нет мониторинга/структурированного логирования | НЕ закрыто | LOW |

---

## Finding 1 — HIGH: админ-доступ только по `ADMIN_ID`

**Где:** `server.js` — `if (msg.chat.id.toString() !== ADMIN_ID) return;`

Любой, кто знает (или угадает) Telegram ID в `ADMIN_ID`, может слать
broadcast-сообщения всем пользователям и манипулировать состоянием. Пароля,
второго фактора и журнала действий нет.

**Фикс:**
1. Поддержать несколько администраторов (список/роль) и пароль-команду на
   бота (например `/login <password>`).
2. Писать аудит-лог admin-действий (кто/когда/что) в `state`/отдельную таблицу.
3. Не хранить ADMIN_ID в открытом виде в compose-файле.

---

## Finding 2 — HIGH: Socket.io открыт (`origin:"*"`) без защиты

**Где:** `server.js` — `new Server(server, { cors: { origin: "*", ... } })`.

Любой сайт/скрипт может открыть WebSocket-соединение. Нет проверки initData на
сокет-событиях (ставки, кэшаут) — есть риск автоматизации игры (бот-ставки,
подбор тайминга) и флуда.

**Фикс:**
1. Ограничить `origin` конкретным доменом Mini App (или убрать CORS, клиент в
   Telegram WebView шлёт свой `Origin`).
2. Аутентифицировать каждое сокет-соединение через initData (мидлварь), не
   только HTTP-запросы.
3. Рейт-лимит на события (ставки/клики) на пользователя.

---

## Finding 3 — MEDIUM: mock-аутентификация в non-production

**Где:** `server.js` / `src/lib/auth.ts` —
`if (NODE_ENV !== 'production' && (!initData || initData.startsWith('mock')))`.

Если по ошибке запустить `NODE_ENV=development`, любой запрос с
`initData=mock…` проходит как юзер `123456789`. Не критично в проде, но опасно
при деплойных скриптах, забывающих `NODE_ENV`.

**Фикс:** mock только при явном флаге `ALLOW_MOCK_AUTH=true`, и он не должен
включаться при `NODE_ENV=production` ни при каких условиях.

---

## Finding 4 — MEDIUM: доверие клиентскому состоянию экономики

**Где:** `src/lib/GameContext.tsx`, `page.tsx` (энергия/баланс/ставки).

Баланс, энергия, апгрейды и задания частично живут на клиенте. Если сервер
принимает значения без пересчёта — можно накрутить баланс/энергию через
редактор devtools.

**Фикс:** сервер — единственный источник правды для balance/energy;
клиент шлёт только действия (клик, кэшаут), сервер пересчитывает и
возвращает состояние; серверная валидация ставок.

---

## Finding 5 — MEDIUM: нет тестов и входной валидации

**Где:** весь репозиторий (0 тестов).

Нет ни юнитов, ни интеграционных тестов auth/db/сокетов. POST-поля (если есть
API) не проходят через схему (в отличие от nova-wallet, где Zod).

**Фикс:** pytest-подобные юнит-тесты (Node `node:test`/vitest) на:
initData auth, бот-broadcast gate, действия с балансом, краш-игру.

---

## Finding 6 — LOW: broadcast-состояние в одной строке

**Где:** `server.js` — таблица `state`, ключ `admin_broadcast_state`.

Один «черновик» на всех; нет очереди, повторов, дедупликации, таймаута ожидания.

**Фикс:** таблица `broadcasts` (id, admin, text/photo, status, created_at);
поллинг по статусу.

---

## Finding 7 — LOW: мониторинг и логи

Только `console.log`/`console.error`. Нет структурированных логов, метрик,
алертов.

**Фикс:** структурированный логгер (JSON), счётчики ошибок, health-check с
метриками БД/сокетов.

---

## Что держит (проверено по коду)

| Контроль | Где | Статус |
|---|---|---|
| initData HMAC-SHA256 валидация | `src/lib/auth.ts`, `server.js` | ✓ |
| Бот принимает сообщения только от ADMIN_ID | `server.js` | ✓ |
| SQLite WAL + busy_timeout | `db.ts` / `server.js` | ✓ |
| Удаление вебхука перед polling | `server.js` | ✓ |
| `.env` в .gitignore (токен не в репо) | `.gitignore` | ✓ |

---

## После закрытия (верификация)

1. Юнит-тесты auth/сокетов/баланса — зелёные.
2. Сокет-соединение без валидного initData → отклонено.
3. Изменение баланса через devtools не проходит (сервер пересчитывает).
4. Broadcast требует пароль/роль, все admin-действия пишутся в лог.
