from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class ActionType(str, Enum):
    DELETE = "delete"
    FLAG = "flag"
    APPROVE = "approve"
    WARN = "warn"
    BAN = "ban"

class TargetType(str, Enum):
    POST = "post"
    REPLY = "reply"
    USER = "user"

class ModerationActionBase(BaseModel):
    action_type: ActionType
    target_type: TargetType
    target_id: int
    reason: str = Field(..., min_length=1, max_length=1000)
    metadata: Optional[Dict[str, Any]] = None

class ModerationActionCreate(ModerationActionBase):
    pass

class ModerationActionUpdate(BaseModel):
    reason: Optional[str] = Field(None, min_length=1, max_length=1000)
    metadata: Optional[Dict[str, Any]] = None

class ModerationActionResponse(ModerationActionBase):
    id: int
    moderator_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModerationLogBase(BaseModel):
    user_id: int
    action: str = Field(..., min_length=1, max_length=1000)
    details: Optional[Dict[str, Any]] = None

class ModerationLogCreate(ModerationLogBase):
    pass

class ModerationLogResponse(ModerationLogBase):
    id: int
    moderator_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class DeleteContentRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)

class FlagContentRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)
    metadata: Optional[Dict[str, Any]] = None

class ApproveContentRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)

class WarnUserRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)
    details: Optional[str] = Field(None, max_length=2000)

class BanUserRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)
    duration_days: Optional[int] = Field(None, ge=1, le=365)
    permanent: bool = False
    
    @validator('duration_days')
    def validate_duration_days(cls, v, values):
        if values.get('permanent') and v is not None:
            raise ValueError('Cannot set duration_days for permanent ban')
        if not values.get('permanent') and v is None:
            raise ValueError('duration_days is required for non-permanent ban')
        return v

class ModerationStatsResponse(BaseModel):
    total_actions: int
    actions_by_type: Dict[ActionType, int]
    actions_by_target_type: Dict[TargetType, int]
    recent_actions: List[ModerationActionResponse]
    
class ModerationLogFilters(BaseModel):
    action_type: Optional[ActionType] = None
    target_type: Optional[TargetType] = None
    moderator_id: Optional[int] = None
    target_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(50, ge=1, le=1000)
    offset: int = Field(0, ge=0)