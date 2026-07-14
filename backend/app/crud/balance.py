from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import account as account_model
from app.models import transaction as transaction_model
from app.models.book import Book
from app.models.transaction import TransactionKind


def get_account_balance(db: Session, account_id: int, user_id: int, book_id: int | None = None):
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

    if book_id is not None and not any(book.id == book_id for book in account.books):
        return None

    income_filters = [
        transaction_model.Transaction.account_id == account_id,
        transaction_model.Transaction.kind == TransactionKind.income,
    ]
    expense_filters = [
        transaction_model.Transaction.account_id == account_id,
        transaction_model.Transaction.kind == TransactionKind.expense,
    ]
    transfers_out_filters = [
        transaction_model.Transaction.account_id == account_id,
        transaction_model.Transaction.kind == TransactionKind.transfer,
    ]
    transfers_in_filters = [
        transaction_model.Transaction.transfer_to_account_id == account_id,
        transaction_model.Transaction.kind == TransactionKind.transfer,
    ]

    if book_id is not None:
        book_filter = transaction_model.Transaction.book_id == book_id
        income_filters.append(book_filter)
        expense_filters.append(book_filter)
        transfers_out_filters.append(book_filter)
        transfers_in_filters.append(book_filter)

    income = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(*income_filters)
        .scalar()
        or 0.0
    )

    expense = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(*expense_filters)
        .scalar()
        or 0.0
    )

    transfers_in = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(*transfers_in_filters)
        .scalar()
        or 0.0
    )

    transfers_out = (
        db.query(func.sum(transaction_model.Transaction.amount))
        .filter(*transfers_out_filters)
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
