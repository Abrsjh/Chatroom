from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.crud import reply as reply_crud
from backend.app.schemas.reply import (
    ReplyCreate, ReplyUpdate, ReplyResponse, ReplyThread, 
    ReplySearch, BulkDeleteRequest, BulkDeleteResponse
)

router = APIRouter()

@router.get("/posts/{post_id}/replies", response_model=List[ReplyResponse])
def get_post_replies(
    post_id: int,
    skip: int = Query(0, ge=0, description="Number of replies to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of replies to return"),
    threaded: bool = Query(False, description="Return replies in threaded format"),
    db: Session = Depends(get_db)
):
    """
    Get all replies for a specific post.
    
    - **post_id**: ID of the post
    - **skip**: Number of replies to skip (for pagination)
    - **limit**: Maximum number of replies to return
    - **threaded**: If True, returns replies in threaded hierarchy
    """
    try:
        if threaded:
            replies = reply_crud.get_post_replies_threaded(db, post_id, skip, limit)
        else:
            replies = reply_crud.get_post_replies(db, post_id, skip, limit)
        
        return replies
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching replies: {str(e)}")

@router.post("/posts/{post_id}/replies", response_model=ReplyResponse, status_code=201)
def create_reply(
    post_id: int,
    reply: ReplyCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new reply for a specific post.
    
    - **post_id**: ID of the post to reply to
    - **reply**: Reply data including content, author_id, and optional parent_id
    """
    try:
        db_reply = reply_crud.create_reply(db, reply, post_id)
        return db_reply
    except ValueError as e:
        error_msg = str(e)
        if "Post not found" in error_msg:
            raise HTTPException(status_code=404, detail="Post not found")
        elif "Author not found" in error_msg:
            raise HTTPException(status_code=404, detail="Author not found")
        elif "Parent reply not found" in error_msg:
            raise HTTPException(status_code=404, detail="Parent reply not found")
        elif "Maximum reply depth exceeded" in error_msg:
            raise HTTPException(status_code=400, detail="Maximum reply depth exceeded")
        else:
            raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating reply: {str(e)}")

@router.get("/replies/{reply_id}", response_model=ReplyResponse)
def get_reply(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific reply by ID.
    
    - **reply_id**: ID of the reply
    """
    db_reply = reply_crud.get_reply_by_id(db, reply_id)
    if not db_reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    return db_reply

@router.put("/replies/{reply_id}", response_model=ReplyResponse)
def update_reply(
    reply_id: int,
    reply_update: ReplyUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a specific reply.
    
    - **reply_id**: ID of the reply to update
    - **reply_update**: Updated reply data
    """
    db_reply = reply_crud.update_reply(db, reply_id, reply_update)
    if not db_reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    return db_reply

@router.delete("/replies/{reply_id}")
def delete_reply(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """
    Soft delete a specific reply.
    
    - **reply_id**: ID of the reply to delete
    """
    success = reply_crud.delete_reply(db, reply_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {"message": "Reply deleted successfully"}

@router.get("/replies/{reply_id}/thread", response_model=List[ReplyResponse])
def get_reply_thread(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the entire thread that contains the specified reply.
    
    - **reply_id**: ID of any reply in the thread
    """
    thread_replies = reply_crud.get_reply_thread(db, reply_id)
    if not thread_replies:
        raise HTTPException(status_code=404, detail="Reply not found")
    return thread_replies

@router.get("/replies/{reply_id}/children", response_model=List[ReplyResponse])
def get_reply_children(
    reply_id: int,
    skip: int = Query(0, ge=0, description="Number of children to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of children to return"),
    db: Session = Depends(get_db)
):
    """
    Get direct children of a specific reply.
    
    - **reply_id**: ID of the parent reply
    - **skip**: Number of children to skip (for pagination)
    - **limit**: Maximum number of children to return
    """
    # First verify the parent reply exists
    parent_reply = reply_crud.get_reply_by_id(db, reply_id)
    if not parent_reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    children = reply_crud.get_reply_children(db, reply_id, skip, limit)
    return children

@router.get("/replies/{reply_id}/ancestors", response_model=List[ReplyResponse])
def get_reply_ancestors(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all ancestors of a specific reply.
    
    - **reply_id**: ID of the reply
    """
    ancestors = reply_crud.get_reply_ancestors(db, reply_id)
    if ancestors is None:
        raise HTTPException(status_code=404, detail="Reply not found")
    return ancestors

@router.get("/replies/{reply_id}/descendants", response_model=List[ReplyResponse])
def get_reply_descendants(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all descendants of a specific reply.
    
    - **reply_id**: ID of the reply
    """
    descendants = reply_crud.get_reply_descendants(db, reply_id)
    if descendants is None:
        raise HTTPException(status_code=404, detail="Reply not found")
    return descendants

@router.get("/replies/{reply_id}/siblings", response_model=List[ReplyResponse])
def get_reply_siblings(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all siblings of a specific reply.
    
    - **reply_id**: ID of the reply
    """
    siblings = reply_crud.get_reply_siblings(db, reply_id)
    if siblings is None:
        raise HTTPException(status_code=404, detail="Reply not found")
    return siblings

@router.get("/posts/{post_id}/replies/search", response_model=ReplySearch)
def search_post_replies(
    post_id: int,
    q: str = Query(..., min_length=1, max_length=100, description="Search term"),
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """
    Search replies within a specific post.
    
    - **post_id**: ID of the post to search in
    - **q**: Search term
    - **skip**: Number of results to skip (for pagination)
    - **limit**: Maximum number of results to return
    """
    replies = reply_crud.search_replies(db, post_id, q, skip, limit)
    total_count = reply_crud.count_post_replies(db, post_id)
    
    return ReplySearch(
        replies=replies,
        total_count=total_count,
        search_term=q
    )

@router.get("/users/{user_id}/replies", response_model=List[ReplyResponse])
def get_user_replies(
    user_id: int,
    skip: int = Query(0, ge=0, description="Number of replies to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of replies to return"),
    db: Session = Depends(get_db)
):
    """
    Get all replies by a specific user.
    
    - **user_id**: ID of the user
    - **skip**: Number of replies to skip (for pagination)
    - **limit**: Maximum number of replies to return
    """
    replies = reply_crud.get_user_replies(db, user_id, skip, limit)
    return replies

@router.get("/replies/recent", response_model=List[ReplyResponse])
def get_recent_replies(
    limit: int = Query(10, ge=1, le=100, description="Maximum number of recent replies to return"),
    db: Session = Depends(get_db)
):
    """
    Get most recent replies across all posts.
    
    - **limit**: Maximum number of recent replies to return
    """
    replies = reply_crud.get_recent_replies(db, limit)
    return replies

@router.post("/replies/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_replies(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db)
):
    """
    Bulk delete multiple replies.
    
    - **request**: List of reply IDs to delete
    """
    try:
        deleted_count = reply_crud.bulk_delete_replies(db, request.reply_ids)
        return BulkDeleteResponse(
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} replies"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting replies: {str(e)}")

@router.get("/posts/{post_id}/replies/count")
def get_post_reply_count(
    post_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the total count of replies for a specific post.
    
    - **post_id**: ID of the post
    """
    count = reply_crud.count_post_replies(db, post_id)
    return {"post_id": post_id, "reply_count": count}