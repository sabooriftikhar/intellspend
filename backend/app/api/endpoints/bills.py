from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import crud, schemas
from app.api.endpoints import users
from app.db.session import get_db
from app.models.bill import BillStatus
from app.schemas.bill import Bill, BillCreate, BillUpdate, BillPay

router = APIRouter()


@router.get("/", response_model=List[Bill])
def read_bills(
    book_id: Optional[int] = None,
    status: Optional[BillStatus] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    return crud.bill.get_bills(
        db, user_id=current_user.id, book_id=book_id, status=status,
        skip=skip, limit=limit,
    )


@router.post("/", response_model=Bill)
def create_bill(
    bill: BillCreate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_bill = crud.bill.create_bill(db, bill=bill, user_id=current_user.id)
    if db_bill is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return db_bill


@router.get("/{bill_id}", response_model=Bill)
def read_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_bill = crud.bill.get_bill(db, bill_id=bill_id, user_id=current_user.id)
    if db_bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return db_bill


@router.put("/{bill_id}", response_model=Bill)
def update_bill(
    bill_id: int,
    bill: BillUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_bill = crud.bill.update_bill(db, bill_id=bill_id, bill=bill, user_id=current_user.id)
    if db_bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return db_bill


@router.delete("/{bill_id}", response_model=Bill)
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_bill = crud.bill.delete_bill(db, bill_id=bill_id, user_id=current_user.id)
    if db_bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return db_bill


@router.post("/{bill_id}/pay", response_model=Bill)
def pay_bill(
    bill_id: int,
    payload: BillPay,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_bill = crud.bill.pay_bill(
        db,
        bill_id=bill_id,
        user_id=current_user.id,
        account_id=payload.account_id,
        amount=payload.amount,
        description=payload.description,
        paid_on=payload.paid_on,
    )
    if db_bill is None:
        raise HTTPException(status_code=404, detail="Bill or account not found")
    return db_bill
