from pydantic import BaseModel, validator, Field
from datetime import datetime
from typing import Optional, List


class ReplyBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000, description="Reply content")

    @validator('content')
    def content_must_be_valid(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Reply content cannot be empty')
        if len(v.strip()) > 10000:
            raise ValueError('Reply content cannot exceed 10000 characters')
        return v.strip()


class ReplyCreate(ReplyBase):
    author_id: int = Field(..., gt=0, description="ID of the reply author")
    parent_id: Optional[int] = Field(None, gt=0, description="ID of the parent reply for threading")


class ReplyUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=10000, description="Updated reply content")

    @validator('content')
    def content_must_be_valid(cls, v):
        if v is not None:
            if len(v.strip()) < 1:
                raise ValueError('Reply content cannot be empty')
            if len(v.strip()) > 10000:
                raise ValueError('Reply content cannot exceed 10000 characters')
            return v.strip()
        return v


class ReplyResponse(ReplyBase):
    id: int
    post_id: int
    author_id: int
    parent_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    is_edited: bool
    depth: int
    upvote_count: int = 0
    downvote_count: int = 0
    net_votes: int = 0
    can_reply_to: bool = True

    class Config:
        from_attributes = True


class ReplyWithAuthor(ReplyResponse):
    author_username: str = Field(..., description="Username of the reply author")


class ReplyThread(BaseModel):
    """Response model for threaded replies"""
    root_reply: ReplyResponse
    replies: List[ReplyResponse] = Field(default_factory=list)
    total_count: int = Field(default=0, description="Total number of replies in thread")


class ReplySearch(BaseModel):
    """Response model for reply search results"""
    replies: List[ReplyResponse]
    total_count: int
    search_term: str


class ReplyStats(BaseModel):
    """Statistics for a reply"""
    total_replies: int = 0
    total_votes: int = 0
    depth: int = 0
    children_count: int = 0


class BulkDeleteRequest(BaseModel):
    """Request model for bulk deleting replies"""
    reply_ids: List[int] = Field(..., min_items=1, max_items=100, description="List of reply IDs to delete")


class BulkDeleteResponse(BaseModel):
    """Response model for bulk delete operation"""
    deleted_count: int = Field(..., description="Number of replies successfully deleted")
    message: str = Field(..., description="Success message")