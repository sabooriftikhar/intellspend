"""
Builds the financial context string that is injected as the system prompt
for every AI chat request. This is always built fresh — never replayed from
history — so the advisor always has current numbers.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.account import Account
from app.models.book import Book
from app.models.transaction import Transaction, TransactionKind
from app.models.bill import Bill, BillStatus
from app.models.category import Category
from app.crud.balance import get_account_balance


def _month_range(offset: int = 0):
    """Return (first, last) date of current month + offset months."""
    today = date.today()
    # move to first of target month
    month = today.month + offset
    year = today.year
    while month > 12:
        month -= 12
        year += 1
    while month < 1:
        month += 12
        year -= 1
    first = date(year, month, 1)
    # last day: first of next month minus 1 day
    if month == 12:
        last = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)
    return first, last


def build_context(db: Session, user_id: int) -> str:
    today = date.today()
    month_start, month_end = _month_range(0)
    prev_start, prev_end = _month_range(-1)

    # ── 1. Books ──────────────────────────────────────────────
    books = db.query(Book).filter(Book.user_id == user_id).all()
    if not books:
        return (
            "The user has no books set up yet. "
            "Guide them to create a book first before asking financial questions."
        )

    # ── 2. Accounts & balances ────────────────────────────────
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    account_lines = []
    total_assets = 0.0
    total_debt = 0.0
    for acc in accounts:
        bal_data = get_account_balance(db, acc.id, user_id)
        bal = bal_data["balance"] if bal_data else acc.opening_balance
        currency = acc.currency
        if acc.type.value == "credit_card":
            owed = abs(bal) if bal < 0 else 0
            total_debt += owed
            limit_str = f", limit {acc.credit_limit} {currency}" if acc.credit_limit else ""
            due_str = f", due day {acc.due_day}" if acc.due_day else ""
            account_lines.append(
                f"  • [{acc.type.value}] {acc.name}: balance {bal:.2f} {currency}"
                f"{limit_str}{due_str}"
            )
        else:
            total_assets += max(bal, 0)
            account_lines.append(
                f"  • [{acc.type.value}] {acc.name}: balance {bal:.2f} {currency}"
            )

    # ── 3. This month transactions ────────────────────────────
    this_month_tx = (
        db.query(Transaction)
        .join(Transaction.book)
        .filter(
            Book.user_id == user_id,
            Transaction.occurred_on >= month_start,
            Transaction.occurred_on <= month_end,
        )
        .all()
    )

    this_income = sum(t.amount for t in this_month_tx if t.kind == TransactionKind.income)
    this_expense = sum(t.amount for t in this_month_tx if t.kind == TransactionKind.expense)
    this_net = this_income - this_expense

    # ── 4. Previous month totals ──────────────────────────────
    prev_tx = (
        db.query(Transaction)
        .join(Transaction.book)
        .filter(
            Book.user_id == user_id,
            Transaction.occurred_on >= prev_start,
            Transaction.occurred_on <= prev_end,
        )
        .all()
    )
    prev_income = sum(t.amount for t in prev_tx if t.kind == TransactionKind.income)
    prev_expense = sum(t.amount for t in prev_tx if t.kind == TransactionKind.expense)

    # ── 5. Category breakdown (this month, top 8 expense) ────
    cat_map: dict[int, str] = {
        c.id: c.name
        for c in db.query(Category).all()
    }
    cat_totals: dict[str, float] = {}
    for t in this_month_tx:
        if t.kind == TransactionKind.expense and t.category_id:
            name = cat_map.get(t.category_id, "Uncategorised")
            cat_totals[name] = cat_totals.get(name, 0) + t.amount

    top_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)[:8]
    cat_lines = [f"  • {name}: {amt:.2f}" for name, amt in top_cats]

    # ── 6. Last 20 transactions ───────────────────────────────
    recent_tx = (
        db.query(Transaction)
        .join(Transaction.book)
        .filter(Book.user_id == user_id)
        .order_by(Transaction.occurred_on.desc())
        .limit(20)
        .all()
    )
    tx_lines = []
    for t in recent_tx:
        cat = cat_map.get(t.category_id, "") if t.category_id else ""
        cat_str = f" [{cat}]" if cat else ""
        tx_lines.append(
            f"  • {t.occurred_on} | {t.kind.value:8} | {t.amount:>10.2f} {t.currency}"
            f" | {t.description}{cat_str}"
        )

    # ── 7. Pending bills ──────────────────────────────────────
    pending_bills = (
        db.query(Bill)
        .join(Bill.book)
        .filter(Book.user_id == user_id, Bill.status == BillStatus.pending)
        .order_by(Bill.due_day_of_month)
        .all()
    )
    bill_lines = []
    for b in pending_bills:
        cat = cat_map.get(b.category_id, "") if b.category_id else ""
        cat_str = f" [{cat}]" if cat else ""
        month_str = f" ({b.bill_month})" if b.bill_month else ""
        bill_lines.append(
            f"  • {b.name}{month_str}: ~{b.estimated_amount:.2f}, "
            f"due {b.due_day_of_month}th, {b.recurrence.value}{cat_str}"
        )

    # ── Assemble prompt ───────────────────────────────────────
    savings_rate = (this_net / this_income * 100) if this_income > 0 else 0

    context = f"""You are IntellSpend AI — a sharp, friendly personal finance advisor with full access to the user's live financial data. Answer questions accurately using the data below. Be concise but thorough. Use bullet points for lists. Give actionable advice. Never fabricate numbers.

TODAY: {today.strftime("%B %d, %Y")}

═══ BOOKS ═══
{chr(10).join(f"  • {b.name}" + (f" — {b.description}" if b.description else "") for b in books)}

═══ ACCOUNTS & BALANCES ═══
{chr(10).join(account_lines) if account_lines else "  No accounts yet."}
  Net assets: {total_assets:.2f} | Total credit debt: {total_debt:.2f}

═══ THIS MONTH ({month_start.strftime("%b %Y")}) ═══
  Income:   {this_income:>10.2f}
  Expenses: {this_expense:>10.2f}
  Net:      {this_net:>10.2f}
  Savings rate: {savings_rate:.1f}%

═══ LAST MONTH ({prev_start.strftime("%b %Y")}) ═══
  Income:   {prev_income:>10.2f}
  Expenses: {prev_expense:>10.2f}
  Net:      {(prev_income - prev_expense):>10.2f}

═══ THIS MONTH SPENDING BY CATEGORY ═══
{chr(10).join(cat_lines) if cat_lines else "  No categorised expenses yet."}

═══ LAST 20 TRANSACTIONS ═══
{chr(10).join(tx_lines) if tx_lines else "  No transactions yet."}

═══ PENDING BILLS ═══
{chr(10).join(bill_lines) if bill_lines else "  No pending bills."}

Answer the user's question using this data. If asked about something not in the data, say so clearly. Format currency with 2 decimal places."""

    return context
