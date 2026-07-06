from pydantic import BaseModel
from app.models.account import AccountType

class AccountBase(BaseModel):
    name: str
    type: AccountType
    currency: str
    opening_balance: float = 0.0
    credit_limit: float | None = None
    statement_day: int | None = None
    due_day: int | None = None
    book_ids: list[int]

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    currency: str | None = None
    opening_balance: float | None = None
    credit_limit: float | None = None
    statement_day: int | None = None
    due_day: int | None = None
    book_ids: list[int] | None = None

class Account(AccountBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
