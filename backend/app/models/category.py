from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class CategoryKind(str, enum.Enum):
    income = "income"
    expense = "expense"

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True) # Nullable for global categories
    name = Column(String, index=True)
    kind = Column(SAEnum(CategoryKind))
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)

    book = relationship("Book", back_populates="categories")
