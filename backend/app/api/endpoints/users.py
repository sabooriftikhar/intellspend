from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.models import user as user_model
from app.db.session import get_db
from app.core.security import get_password_hash
from app.core.config import settings
from fastapi.security import OAuth2PasswordBearer
from jose import jwt

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> user_model.User:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.user.TokenData(email=email)
    except jwt.JWTError:
        raise credentials_exception

    user = crud.user.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


@router.get("/me", response_model=schemas.user.User)
def read_users_me(current_user: user_model.User = Depends(get_current_user)):
    return current_user
