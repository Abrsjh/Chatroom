from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from app.database import get_db
from app.schemas.channel import ChannelCreate, ChannelResponse
from app.crud.channel import create_channel, get_channel, get_channels
from app.models.models import User


router = APIRouter(prefix="/channels", tags=["channels"])


def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    """Simplified authentication for testing - gets user ID from header."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail={
            "error": {
                "code": "UNAUTHORIZED",
                "message": "Authentication required"
            },
            "success": False
        })
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail={
            "error": {
                "code": "INVALID_AUTH",
                "message": "Invalid authentication"
            },
            "success": False
        })


@router.get("", response_model=dict)
def list_channels(db: Session = Depends(get_db)):
    """Get all channels."""
    channels = get_channels(db)
    return {
        "data": [ChannelResponse.model_validate(channel) for channel in channels],
        "success": True,
        "message": "Channels retrieved successfully"
    }


@router.get("/{channel_id}", response_model=dict)
def get_channel_by_id(channel_id: int, db: Session = Depends(get_db)):
    """Get a specific channel by ID."""
    channel = get_channel(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "CHANNEL_NOT_FOUND",
                    "message": "Channel not found"
                },
                "success": False
            }
        )
    
    return {
        "data": ChannelResponse.model_validate(channel),
        "success": True,
        "message": "Channel retrieved successfully"
    }


@router.post("", response_model=dict, status_code=201)
def create_new_channel(
    channel: ChannelCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new channel."""
    # Check if user exists
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found"
                },
                "success": False
            }
        )
    
    try:
        db_channel = create_channel(db, channel, current_user_id)
        return {
            "data": ChannelResponse.model_validate(db_channel),
            "success": True,
            "message": "Channel created successfully"
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "CHANNEL_EXISTS",
                    "message": "Channel with this name already exists"
                },
                "success": False
            }
        )