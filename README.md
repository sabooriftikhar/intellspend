# IntellSpend

A full-stack personal finance tracker and AI advisor. Manage multiple books (e.g. House, Personal, Family), track bank and credit card accounts, log transactions, monitor bills, and chat with an AI advisor that has live access to your actual financial data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| UI Components | Radix UI, Lucide React, Recharts |
| Backend | FastAPI, Python 3.10+, SQLAlchemy 2, Alembic |
| Database | PostgreSQL (Neon recommended) |
| Auth | JWT (access + refresh tokens), bcrypt password hashing |
| AI Advisor | OpenRouter API (`openai/gpt-4o-mini`) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Features

### Books
- Create multiple books to separate finances (e.g. House, Personal, Sister)
- A global book switcher filters every view — dashboard, transactions, accounts, bills, and chat — to the selected book

### Accounts
- Bank, cash, and credit card account types
- Each account tracks its own currency
- Balances are always computed live from the transaction ledger — never stored, never drift
- Credit card accounts show: balance owed, credit limit, utilisation bar, days until due date

### Transactions
- Income, expense, and transfer types
- Month-by-month view with KPI cards: Cash In, Cash Out, Net, Running Balance
- Credit card charges are excluded from Cash In / Cash Out (they only affect card balance)
- Paying a credit card (bank → card transfer) is correctly counted as a real cash outflow in expense totals
- Full edit and delete support
- Category assignment with quick-add inline

### Credit Card Payments
- Paying a credit card opens a transfer-style modal
- Select the source bank account, edit the amount and date
- Posted as a `transfer` transaction — debits the bank account, reduces the card balance
- Automatically reflected in monthly expense totals and trend charts

### Bills
- Recurring and one-off bills with due day of month
- Upcoming bills widget on the dashboard sorted by next due date
- Mark as paid — creates a linked transaction and resets the bill for next month
- Overdue bills highlighted in red

### AI Finance Advisor
- Chat page with a persistent message thread
- Each request injects live context: account balances, last 30 days of transactions, pending bills, monthly totals per category
- Powered by OpenRouter (`openai/gpt-4o-mini`)
- Context is always rebuilt fresh — never stale, never replays old data

### Dashboard
- Account cards for bank/cash accounts
- Credit card widgets with visual card, utilisation bar, due-date countdown, and pay button
- Monthly income vs. expense bar chart
- 6-month trend chart
- Category spend breakdown
- Wealth overview (net worth across all accounts)
- Recent activity feed
- Upcoming bills section

---

## Project Structure

```
intellspend/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # FastAPI route handlers
│   │   │   ├── auth.py
│   │   │   ├── accounts.py
│   │   │   ├── books.py
│   │   │   ├── categories.py
│   │   │   ├── transactions.py
│   │   │   ├── bills.py
│   │   │   └── chat.py
│   │   ├── core/
│   │   │   ├── config.py      # Pydantic settings
│   │   │   └── security.py    # JWT + bcrypt helpers
│   │   ├── crud/              # DB query logic
│   │   ├── db/                # SQLAlchemy session + base
│   │   ├── models/            # ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── ai_context.py  # Builds live financial context for AI
│   │   │   └── openrouter.py  # OpenRouter API client
│   │   └── main.py
│   ├── alembic/               # Database migrations
│   ├── requirements.txt
│   └── .env                   # Never committed — see setup below
│
└── frontend/
    ├── app/
    │   ├── (auth)/            # Login, register pages
    │   └── (main)/            # Protected app pages
    │       ├── dashboard/
    │       ├── transactions/
    │       ├── accounts/
    │       ├── books/
    │       ├── bills/
    │       ├── categories/
    │       ├── chat/
    │       └── settings/
    ├── components/
    │   ├── dashboard/         # All dashboard widgets and modals
    │   └── ui/                # Shared primitives (Button, Input, Dialog…)
    ├── contexts/              # AuthContext, BookContext, PreferencesContext
    ├── hooks/                 # useDashboardData
    ├── lib/                   # api.ts (Axios), types.ts, format.ts, utils.ts
    └── .env.local             # Never committed — see setup below
```

---

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A PostgreSQL database (Neon free tier works perfectly)
- An OpenRouter API key (for the AI chat feature)

---

### Backend

**1. Create and activate a virtual environment**

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

**3. Create the `.env` file**

Create `backend/.env` with the following keys — do **not** commit this file:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME
SECRET_KEY=your-random-secret-key-at-least-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
OPENROUTER_API_KEY=your-openrouter-api-key
```

**4. Run database migrations**

```bash
alembic upgrade head
```

**5. Start the backend**

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Interactive docs at `http://127.0.0.1:8000/docs`.

---

### Frontend

**1. Install dependencies**

```bash
cd frontend
npm install
```

**2. Create the `.env.local` file**

Create `frontend/.env.local` — do **not** commit this file:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

For production, replace this with your deployed backend URL.

**3. Start the frontend**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Deployment

### Backend → Render

1. Push `backend/` to GitHub
2. Create a new **Web Service** on Render pointing at your repo
3. Set the build command: `pip install -r requirements.txt`
4. Set the start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from your `.env` in the Render dashboard (never use the actual values in the repo)
6. Run `alembic upgrade head` once via Render's shell after first deploy

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import the repo in Vercel
3. Set the environment variable `NEXT_PUBLIC_API_URL` to your Render backend URL
4. Deploy — Vercel auto-detects Next.js and handles the rest

### Database → Neon

Neon's free tier has no expiry and no storage auto-delete. Create a project, copy the connection string, and use it as `DATABASE_URL` in both your local `.env` and Render's environment variables.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Random string used to sign JWTs |
| `ALGORITHM` | JWT signing algorithm (use `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime |
| `OPENROUTER_API_KEY` | API key from openrouter.ai |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend |

---

## Data Model

| Table | Key fields |
|---|---|
| `users` | id, email, hashed_password, name |
| `books` | id, user_id, name, description |
| `accounts` | id, user_id, name, type, currency, opening_balance, credit_limit, statement_day, due_day |
| `categories` | id, book_id (nullable = global), name, kind, icon, color |
| `transactions` | id, book_id, account_id, category_id, kind, amount, currency, description, occurred_on, transfer_to_account_id |
| `bills` | id, book_id, name, due_day_of_month, estimated_amount, recurrence, status, linked_transaction_id |
| `chat_messages` | id, user_id, role, content, created_at |

**Balance rule:** account balances are never stored. Every balance is computed at query time as `opening_balance + SUM(income) - SUM(expense) ± transfers`. This guarantees the UI can never show a stale number.

---

## Key Design Decisions

- **Credit card payments as transfers** — paying a card is a `transfer` from bank → card. The bank account is debited, the card balance is reduced. These transfers are counted as expenses in all Cash Out / monthly totals so real money leaving the bank is always reflected correctly.
- **Book-scoped data** — every transaction, bill, and category belongs to a book. Switching books in the UI filters everything instantly client-side.
- **No FX conversion in v1** — accounts keep their own currency. Dashboard totals are grouped per currency rather than force-converting, avoiding the need for a live exchange rate API.
- **AI context is always live** — the AI advisor never reads chat history to understand your finances. Each message rebuilds the context from the actual database, so the AI always has accurate, current numbers.

---

## License

MIT
