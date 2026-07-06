from sqlalchemy.orm import Session
from app.models import book as book_model
from app.schemas import book as book_schema

def get_book(db: Session, book_id: int, user_id: int):
    return db.query(book_model.Book).filter(book_model.Book.id == book_id, book_model.Book.user_id == user_id).first()

def get_books(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(book_model.Book).filter(book_model.Book.user_id == user_id).offset(skip).limit(limit).all()

def create_book(db: Session, book: book_schema.BookCreate, user_id: int):
    db_book = book_model.Book(**book.dict(), user_id=user_id)
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

def update_book(db: Session, book_id: int, book: book_schema.BookUpdate, user_id: int):
    db_book = get_book(db, book_id, user_id)
    if db_book:
        for key, value in book.dict(exclude_unset=True).items():
            setattr(db_book, key, value)
        db.commit()
        db.refresh(db_book)
    return db_book

def delete_book(db: Session, book_id: int, user_id: int):
    db_book = get_book(db, book_id, user_id)
    if db_book:
        db.delete(db_book)
        db.commit()
    return db_book
