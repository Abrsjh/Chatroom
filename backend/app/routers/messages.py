from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.crud import message as message_crud
from app.schemas.message import (
    MessageCreate, 
    MessageResponse, 
    ConversationResponse,
    UnreadCountResponse,
    MarkAsReadResponse,
    MessageDeleteResponse
)

router = APIRouter()

# Mock authentication - in real app, this would be extracted from JWT token
def get_current_user_id() -> int:
    return 1  # Mock user ID for testing

@router.get("/messages", response_model=List[MessageResponse])
def get_conversation(
    other_user_id: int = Query(..., description="ID of the other user in the conversation"),
    skip: int = Query(0, ge=0, description="Number of messages to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of messages to return"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get conversation between current user and another user"""
    
    # Verify other user exists
    other_user = message_crud.get_user_by_id(db, other_user_id)
    if not other_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    messages = message_crud.get_conversation(
        db, current_user_id, other_user_id, skip, limit
    )
    
    return messages

@router.post("/messages", response_model=MessageResponse, status_code=201)
def create_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new message"""
    
    # Verify recipient exists
    recipient = message_crud.get_user_by_id(db, message.recipient_id)
    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Recipient not found"
        )
    
    # Prevent sending message to self
    if message.recipient_id == current_user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot send message to yourself"
        )
    
    created_message = message_crud.create_message(db, message, current_user_id)
    return created_message

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get all conversations for current user"""
    
    conversations = message_crud.get_conversations(db, current_user_id)
    return conversations

@router.put("/messages/read", response_model=MarkAsReadResponse)
def mark_messages_as_read(
    other_user_id: int = Query(..., description="ID of the other user whose messages to mark as read"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Mark all messages from another user as read"""
    
    # Verify other user exists
    other_user = message_crud.get_user_by_id(db, other_user_id)
    if not other_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    marked_count = message_crud.mark_messages_as_read(db, current_user_id, other_user_id)
    
    return MarkAsReadResponse(marked_as_read=marked_count)

@router.get("/messages/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get total unread messages count for current user"""
    
    unread_count = message_crud.get_unread_count(db, current_user_id)
    
    return UnreadCountResponse(unread_count=unread_count)

@router.get("/messages/search", response_model=List[MessageResponse])
def search_messages(
    query: str = Query(..., min_length=1, description="Search query"),
    other_user_id: int = Query(..., description="ID of the other user in the conversation"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Search messages in a conversation"""
    
    # Verify other user exists
    other_user = message_crud.get_user_by_id(db, other_user_id)
    if not other_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    messages = message_crud.search_messages(db, current_user_id, other_user_id, query, limit)
    
    return messages

@router.delete("/messages/{message_id}", response_model=MessageDeleteResponse)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a message (soft delete - only sender can delete)"""
    
    # Verify message exists
    message = message_crud.get_message_by_id(db, message_id)
    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found"
        )
    
    # Check if current user is the sender
    if message.sender_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this message"
        )
    
    success = message_crud.delete_message(db, message_id, current_user_id)
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete message"
        )
    
    return MessageDeleteResponse(message="Message deleted successfully")