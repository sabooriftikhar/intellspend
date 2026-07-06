from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import crud, schemas
from app.api.endpoints import users
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=schemas.book.Book)
def create_book(
    book: schemas.book.BookCreate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    return crud.book.create_book(db=db, book=book, user_id=current_user.id)

@router.get("/", response_model=List[schemas.book.Book])
def read_books(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    return crud.book.get_books(db, user_id=current_user.id, skip=skip, limit=limit)

@router.get("/{book_id}", response_model=schemas.book.Book)
def read_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_book = crud.book.get_book(db, book_id=book_id, user_id=current_user.id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return db_book

@router.get("/{book_id}/summary", response_model=schemas.balance.BookSummary)
def get_book_summary(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    summary_data = crud.balance.get_book_summary(db, book_id=book_id, user_id=current_user.id)
    if summary_data is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return summary_data

@router.put("/{book_id}", response_model=schemas.book.Book)
def update_book(
    book_id: int,
    book: schemas.book.BookUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_book = crud.book.update_book(db, book_id=book_id, book=book, user_id=current_user.id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return db_book

@router.delete("/{book_id}", response_model=schemas.book.Book)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_book = crud.book.delete_book(db, book_id=book_id, user_id=current_user.id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return db_book
