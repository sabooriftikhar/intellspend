from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum as SAEnum, Date
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class BillRecurrence(str, enum.Enum):
    monthly = "monthly"
    once = "once"


class BillStatus(str, enum.Enum):
    pending = "pending"
    done = "done"


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String, nullable=False)
    due_day_of_month = Column(Integer, nullable=False)   # day 1-31
    due_date = Column(Date, nullable=True)               # full due date for this cycle
    bill_month = Column(String, nullable=True)           # e.g. "2026-06" — which month
    estimated_amount = Column(Float, nullable=False)
    recurrence = Column(SAEnum(BillRecurrence), nullable=False)
    status = Column(SAEnum(BillStatus), default=BillStatus.pending)
    linked_transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)

    book = relationship("Book", back_populates="bills")
    category = relationship("Category")
    linked_transaction = relationship("Transaction", foreign_keys=[linked_transaction_id])
