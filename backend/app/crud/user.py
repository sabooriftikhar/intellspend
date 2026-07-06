from sqlalchemy.orm import Session
from app import schemas
from app.models import user as user_model
from app.core.security import get_password_hash, verify_password


def get_user(db: Session, user_id: int):
    return db.query(user_model.User).filter(user_model.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(user_model.User).filter(user_model.User.email == email).first()


def create_user(db: Session, user: schemas.user.UserCreate):
    db_user = user_model.User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def update_user(db: Session, user_id: int, data: schemas.user.UserUpdate):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    if data.name is not None:
        db_user.name = data.name.strip() or None
    if data.email is not None:
        db_user.email = data.email.strip()
    db.commit()
    db.refresh(db_user)
    return db_user


def change_password(
    db: Session,
    user_id: int,
    current_password: str,
    new_password: str,
) -> tuple[bool, str]:
    """Returns (success, error_message)."""
    db_user = get_user(db, user_id)
    if not db_user:
        return False, "User not found"
    if not verify_password(current_password, db_user.hashed_password):
        return False, "Current password is incorrect"
    if len(new_password) < 8:
        return False, "New password must be at least 8 characters"
    db_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return True, ""
