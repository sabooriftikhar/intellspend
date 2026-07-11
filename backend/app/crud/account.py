from sqlalchemy.orm import Session, joinedload
from app.models import account as account_model
from app.models.book import Book
from app.schemas import account as account_schema
from app.models.transaction import Transaction

def _load_books(db: Session, book_ids: list[int], user_id: int) -> list[Book]:
    unique_ids = list(dict.fromkeys(book_ids))
    books = (
        db.query(Book)
        .filter(Book.id.in_(unique_ids), Book.user_id == user_id)
        .all()
    )
    if len(books) != len(unique_ids):
        return []
    return books


def to_schema(account: account_model.Account) -> account_schema.Account:
    return account_schema.Account(
        id=account.id,
        user_id=account.user_id,
        name=account.name,
        type=account.type,
        currency=account.currency,
        opening_balance=account.opening_balance,
        credit_limit=account.credit_limit,
        statement_day=account.statement_day,
        due_day=account.due_day,
        book_ids=[b.id for b in account.books],
    )


def get_account(db: Session, account_id: int, user_id: int):
    return (
        db.query(account_model.Account)
        .options(joinedload(account_model.Account.books))
        .filter(
            account_model.Account.id == account_id,
            account_model.Account.user_id == user_id,
        )
        .first()
    )


def get_accounts(db: Session, user_id: int, book_id: int | None = None, skip: int = 0, limit: int = 100):
    query = (
        db.query(account_model.Account)
        .options(joinedload(account_model.Account.books))
        .filter(account_model.Account.user_id == user_id)
    )
    if book_id:
        query = query.filter(account_model.Account.books.any(Book.id == book_id))
    return query.offset(skip).limit(limit).all()


def account_in_book(account: account_model.Account, book_id: int) -> bool:
    return any(b.id == book_id for b in account.books)


def create_account(db: Session, account: account_schema.AccountCreate, user_id: int):
    books = _load_books(db, account.book_ids, user_id)
    if not books:
        return None

    data = account.dict(exclude={"book_ids"})
    db_account = account_model.Account(**data, user_id=user_id)
    db_account.books = books
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return get_account(db, db_account.id, user_id)


def update_account(db: Session, account_id: int, account: account_schema.AccountUpdate, user_id: int):
    db_account = get_account(db, account_id, user_id)
    if not db_account:
        return None

    updates = account.dict(exclude_unset=True)
    book_ids = updates.pop("book_ids", None)

    if book_ids is not None:
        books = _load_books(db, book_ids, user_id)
        if not books:
            return None
        db_account.books = books

    for key, value in updates.items():
        setattr(db_account, key, value)

    db.commit()
    return get_account(db, account_id, user_id)




def delete_account(db: Session, account_id: int, user_id: int):
    db_account = get_account(db, account_id, user_id)

    if not db_account:
        return None

    has_transactions = (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id)
        .first()
    )

    if has_transactions:
        raise ValueError("Cannot delete an account that has transactions.")

    db.delete(db_account)
    db.commit()
    return db_account
