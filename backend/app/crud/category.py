from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import category as category_model
from app.models.book import Book
from app.schemas import category as category_schema


def get_category(db: Session, category_id: int, user_id: int):
    return (
        db.query(category_model.Category)
        .outerjoin(category_model.Category.book)
        .filter(
            category_model.Category.id == category_id,
            or_(
                category_model.Category.book_id == None,
                Book.user_id == user_id,
            ),
        )
        .first()
    )


def get_categories(
    db: Session,
    user_id: int,
    book_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = (
        db.query(category_model.Category)
        .outerjoin(category_model.Category.book)
        .filter(
            or_(
                category_model.Category.book_id == None,
                Book.user_id == user_id,
            )
        )
    )
    if book_id:
        query = query.filter(category_model.Category.book_id == book_id)

    return query.offset(skip).limit(limit).all()


def create_category(
    db: Session, category: category_schema.CategoryCreate, user_id: int
):
    # If book_id is provided, ensure the book belongs to this user
    if category.book_id:
        book = (
            db.query(Book)
            .filter(Book.id == category.book_id, Book.user_id == user_id)
            .first()
        )
        if not book:
            return None

    db_category = category_model.Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(
    db: Session,
    category_id: int,
    category: category_schema.CategoryUpdate,
    user_id: int,
):
    db_category = get_category(db, category_id, user_id)
    if db_category:
        for key, value in category.dict(exclude_unset=True).items():
            setattr(db_category, key, value)
        db.commit()
        db.refresh(db_category)
    return db_category


def delete_category(db: Session, category_id: int, user_id: int):
    db_category = get_category(db, category_id, user_id)
    if db_category:
        db.delete(db_category)
        db.commit()
    return db_category
