from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app import crud, schemas
from app.api.endpoints import users
from app.db.session import get_db
from app.models.transaction import TransactionKind

router = APIRouter()

@router.post("/", response_model=schemas.transaction.Transaction)
def create_transaction(
    transaction: schemas.transaction.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    book = crud.book.get_book(db, book_id=transaction.book_id, user_id=current_user.id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    account = crud.account.get_account(db, account_id=transaction.account_id, user_id=current_user.id)
    if not account or account.book_id != book.id:
        raise HTTPException(status_code=404, detail="Account not found in this book")

    if transaction.category_id:
        category = crud.category.get_category(db, category_id=transaction.category_id, user_id=current_user.id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if category.book_id is not None and category.book_id != book.id:
            raise HTTPException(status_code=400, detail="Category does not belong to this book")

    if transaction.kind == TransactionKind.transfer:
        if not transaction.transfer_to_account_id:
            raise HTTPException(status_code=400, detail="Transfer must have a destination account")
        transfer_to = crud.account.get_account(db, account_id=transaction.transfer_to_account_id, user_id=current_user.id)
        if not transfer_to or transfer_to.book_id != book.id:
            raise HTTPException(status_code=404, detail="Destination account not found in this book")

    return crud.transaction.create_transaction(db=db, transaction=transaction, user_id=current_user.id)

@router.get("/", response_model=List[schemas.transaction.Transaction])
def read_transactions(
    book_id: int | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    return crud.transaction.get_transactions(
        db,
        user_id=current_user.id,
        book_id=book_id,
        account_id=account_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=skip,
        limit=limit,
    )

@router.get("/{transaction_id}", response_model=schemas.transaction.Transaction)
def read_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_transaction = crud.transaction.get_transaction(db, transaction_id=transaction_id, user_id=current_user.id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction

@router.put("/{transaction_id}", response_model=schemas.transaction.Transaction)
def update_transaction(
    transaction_id: int,
    transaction: schemas.transaction.TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_transaction = crud.transaction.update_transaction(db, transaction_id=transaction_id, transaction=transaction, user_id=current_user.id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction

@router.delete("/{transaction_id}", response_model=schemas.transaction.Transaction)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_transaction = crud.transaction.delete_transaction(db, transaction_id=transaction_id, user_id=current_user.id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction
