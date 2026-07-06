# Personal Finance Tracker — Build Plan

**Stack:** Next.js (frontend) + FastAPI (backend) + Neon Postgres (database)
**Hosting:** Vercel (frontend, free) + Render (backend, free) + Neon (database, free)
**AI Advisor:** OpenRouter `openai/gpt-4o-mini` (pay-per-token, ~cents/month at personal scale)
**Scope locked in:** single user, multiple "books" (House / Sister / Personal-Other), web app only for now (mobile-responsive), no native app yet.

---

## 0. Architecture Overview

```
┌─────────────────────┐       HTTPS/JSON        ┌──────────────────────┐
│   Next.js Frontend   │ ───────────────────────▶│   FastAPI Backend     │
│   (Vercel, free)     │ ◀───────────────────────│   (Render, free)      │
│  - Dashboard, tables │      JWT in headers      │  - Auth (JWT)         │
│  - Book switcher     │                          │  - CRUD routes        │
│  - Chat widget       │                          │  - Balance calc       │
└──────────────────────┘                          │  - Reminder logic     │
                                                   │  - AI context builder │
                                                   └──────────┬────────────┘
                                                              │ SQLAlchemy
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │  Neon Postgres        │
                                                   │  (free, permanent)    │
                                                   └──────────────────────┘

                                                   ┌──────────────────────┐
                       AI chat requests  ────────▶ │  OpenRouter API       │
                       (with live financial        │  gpt-4o-mini          │
                        context injected)          └──────────────────────┘
```

**Why this split:** Render's free Postgres auto-deletes after 30 days — never use it for real data. Neon's free tier has no expiry, no credit card, and is built for exactly this scale. Render's free web service cold-starts after 15 min idle (~30-60s wake-up) — acceptable for a personal-use app, not for something you'd demo to strangers on demand.

---

## 1. Data Model (core tables)

- **User** — id, email, hashed_password, created_at
- **Book** — id, user_id, name (e.g. "House", "Sister", "Personal"), description
- **Account** — id, user_id, name, type (`bank` / `cash` / `credit_card`), currency, opening_balance, credit_limit (nullable, for cards), statement_day (nullable), due_day (nullable)
- **Category** — id, book_id (nullable = global), name, kind (`income` / `expense`), icon, color
- **Transaction** — id, book_id, account_id, category_id, kind (`income` / `expense` / `transfer`), amount, currency, description, occurred_on, transfer_to_account_id (nullable)
- **Bill** — id, book_id, category_id, name, due_day_of_month, estimated_amount, recurrence (`monthly` / `once`), status (`pending` / `done`), linked_transaction_id (nullable)
- **ChatMessage** — id, user_id, role, content, created_at (chat history, optional — context is rebuilt live each time, this is just for scroll-back)

**Golden rule:** account/book balances are never stored — always `SUM(income) - SUM(expense) ± transfers` computed at query time. This guarantees the dashboard can never drift from the transaction ledger, which is the whole point of replacing Excel.

---

## Phase 0 — Project Setup (½–1 day)

- [ ] Create GitHub repo with two folders: `/backend` (FastAPI) and `/frontend` (Next.js)
- [ ] Sign up: Neon, Render, Vercel, OpenRouter (all free, no card needed except OpenRouter for a small top-up)
- [ ] Create Neon project, copy the Postgres connection string into a `.env` (never commit this)
- [ ] `pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary python-jose passlib pydantic-settings`
- [ ] `npx create-next-app@latest` with TypeScript + Tailwind
- [ ] Confirm both apps run locally and FastAPI can connect to Neon

**Done when:** `GET /health` on FastAPI returns 200, and Next.js dev server loads a blank page.

---

## Phase 1 — Backend Foundations: Auth + DB (1–2 days)

- [ ] SQLAlchemy models for User, Book, Account, Category, Transaction, Bill, ChatMessage
- [ ] Alembic migration setup, first migration applied to Neon
- [ ] `POST /auth/register`, `POST /auth/login` (returns access + refresh JWT), `POST /auth/refresh`
- [ ] Password hashing with passlib/bcrypt
- [ ] Dependency for "current user" used by all protected routes

**Done when:** you can register once, log in, and hit a protected `/me` route with the JWT.

---

## Phase 2 — Books, Accounts, Categories CRUD (1–2 days)

- [ ] Full CRUD for Books (`/books`)
- [ ] Full CRUD for Accounts (`/accounts`) — type, currency, opening balance, credit limit fields
- [ ] Full CRUD for Categories (`/categories`) — scoped to a book or global, with icon/color
- [ ] Seed your real data: House, Sister, Personal books; your actual bank/cash accounts; starter categories (Utilities, Groceries, Fees, etc.)

**Done when:** all three resources support create/read/update/delete via Swagger UI (`/docs`).

---

## Phase 3 — Transactions Engine (2–3 days, the core of the app)

- [ ] `POST /transactions` — book, account, category, amount, currency, description, date, kind
- [ ] Transfer support (moving money between two of your own accounts without it counting as income/expense)
- [ ] `GET /transactions` with filters: by book, account, category, date range, search text
- [ ] Balance endpoint: `GET /accounts/{id}/balance` and `GET /books/{id}/summary` (computed, not stored)
- [ ] Edit/delete transactions (with balance recalculating automatically since nothing is cached)

**Done when:** you can log a real expense from your house sheet and watch the account balance update correctly.

---

## Phase 4 — Frontend Foundations (1–2 days)

- [ ] Auth pages (login/register), JWT stored in httpOnly cookie or memory + refresh flow
- [ ] API client (typed fetch wrapper) pointed at your Render backend URL
- [ ] App shell: sidebar (Books, Accounts, Bills, Chat), top bar with currency/date
- [ ] Book switcher (House / Sister / Personal) that filters everything below it

**Done when:** logging in takes you to an empty dashboard shell that knows which book is active.

---

## Phase 5 — Dashboard UI (3–4 days)

- [ ] **Account cards** — one per bank/cash account, showing current balance, currency, type icon
- [ ] **Credit card section** — separate card style showing balance owed, credit limit, due date, "days until due"
- [ ] **Excel-like transaction table** — sortable, filterable, inline edit, grouped by date, color-coded income/expense (this replaces your Excel sheet directly)
- [ ] **Add transaction modal** — account, category, book, amount, currency, description, date
- [ ] Income vs. expense summary for the current month (simple bar or donut chart)

**Done when:** the dashboard looks and feels like a cleaner version of your current Excel file, live-updating as you add entries.

---

## Phase 6 — Bills & Reminders (1–2 days)

- [ ] CRUD for Bills (electricity on 20th, gas/water on 5th, fees on 10th, installment on 17th, etc.)
- [ ] "Upcoming" widget on dashboard — sorted by next due date, color-flagged if overdue
- [ ] "Mark as done" action — creates a real Transaction and links it back to the Bill, then resets it for next month if recurring
- [ ] (Optional, free) daily check via [cron-job.org](https://cron-job.org) hitting a `/bills/check-due` endpoint, which could later email you via Resend's free tier (100 emails/day) — only add this if in-app reminders aren't enough

**Done when:** adding "Electricity, due 20th, ~Rs 4000" shows up automatically each month and disappears into a transaction once marked paid.

---

## Phase 7 — AI Finance Advisor (2–3 days)

- [ ] Backend service that, on each chat request, queries: account balances, last 30 days of transactions, pending bills, current-month totals per category — and assembles this into a system prompt
- [ ] `POST /chat` — sends user message + assembled context to OpenRouter (`openai/gpt-4o-mini`), returns the reply
- [ ] Store the conversation in ChatMessage for scroll-back (context is always rebuilt fresh, not replayed from history, so it never goes stale)
- [ ] Frontend chat widget (slide-out panel or dedicated page)
- [ ] Set a monthly spend cap in your OpenRouter dashboard so costs can never run away

**Done when:** you can ask "what are my biggest expenses this month" or "can I afford the installment on the 17th" and get an answer grounded in your real numbers.

---

## Phase 8 — Excel Migration + Polish (1–2 days)

- [ ] Build a one-time import script: read your existing Excel sheets, map columns to Account/Category/Transaction, bulk-insert
- [ ] CSV export of any book/date range (so you're never locked in)
- [ ] Multi-currency display: each account keeps its own currency; dashboard shows totals grouped by currency rather than force-converting (avoids needing a live FX API for v1)
- [ ] Responsive pass for mobile browser use
- [ ] Basic input validation/error states everywhere

**Done when:** your real house/sister/other sheets are loaded in and the old Excel file is no longer needed day-to-day.

---

## Phase 9 — Deployment (½–1 day)

- [ ] Push backend to Render as a free Web Service, env vars set (Neon URL, JWT secret, OpenRouter key)
- [ ] Push frontend to Vercel, env var pointing at the Render backend URL
- [ ] Confirm CORS is configured correctly between the two domains
- [ ] Smoke-test the full flow in production: register, add transaction, mark a bill done, chat with advisor

**Done when:** you can open the app from your phone's browser anywhere and use it like a real product.

---

## Phase 10 — Future / Optional (only after the above is solid)

- [ ] PWA manifest + service worker so it installs like an app on your phone (still free, no native build needed)
- [ ] Budgets per category with progress bars
- [ ] Monthly trend charts (income vs. expense over time)
- [ ] Net worth view with optional FX conversion (free tier of exchangerate-api.com)
- [ ] Multi-user support if you ever want your sister/brother to log their own entries directly

---

## Notes / Things to Decide as You Go

- Keep secrets (JWT secret, Neon URL, OpenRouter key) out of git — use `.env` + Render/Vercel environment variable settings.
- Render free tier cold-starts after 15 min idle — if that bugs you later, a $7/mo Starter instance removes it, but isn't needed to get started.
- Neon free tier caps at 0.5GB storage — a personal finance ledger for years of daily transactions is plain text/numbers and will stay well under that for a very long time.
