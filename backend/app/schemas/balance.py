from pydantic import BaseModel

class AccountBalance(BaseModel):
    balance: float
    currency: str

class BookSummary(BaseModel):
    total_income: float
    total_expense: float
    net_flow: float
    currency: str # Assuming one currency per book for simplicity in summary
