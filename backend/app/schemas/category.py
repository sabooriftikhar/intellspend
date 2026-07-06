from pydantic import BaseModel
from app.models.category import CategoryKind

class CategoryBase(BaseModel):
    name: str
    kind: CategoryKind
    icon: str | None = None
    color: str | None = None
    book_id: int | None = None # Null for global categories

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: str | None = None
    kind: CategoryKind | None = None
    icon: str | None = None
    color: str | None = None

class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True
