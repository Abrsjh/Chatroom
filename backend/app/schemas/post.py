from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional


class PostBase(BaseModel):
    title: str
    content: str

    @validator('title')
    def title_must_be_valid(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Post title cannot be empty')
        if len(v) > 200:
            raise ValueError('Post title must be less than 200 characters')
        return v.strip()

    @validator('content')
    def content_must_be_valid(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Post content cannot be empty')
        return v.strip()


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

    @validator('title')
    def title_must_be_valid(cls, v):
        if v is not None:
            if len(v.strip()) < 1:
                raise ValueError('Post title cannot be empty')
            if len(v) > 200:
                raise ValueError('Post title must be less than 200 characters')
            return v.strip()
        return v

    @validator('content')
    def content_must_be_valid(cls, v):
        if v is not None:
            if len(v.strip()) < 1:
                raise ValueError('Post content cannot be empty')
            return v.strip()
        return v


class PostResponse(PostBase):
    id: int
    channel_id: int
    author_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True