from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from app.models.models import Message, User
from app.schemas.message import MessageCreate
from typing import List, Optional, Dict, Any
from datetime import datetime

def create_message(db: Session, message: MessageCreate, sender_id: int) -> Message:
    """Create a new message"""
    db_message = Message(
        content=message.content,
        sender_id=sender_id,
        recipient_id=message.recipient_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_conversation(
    db: Session, 
    user_id: int, 
    other_user_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[Message]:
    """Get conversation between two users"""
    return db.query(Message).filter(
        and_(
            or_(
                and_(Message.sender_id == user_id, Message.recipient_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.recipient_id == user_id)
            ),
            Message.deleted_at.is_(None)  # Exclude deleted messages
        )
    ).order_by(Message.created_at).offset(skip).limit(limit).all()

def get_conversations(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Get all conversations for a user with latest message and unread count"""
    # Subquery to get latest message for each conversation
    latest_messages = db.query(
        func.max(Message.created_at).label('latest_created_at'),
        func.case(
            (Message.sender_id == user_id, Message.recipient_id),
            else_=Message.sender_id
        ).label('other_user_id')
    ).filter(
        and_(
            or_(Message.sender_id == user_id, Message.recipient_id == user_id),
            Message.deleted_at.is_(None)
        )
    ).group_by(
        func.case(
            (Message.sender_id == user_id, Message.recipient_id),
            else_=Message.sender_id
        )
    ).subquery()
    
    # Get conversations with latest message and other user info
    conversations = db.query(
        Message,
        User.username.label('other_username')
    ).join(
        latest_messages,
        and_(
            Message.created_at == latest_messages.c.latest_created_at,
            func.case(
                (Message.sender_id == user_id, Message.recipient_id),
                else_=Message.sender_id
            ) == latest_messages.c.other_user_id
        )
    ).join(
        User,
        User.id == latest_messages.c.other_user_id
    ).all()
    
    result = []
    for message, other_username in conversations:
        other_user_id = message.recipient_id if message.sender_id == user_id else message.sender_id
        
        # Get unread count for this conversation
        unread_count = db.query(Message).filter(
            and_(
                Message.sender_id == other_user_id,
                Message.recipient_id == user_id,
                Message.read_at.is_(None),
                Message.deleted_at.is_(None)
            )
        ).count()
        
        result.append({
            "other_user_id": other_user_id,
            "other_username": other_username,
            "latest_message": {
                "id": message.id,
                "content": message.content,
                "sender_id": message.sender_id,
                "created_at": message.created_at
            },
            "unread_count": unread_count
        })
    
    return sorted(result, key=lambda x: x["latest_message"]["created_at"], reverse=True)

def mark_messages_as_read(db: Session, user_id: int, other_user_id: int) -> int:
    """Mark all unread messages from other_user_id to user_id as read"""
    messages_to_update = db.query(Message).filter(
        and_(
            Message.sender_id == other_user_id,
            Message.recipient_id == user_id,
            Message.read_at.is_(None),
            Message.deleted_at.is_(None)
        )
    )
    
    count = messages_to_update.count()
    messages_to_update.update({"read_at": datetime.utcnow()})
    db.commit()
    
    return count

def get_unread_count(db: Session, user_id: int) -> int:
    """Get total unread messages count for a user"""
    return db.query(Message).filter(
        and_(
            Message.recipient_id == user_id,
            Message.read_at.is_(None),
            Message.deleted_at.is_(None)
        )
    ).count()

def search_messages(
    db: Session, 
    user_id: int, 
    other_user_id: int, 
    query: str,
    limit: int = 50
) -> List[Message]:
    """Search messages in a conversation by content"""
    return db.query(Message).filter(
        and_(
            or_(
                and_(Message.sender_id == user_id, Message.recipient_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.recipient_id == user_id)
            ),
            Message.content.ilike(f"%{query}%"),
            Message.deleted_at.is_(None)
        )
    ).order_by(desc(Message.created_at)).limit(limit).all()

def delete_message(db: Session, message_id: int, user_id: int) -> bool:
    """Soft delete a message (only sender can delete)"""
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message or message.sender_id != user_id:
        return False
    
    message.deleted_at = datetime.utcnow()
    message.deleted_by = user_id
    db.commit()
    
    return True

def get_message_by_id(db: Session, message_id: int) -> Optional[Message]:
    """Get a message by ID"""
    return db.query(Message).filter(
        and_(
            Message.id == message_id,
            Message.deleted_at.is_(None)
        )
    ).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a user by ID"""
    return db.query(User).filter(User.id == user_id).first()