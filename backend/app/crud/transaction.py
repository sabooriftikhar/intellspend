from sqlalchemy.orm import Session
from datetime import date
from sqlalchemy import func

from app.models import transaction as transaction_model
from app.models.book import Book
from app.models.transaction import TransactionKind
from app.schemas import transaction as transaction_schema


def _base_query(
    db: Session,
    user_id: int,
    book_id: int | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
):
    query = (
        db.query(transaction_model.Transaction)
        .join(transaction_model.Transaction.book)
        .filter(Book.user_id == user_id)
    )

    if book_id:
        query = query.filter(transaction_model.Transaction.book_id == book_id)
    if account_id:
        query = query.filter(transaction_model.Transaction.account_id == account_id)
    if category_id:
        query = query.filter(transaction_model.Transaction.category_id == category_id)
    if start_date:
        query = query.filter(transaction_model.Transaction.occurred_on >= start_date)
    if end_date:
        query = query.filter(transaction_model.Transaction.occurred_on <= end_date)
    if search:
        query = query.filter(
            transaction_model.Transaction.description.ilike(f"%{search}%")
        )
    return query


def get_transaction(db: Session, transaction_id: int, user_id: int):
    return (
        db.query(transaction_model.Transaction)
        .join(transaction_model.Transaction.book)
        .filter(
            transaction_model.Transaction.id == transaction_id,
            Book.user_id == user_id,
        )
        .first()
    )


def get_transactions(
    db: Session,
    user_id: int,
    book_id: int | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = _base_query(
        db, user_id, book_id, account_id, category_id, start_date, end_date, search
    )
    return query.order_by(
        transaction_model.Transaction.occurred_on.desc(),
        transaction_model.Transaction.id.desc(),
    ).offset(skip).limit(limit).all()


def count_transactions(
    db: Session,
    user_id: int,
    book_id: int | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
) -> int:
    query = _base_query(
        db, user_id, book_id, account_id, category_id, start_date, end_date, search
    )
    return query.count()


def summarize_transactions(
    db: Session,
    user_id: int,
    book_id: int | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
) -> transaction_schema.TransactionSummary:
    income = (
        _base_query(db, user_id, book_id, account_id, category_id, start_date, end_date, search)
        .filter(transaction_model.Transaction.kind == TransactionKind.income)
        .with_entities(func.coalesce(func.sum(transaction_model.Transaction.amount), 0.0))
        .scalar()
        or 0.0
    )
    expense = (
        _base_query(db, user_id, book_id, account_id, category_id, start_date, end_date, search)
        .filter(transaction_model.Transaction.kind == TransactionKind.expense)
        .with_entities(func.coalesce(func.sum(transaction_model.Transaction.amount), 0.0))
        .scalar()
        or 0.0
    )
    count = count_transactions(
        db, user_id, book_id, account_id, category_id, start_date, end_date, search
    )

    return transaction_schema.TransactionSummary(
        income=round(float(income), 2),
        expense=round(float(expense), 2),
        net=round(float(income) - float(expense), 2),
        count=count,
    )


def create_transaction(
    db: Session,
    transaction: transaction_schema.TransactionCreate,
    user_id: int,
):
    db_transaction = transaction_model.Transaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


def update_transaction(
    db: Session,
    transaction_id: int,
    transaction: transaction_schema.TransactionUpdate,
    user_id: int,
):
    db_transaction = get_transaction(db, transaction_id, user_id)
    if db_transaction:
        for key, value in transaction.dict(exclude_unset=True).items():
            setattr(db_transaction, key, value)
        db.commit()
        db.refresh(db_transaction)
    return db_transaction


def delete_transaction(db: Session, transaction_id: int, user_id: int):
    db_transaction = get_transaction(db, transaction_id, user_id)
    if db_transaction:
        db.delete(db_transaction)
        db.commit()
    return db_transaction
