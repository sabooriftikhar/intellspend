from pydantic import BaseModel

class BookBase(BaseModel):
    name: str
    description: str | None = None

class BookCreate(BookBase):
    pass

class BookUpdate(BookBase):
    pass

class Book(BookBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
