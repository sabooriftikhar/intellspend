from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import account as account_model
from app.models import transaction as transaction_model
from app.models.book import Book
from app.models.transaction import TransactionKind


def get_account_balance(db: Session, account_id: int, user_id: int):
    account = (
        db.query(account_model.Account)
        .filter(
            account_model.Account.id == account_id,
            account_model.Account.user_id == user_id,
        )
        .first()
    )
    if not account:
        return None

    income = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(
            transaction_model.Transaction.account_id == account_id,
            transaction_model.Transaction.kind == TransactionKind.income,
        )
        .scalar()
        or 0.0
    )

    expense = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(
            transaction_model.Transaction.account_id == account_id,
            transaction_model.Transaction.kind == TransactionKind.expense,
        )
        .scalar()
        or 0.0
    )

    transfers_in = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(
            transaction_model.Transaction.transfer_to_account_id == account_id,
            transaction_model.Transaction.kind == TransactionKind.transfer,
        )
        .scalar()
        or 0.0
    )

    transfers_out = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(
            transaction_model.Transaction.account_id == account_id,
            transaction_model.Transaction.kind == TransactionKind.transfer,
        )
        .scalar()
        or 0.0
    )

    balance = account.opening_balance + income - expense + transfers_in - transfers_out
    return {"balance": round(balance, 2), "currency": account.currency}


def get_book_summary(db: Session, book_id: int, user_id: int):
    book = (
        db.query(Book)
        .filter(Book.id == book_id, Book.user_id == user_id)
        .first()
    )
    if not book:
        return None

    total_income = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(
            transaction_model.Transaction.book_id == book_id,
            transaction_model.Transaction.kind == TransactionKind.income,
        )
        .scalar()
        or 0.0
    )

    total_expense = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(
            transaction_model.Transaction.book_id == book_id,
            transaction_model.Transaction.kind == TransactionKind.expense,
        )
        .scalar()
        or 0.0
    )

    return {
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_flow": round(total_income - total_expense, 2),
        "currency": "USD",
    }
