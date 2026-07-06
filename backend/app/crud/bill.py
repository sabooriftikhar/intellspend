from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional

from app.models.bill import Bill, BillStatus, BillRecurrence
from app.models.book import Book
from app.models.account import Account
from app.models.transaction import Transaction, TransactionKind
from app.schemas import bill as bill_schema


# ── Helpers ─────────────────────────────────────────────────────

def _owned_bill(db: Session, bill_id: int, user_id: int) -> Optional[Bill]:
    """Return bill only if it belongs to a book owned by user_id."""
    return (
        db.query(Bill)
        .join(Bill.book)
        .filter(Bill.id == bill_id, Book.user_id == user_id)
        .first()
    )


# ── CRUD ─────────────────────────────────────────────────────────

def get_bills(
    db: Session,
    user_id: int,
    book_id: Optional[int] = None,
    status: Optional[BillStatus] = None,
    skip: int = 0,
    limit: int = 200,
):
    query = (
        db.query(Bill)
        .join(Bill.book)
        .filter(Book.user_id == user_id)
    )
    if book_id:
        query = query.filter(Bill.book_id == book_id)
    if status:
        query = query.filter(Bill.status == status)

    return query.order_by(Bill.due_day_of_month.asc()).offset(skip).limit(limit).all()


def get_bill(db: Session, bill_id: int, user_id: int) -> Optional[Bill]:
    return _owned_bill(db, bill_id, user_id)


def create_bill(db: Session, bill: bill_schema.BillCreate, user_id: int) -> Optional[Bill]:
    # Verify book ownership
    book = db.query(Book).filter(Book.id == bill.book_id, Book.user_id == user_id).first()
    if not book:
        return None

    db_bill = Bill(**bill.dict())
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill


def update_bill(
    db: Session,
    bill_id: int,
    bill: bill_schema.BillUpdate,
    user_id: int,
) -> Optional[Bill]:
    db_bill = _owned_bill(db, bill_id, user_id)
    if not db_bill:
        return None
    for key, value in bill.dict(exclude_unset=True).items():
        setattr(db_bill, key, value)
    db.commit()
    db.refresh(db_bill)
    return db_bill


def delete_bill(db: Session, bill_id: int, user_id: int) -> Optional[Bill]:
    db_bill = _owned_bill(db, bill_id, user_id)
    if not db_bill:
        return None
    db.delete(db_bill)
    db.commit()
    return db_bill


def pay_bill(
    db: Session,
    bill_id: int,
    user_id: int,
    account_id: int,
    amount: Optional[float] = None,
    description: Optional[str] = None,
    paid_on: Optional[date] = None,
) -> Optional[Bill]:
    """
    Mark a bill as paid:
    1. Verify bill + account ownership.
    2. Create an expense Transaction.
    3. Link it to the bill and set status = done.
    4. If monthly, create the NEXT month's bill automatically.
    """
    db_bill = _owned_bill(db, bill_id, user_id)
    if not db_bill:
        return None

    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == user_id,
    ).first()
    if not account:
        return None

    pay_amount = amount if amount is not None else db_bill.estimated_amount
    pay_date = paid_on or date.today()
    pay_desc = description or f"{db_bill.name} payment"

    # Create the expense transaction
    tx = Transaction(
        book_id=db_bill.book_id,
        account_id=account_id,
        category_id=db_bill.category_id,
        kind=TransactionKind.expense,
        amount=pay_amount,
        currency=account.currency,
        description=pay_desc,
        occurred_on=pay_date,
    )
    db.add(tx)
    db.flush()  # get tx.id without full commit

    # Mark bill as done and link transaction
    db_bill.status = BillStatus.done
    db_bill.linked_transaction_id = tx.id
    db.commit()
    db.refresh(db_bill)

    # Auto-create next month's bill for recurring ones
    if db_bill.recurrence == BillRecurrence.monthly:
        if db_bill.bill_month:
            # advance one month
            try:
                y, m = map(int, db_bill.bill_month.split("-"))
                if m == 12:
                    y, m = y + 1, 1
                else:
                    m += 1
                next_month = f"{y:04d}-{m:02d}"
                next_due = date(y, m, min(db_bill.due_day_of_month, 28))
            except (ValueError, TypeError):
                next_month = None
                next_due = None
        else:
            next_month = None
            next_due = None

        next_bill = Bill(
            book_id=db_bill.book_id,
            category_id=db_bill.category_id,
            name=db_bill.name,
            due_day_of_month=db_bill.due_day_of_month,
            due_date=next_due,
            bill_month=next_month,
            estimated_amount=db_bill.estimated_amount,
            recurrence=BillRecurrence.monthly,
            status=BillStatus.pending,
        )
        db.add(next_bill)
        db.commit()

    return db_bill
