from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum as SAEnum, Table
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

account_books = Table(
    "account_books",
    Base.metadata,
    Column("account_id", Integer, ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True),
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
)

class AccountType(str, enum.Enum):
    bank = "bank"
    cash = "cash"
    credit_card = "credit_card"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    type = Column(SAEnum(AccountType))
    currency = Column(String, default="USD")
    opening_balance = Column(Float, default=0.0)
    credit_limit = Column(Float, nullable=True)
    statement_day = Column(Integer, nullable=True)
    due_day = Column(Integer, nullable=True)

    books = relationship("Book", secondary=account_books, back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", foreign_keys="[Transaction.account_id]")
