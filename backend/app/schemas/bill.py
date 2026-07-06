from pydantic import BaseModel
from datetime import date
from app.models.bill import BillRecurrence, BillStatus
from typing import Optional


class BillBase(BaseModel):
    name: str
    due_day_of_month: int
    due_date: Optional[date] = None
    bill_month: Optional[str] = None          # "YYYY-MM"
    estimated_amount: float
    recurrence: BillRecurrence
    book_id: int
    category_id: Optional[int] = None


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    name: Optional[str] = None
    due_day_of_month: Optional[int] = None
    due_date: Optional[date] = None
    bill_month: Optional[str] = None
    estimated_amount: Optional[float] = None
    recurrence: Optional[BillRecurrence] = None
    category_id: Optional[int] = None
    status: Optional[BillStatus] = None


class Bill(BillBase):
    id: int
    status: BillStatus
    linked_transaction_id: Optional[int] = None

    class Config:
        from_attributes = True


class BillPay(BaseModel):
    """Payload for the pay endpoint."""
    account_id: int
    amount: Optional[float] = None          # override if different from estimated
    description: Optional[str] = None
    paid_on: Optional[date] = None          # defaults to today
