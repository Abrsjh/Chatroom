from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional


class MessageBase(BaseModel):
    content: str

    @validator('content')
    def content_must_be_valid(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Message content cannot be empty')
        if len(v) > 2000:
            raise ValueError('Message content cannot exceed 2000 characters')
        return v.strip()


class MessageCreate(MessageBase):
    recipient_id: int


class MessageResponse(MessageBase):
    id: int
    sender_id: int
    recipient_id: int
    created_at: datetime
    read_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    other_user_id: int
    other_username: str
    latest_message: dict
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkAsReadResponse(BaseModel):
    marked_as_read: int


class MessageDeleteResponse(BaseModel):
    message: str