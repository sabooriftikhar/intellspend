from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class AccountType(str, enum.Enum):
    bank = "bank"
    cash = "cash"
    credit_card = "credit_card"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    name = Column(String, index=True)
    type = Column(SAEnum(AccountType))
    currency = Column(String, default="USD")
    opening_balance = Column(Float, default=0.0)
    credit_limit = Column(Float, nullable=True)
    statement_day = Column(Integer, nullable=True)
    due_day = Column(Integer, nullable=True)

    book = relationship("Book", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", foreign_keys="[Transaction.account_id]")
