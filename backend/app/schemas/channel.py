from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional


class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None

    @validator('name')
    def name_must_be_valid(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('Channel name cannot be empty')
        if len(v) > 100:
            raise ValueError('Channel name must be less than 100 characters')
        return v.strip()


class ChannelCreate(ChannelBase):
    pass


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    @validator('name')
    def name_must_be_valid(cls, v):
        if v is not None:
            if len(v.strip()) < 1:
                raise ValueError('Channel name cannot be empty')
            if len(v) > 100:
                raise ValueError('Channel name must be less than 100 characters')
            return v.strip()
        return v


class ChannelResponse(ChannelBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True