from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import sqlalchemy as sa
from app.db.session import Base

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    description = Column(String)
    
    user = relationship("User", back_populates="books")
    accounts = relationship("Account", back_populates="book")
    transactions = relationship("Transaction", back_populates="book")
    bills = relationship("Bill", back_populates="book")
    categories = relationship("Category", back_populates="book")
