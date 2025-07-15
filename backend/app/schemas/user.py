from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    username: str
    email: EmailStr

    @validator('username')
    def username_must_be_valid(cls, v):
        if len(v.strip()) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        return v.strip()


class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_must_be_valid(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

    @validator('username')
    def username_must_be_valid(cls, v):
        if v is not None:
            if len(v.strip()) < 3:
                raise ValueError('Username must be at least 3 characters long')
            if len(v) > 50:
                raise ValueError('Username must be less than 50 characters')
            return v.strip()
        return v

    @validator('password')
    def password_must_be_valid(cls, v):
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True