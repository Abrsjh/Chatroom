from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.app.database import get_db
from backend.app.crud.moderation import ModerationCRUD
from backend.app.schemas.moderation import (
    ModerationActionResponse, ModerationLogResponse, ModerationStatsResponse,
    DeleteContentRequest, FlagContentRequest, ApproveContentRequest,
    WarnUserRequest, BanUserRequest, ModerationLogFilters,
    ActionType, TargetType
)
from backend.app.models.models import User
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/moderation", tags=["moderation"])


def require_moderator(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user has moderation permissions"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for moderation actions"
        )
    return current_user


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    request: DeleteContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Delete a post (soft delete)"""
    moderation = ModerationCRUD(db)
    
    success = moderation.delete_post(post_id, current_user.id, request.reason)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return {"message": "Post deleted successfully"}


@router.delete("/replies/{reply_id}")
async def delete_reply(
    reply_id: int,
    request: DeleteContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Delete a reply (soft delete)"""
    moderation = ModerationCRUD(db)
    
    success = moderation.delete_reply(reply_id, current_user.id, request.reason)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    return {"message": "Reply deleted successfully"}


@router.put("/posts/{post_id}/flag")
async def flag_post(
    post_id: int,
    request: FlagContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Flag a post for review"""
    moderation = ModerationCRUD(db)
    
    success = moderation.flag_content(
        TargetType.POST, post_id, current_user.id, request.reason, request.metadata
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return {"message": "Post flagged successfully"}


@router.put("/replies/{reply_id}/flag")
async def flag_reply(
    reply_id: int,
    request: FlagContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Flag a reply for review"""
    moderation = ModerationCRUD(db)
    
    success = moderation.flag_content(
        TargetType.REPLY, reply_id, current_user.id, request.reason, request.metadata
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    return {"message": "Reply flagged successfully"}


@router.put("/posts/{post_id}/approve")
async def approve_post(
    post_id: int,
    request: ApproveContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Approve a flagged post"""
    moderation = ModerationCRUD(db)
    
    success = moderation.approve_content(
        TargetType.POST, post_id, current_user.id, request.reason
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return {"message": "Post approved successfully"}


@router.put("/replies/{reply_id}/approve")
async def approve_reply(
    reply_id: int,
    request: ApproveContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Approve a flagged reply"""
    moderation = ModerationCRUD(db)
    
    success = moderation.approve_content(
        TargetType.REPLY, reply_id, current_user.id, request.reason
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    return {"message": "Reply approved successfully"}


@router.post("/users/{user_id}/warn")
async def warn_user(
    user_id: int,
    request: WarnUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Issue a warning to a user"""
    moderation = ModerationCRUD(db)
    
    success = moderation.warn_user(
        user_id, current_user.id, request.reason, request.details
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User warned successfully"}


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    request: BanUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Ban a user temporarily or permanently"""
    moderation = ModerationCRUD(db)
    
    success = moderation.ban_user(
        user_id, current_user.id, request.reason, 
        request.duration_days, request.permanent
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User banned successfully"}


@router.get("/logs", response_model=List[ModerationActionResponse])
async def get_moderation_logs(
    action_type: Optional[ActionType] = Query(None),
    target_type: Optional[TargetType] = Query(None),
    moderator_id: Optional[int] = Query(None),
    target_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Get moderation logs with optional filtering"""
    filters = ModerationLogFilters(
        action_type=action_type,
        target_type=target_type,
        moderator_id=moderator_id,
        target_id=target_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    
    moderation = ModerationCRUD(db)
    actions = moderation.get_moderation_actions(filters, limit, offset)
    
    return {"data": actions}


@router.get("/stats", response_model=ModerationStatsResponse)
async def get_moderation_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Get moderation statistics"""
    moderation = ModerationCRUD(db)
    stats = moderation.get_moderation_stats(days)
    
    return stats


@router.get("/flagged", response_model=List[ModerationActionResponse])
async def get_flagged_content(
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Get all flagged content awaiting review"""
    moderation = ModerationCRUD(db)
    flagged = moderation.get_flagged_content(limit)
    
    return {"data": flagged}


@router.get("/users/{user_id}/history", response_model=List[ModerationLogResponse])
async def get_user_moderation_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Get moderation history for a specific user"""
    moderation = ModerationCRUD(db)
    history = moderation.get_user_moderation_history(user_id)
    
    return {"data": history}


@router.get("/content/{target_type}/{target_id}/history", response_model=List[ModerationActionResponse])
async def get_content_moderation_history(
    target_type: TargetType,
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Get moderation history for specific content"""
    moderation = ModerationCRUD(db)
    history = moderation.get_actions_for_target(target_type, target_id)
    
    return {"data": history}


@router.get("/banned-users")
async def get_banned_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_moderator)
):
    """Get all currently banned users"""
    moderation = ModerationCRUD(db)
    banned = moderation.get_banned_users()
    
    return {"data": [{"id": user.id, "username": user.username, "email": user.email} for user in banned]}