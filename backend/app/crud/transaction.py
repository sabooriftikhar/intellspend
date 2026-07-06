from sqlalchemy.orm import Session
from datetime import date

from app.models import transaction as transaction_model
from app.models.book import Book
from app.schemas import transaction as transaction_schema


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

    return query.order_by(transaction_model.Transaction.occurred_on.desc()).offset(skip).limit(limit).all()


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
