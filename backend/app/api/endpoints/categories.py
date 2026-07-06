from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import crud, schemas
from app.api.endpoints import users
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=schemas.category.Category)
def create_category(
    category: schemas.category.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_category = crud.category.create_category(db=db, category=category, user_id=current_user.id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Book not found for this user")
    return db_category

@router.get("/", response_model=List[schemas.category.Category])
def read_categories(
    book_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    return crud.category.get_categories(db, user_id=current_user.id, book_id=book_id, skip=skip, limit=limit)

@router.get("/{category_id}", response_model=schemas.category.Category)
def read_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_category = crud.category.get_category(db, category_id=category_id, user_id=current_user.id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.put("/{category_id}", response_model=schemas.category.Category)
def update_category(
    category_id: int,
    category: schemas.category.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_category = crud.category.update_category(db, category_id=category_id, category=category, user_id=current_user.id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.delete("/{category_id}", response_model=schemas.category.Category)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.user.User = Depends(users.get_current_user),
):
    db_category = crud.category.delete_category(db, category_id=category_id, user_id=current_user.id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category
