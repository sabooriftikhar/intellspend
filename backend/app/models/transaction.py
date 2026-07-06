from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum as SAEnum, Date
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class TransactionKind(str, enum.Enum):
    income = "income"
    expense = "expense"
    transfer = "transfer"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    account_id = Column(Integer, ForeignKey("accounts.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    kind = Column(SAEnum(TransactionKind))
    amount = Column(Float)
    currency = Column(String)
    description = Column(String)
    occurred_on = Column(Date)
    transfer_to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)

    book = relationship("Book", back_populates="transactions")
    account = relationship("Account", back_populates="transactions", foreign_keys=[account_id])
    transfer_to_account = relationship("Account", foreign_keys=[transfer_to_account_id])
    category = relationship("Category")
