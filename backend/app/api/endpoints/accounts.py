from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import crud, schemas
from app.api.endpoints import users
from app.db.session import get_db

router = APIRouter()


@router.post("/", response_model=schemas.account.Account)
def create_account(
    account: schemas.account.AccountCreate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_account = crud.account.create_account(db=db, account=account, user_id=current_user.id)
    if not db_account:
        raise HTTPException(status_code=404, detail="One or more books not found")
    return crud.account.to_schema(db_account)


@router.get("/", response_model=List[schemas.account.Account])
def read_accounts(
    book_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    accounts = crud.account.get_accounts(db, user_id=current_user.id, book_id=book_id, skip=skip, limit=limit)
    return [crud.account.to_schema(a) for a in accounts]


@router.get("/{account_id}", response_model=schemas.account.Account)
def read_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_account = crud.account.get_account(db, account_id=account_id, user_id=current_user.id)
    if db_account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return crud.account.to_schema(db_account)


@router.get("/{account_id}/balance", response_model=schemas.balance.AccountBalance)
def get_account_balance(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    balance_data = crud.balance.get_account_balance(db, account_id=account_id, user_id=current_user.id)
    if balance_data is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return balance_data


@router.put("/{account_id}", response_model=schemas.account.Account)
def update_account(
    account_id: int,
    account: schemas.account.AccountUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_account = crud.account.update_account(db, account_id=account_id, account=account, user_id=current_user.id)
    if db_account is None:
        raise HTTPException(status_code=404, detail="Account or book not found")
    return crud.account.to_schema(db_account)


@router.delete("/{account_id}", response_model=schemas.account.Account)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_account = crud.account.get_account(db, account_id=account_id, user_id=current_user.id)
    if db_account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    schema = crud.account.to_schema(db_account)
    crud.account.delete_account(db, account_id=account_id, user_id=current_user.id)
    return schema
