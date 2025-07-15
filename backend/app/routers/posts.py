from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.post import PostCreate, PostResponse
from app.crud.post import create_post, get_post, get_posts_by_channel
from app.crud.channel import get_channel
from app.models.models import User


router = APIRouter(tags=["posts"])


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


@router.get("/channels/{channel_id}/posts", response_model=dict)
def list_posts_by_channel(channel_id: int, db: Session = Depends(get_db)):
    """Get all posts in a specific channel."""
    # Check if channel exists
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
    
    posts = get_posts_by_channel(db, channel_id)
    return {
        "data": [PostResponse.model_validate(post) for post in posts],
        "success": True,
        "message": "Posts retrieved successfully"
    }


@router.get("/posts/{post_id}", response_model=dict)
def get_post_by_id(post_id: int, db: Session = Depends(get_db)):
    """Get a specific post by ID."""
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "POST_NOT_FOUND",
                    "message": "Post not found"
                },
                "success": False
            }
        )
    
    return {
        "data": PostResponse.model_validate(post),
        "success": True,
        "message": "Post retrieved successfully"
    }


@router.post("/channels/{channel_id}/posts", response_model=dict, status_code=201)
def create_new_post(
    channel_id: int,
    post: PostCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new post in a channel."""
    # Check if channel exists
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
    
    db_post = create_post(db, post, channel_id, current_user_id)
    return {
        "data": PostResponse.model_validate(db_post),
        "success": True,
        "message": "Post created successfully"
    }