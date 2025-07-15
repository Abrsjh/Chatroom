from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class VoteTypeEnum(str, Enum):
    upvote = "upvote"
    downvote = "downvote"


class VoteBase(BaseModel):
    vote_type: VoteTypeEnum = Field(..., description="Type of vote: upvote or downvote")


class VoteCreate(VoteBase):
    user_id: int = Field(..., description="ID of the user casting the vote")
    
    @validator('user_id')
    def user_id_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('User ID must be positive')
        return v


class VoteUpdate(VoteBase):
    pass


class VoteResponse(VoteBase):
    id: int = Field(..., description="Unique identifier for the vote")
    user_id: int = Field(..., description="ID of the user who cast the vote")
    post_id: Optional[int] = Field(None, description="ID of the post being voted on")
    reply_id: Optional[int] = Field(None, description="ID of the reply being voted on")
    created_at: datetime = Field(..., description="When the vote was created")
    updated_at: datetime = Field(..., description="When the vote was last updated")
    
    class Config:
        from_attributes = True


class VoteRemovalResponse(BaseModel):
    message: str = Field(default="Vote removed", description="Confirmation message")
    previous_vote_type: VoteTypeEnum = Field(..., description="Type of vote that was removed")


class VoteCountsResponse(BaseModel):
    upvote_count: int = Field(0, description="Number of upvotes")
    downvote_count: int = Field(0, description="Number of downvotes")
    net_votes: int = Field(0, description="Net votes (upvotes - downvotes)")
    total_votes: int = Field(0, description="Total number of votes")


class PostVoteCountsResponse(VoteCountsResponse):
    post_id: int = Field(..., description="ID of the post")


class ReplyVoteCountsResponse(VoteCountsResponse):
    reply_id: int = Field(..., description="ID of the reply")


class UserVoteHistoryResponse(BaseModel):
    votes: list[VoteResponse] = Field(..., description="List of user's votes")
    total_count: int = Field(..., description="Total number of votes by user")
    skip: int = Field(0, description="Number of votes skipped")
    limit: int = Field(50, description="Maximum number of votes returned")


class TopVotedPostResponse(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    channel_id: int
    created_at: datetime
    upvote_count: int
    downvote_count: int
    net_votes: int
    total_votes: int


class TopVotedReplyResponse(BaseModel):
    id: int
    content: str
    author_id: int
    post_id: int
    parent_id: Optional[int]
    created_at: datetime
    upvote_count: int
    downvote_count: int
    net_votes: int
    total_votes: int


class TopVotedContentResponse(BaseModel):
    posts: list[TopVotedPostResponse] = Field(..., description="Top voted posts")
    replies: list[TopVotedReplyResponse] = Field(..., description="Top voted replies")


class ControversialContentItem(BaseModel):
    controversy_score: float = Field(..., description="Controversy score (0-1, higher = more controversial)")
    upvote_count: int
    downvote_count: int
    net_votes: int
    total_votes: int


class ControversialPostResponse(ControversialContentItem):
    id: int
    title: str
    content: str
    author_id: int
    channel_id: int
    created_at: datetime


class ControversialReplyResponse(ControversialContentItem):
    id: int
    content: str
    author_id: int
    post_id: int
    parent_id: Optional[int]
    created_at: datetime


class ControversialContentResponse(BaseModel):
    posts: list[ControversialPostResponse] = Field(..., description="Controversial posts")
    replies: list[ControversialReplyResponse] = Field(..., description="Controversial replies")


class VotingStatsResponse(BaseModel):
    total_votes: int = Field(..., description="Total number of votes in system")
    total_upvotes: int = Field(..., description="Total upvotes")
    total_downvotes: int = Field(..., description="Total downvotes")
    active_voters: int = Field(..., description="Number of users who have voted")
    posts_with_votes: int = Field(..., description="Number of posts that have received votes")
    replies_with_votes: int = Field(..., description="Number of replies that have received votes")


class BulkVoteUpdateResponse(BaseModel):
    posts_updated: int = Field(..., description="Number of posts updated")
    replies_updated: int = Field(..., description="Number of replies updated")
    message: str = Field(default="Vote aggregates updated successfully")


# Error response schemas
class VoteErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Specific error code")


class VoteValidationError(VoteErrorResponse):
    field_errors: Optional[dict] = Field(None, description="Field-specific validation errors")


# Request schemas for batch operations
class BatchVoteRequest(BaseModel):
    votes: list[dict] = Field(
        ..., 
        description="List of vote operations",
        example=[
            {"post_id": 1, "vote_type": "upvote"},
            {"reply_id": 5, "vote_type": "downvote"}
        ]
    )
    user_id: int = Field(..., description="ID of user performing batch vote")


class BatchVoteResponse(BaseModel):
    successful_votes: int = Field(..., description="Number of successful vote operations")
    failed_votes: int = Field(..., description="Number of failed vote operations")
    errors: list[str] = Field(default_factory=list, description="Error messages for failed votes")
    results: list[VoteResponse] = Field(default_factory=list, description="Successful vote results")