from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    """Update display name and/or email."""
    name: Optional[str] = None
    email: Optional[str] = None


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str


class User(UserBase):
    id: int
    name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
