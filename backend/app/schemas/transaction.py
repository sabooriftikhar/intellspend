from pydantic import BaseModel
from datetime import date
from app.models.transaction import TransactionKind

class TransactionBase(BaseModel):
    book_id: int
    account_id: int
    category_id: int | None = None
    kind: TransactionKind
    amount: float
    currency: str
    description: str
    occurred_on: date
    transfer_to_account_id: int | None = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    book_id: int | None = None
    account_id: int | None = None
    category_id: int | None = None
    kind: TransactionKind | None = None
    amount: float | None = None
    currency: str | None = None
    description: str | None = None
    occurred_on: date | None = None
    transfer_to_account_id: int | None = None

class Transaction(TransactionBase):
    id: int

    class Config:
        from_attributes = True
