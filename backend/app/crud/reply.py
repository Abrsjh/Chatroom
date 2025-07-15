from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from backend.app.models.models import Reply, Post, User
from backend.app.schemas.reply import ReplyCreate, ReplyUpdate
from typing import List, Optional
from datetime import datetime

def get_post_replies(db: Session, post_id: int, skip: int = 0, limit: int = 100) -> List[Reply]:
    """
    Get all replies for a specific post, ordered by creation time.
    Excludes soft-deleted replies.
    """
    return db.query(Reply).filter(
        and_(
            Reply.post_id == post_id,
            Reply.deleted_at.is_(None)
        )
    ).order_by(Reply.created_at).offset(skip).limit(limit).all()

def get_post_replies_threaded(db: Session, post_id: int, skip: int = 0, limit: int = 100) -> List[Reply]:
    """
    Get all replies for a specific post in threaded format.
    Returns replies ordered by thread hierarchy.
    """
    # First get all replies for the post
    all_replies = db.query(Reply).filter(
        and_(
            Reply.post_id == post_id,
            Reply.deleted_at.is_(None)
        )
    ).order_by(Reply.created_at).all()
    
    # Build thread hierarchy
    reply_dict = {reply.id: reply for reply in all_replies}
    root_replies = []
    
    # Separate root replies and child replies
    for reply in all_replies:
        if reply.parent_id is None:
            root_replies.append(reply)
        else:
            parent = reply_dict.get(reply.parent_id)
            if parent:
                if not hasattr(parent, '_children_cache'):
                    parent._children_cache = []
                parent._children_cache.append(reply)
    
    # Flatten the tree structure for API response
    def flatten_replies(replies):
        result = []
        for reply in replies:
            result.append(reply)
            if hasattr(reply, '_children_cache'):
                result.extend(flatten_replies(reply._children_cache))
        return result
    
    threaded_replies = flatten_replies(root_replies)
    
    # Apply pagination to the flattened list
    return threaded_replies[skip:skip + limit]

def get_reply_by_id(db: Session, reply_id: int) -> Optional[Reply]:
    """Get a specific reply by ID. Returns None if not found or soft-deleted."""
    return db.query(Reply).filter(
        and_(
            Reply.id == reply_id,
            Reply.deleted_at.is_(None)
        )
    ).first()

def create_reply(db: Session, reply: ReplyCreate, post_id: int) -> Reply:
    """Create a new reply for a post."""
    # Validate that the post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise ValueError("Post not found")
    
    # Validate that the author exists
    author = db.query(User).filter(User.id == reply.author_id).first()
    if not author:
        raise ValueError("Author not found")
    
    # Validate parent reply if specified
    parent_reply = None
    if reply.parent_id:
        parent_reply = db.query(Reply).filter(
            and_(
                Reply.id == reply.parent_id,
                Reply.post_id == post_id,  # Parent must be in same post
                Reply.deleted_at.is_(None)
            )
        ).first()
        if not parent_reply:
            raise ValueError("Parent reply not found")
        
        # Check maximum depth
        if not parent_reply.can_reply_to:
            raise ValueError("Maximum reply depth exceeded")
    
    db_reply = Reply(
        content=reply.content,
        post_id=post_id,
        author_id=reply.author_id,
        parent_id=reply.parent_id
    )
    
    db.add(db_reply)
    db.commit()
    db.refresh(db_reply)
    return db_reply

def update_reply(db: Session, reply_id: int, reply_update: ReplyUpdate) -> Optional[Reply]:
    """Update an existing reply."""
    db_reply = get_reply_by_id(db, reply_id)
    if not db_reply:
        return None
    
    # Update only the fields that were provided
    if reply_update.content is not None:
        db_reply.content = reply_update.content
    
    # The updated_at field will be automatically updated by SQLAlchemy
    db.commit()
    db.refresh(db_reply)
    return db_reply

def delete_reply(db: Session, reply_id: int) -> bool:
    """Soft delete a reply."""
    db_reply = get_reply_by_id(db, reply_id)
    if not db_reply:
        return False
    
    # Perform soft delete
    db_reply.deleted_at = datetime.utcnow()
    db.commit()
    return True

def get_reply_thread(db: Session, reply_id: int) -> List[Reply]:
    """
    Get the entire thread that contains the specified reply.
    Returns all replies in the thread, ordered by hierarchy.
    """
    # First get the reply
    reply = get_reply_by_id(db, reply_id)
    if not reply:
        return []
    
    # Get the root of the thread
    root_reply = reply.thread_root
    
    # Get all replies in the thread
    thread_replies = [root_reply]
    thread_replies.extend(root_reply.descendants)
    
    # Sort by creation time to maintain chronological order within levels
    thread_replies.sort(key=lambda r: r.created_at)
    
    return thread_replies

def get_reply_children(db: Session, reply_id: int, skip: int = 0, limit: int = 100) -> List[Reply]:
    """Get direct children of a reply."""
    return db.query(Reply).filter(
        and_(
            Reply.parent_id == reply_id,
            Reply.deleted_at.is_(None)
        )
    ).order_by(Reply.created_at).offset(skip).limit(limit).all()

def get_reply_ancestors(db: Session, reply_id: int) -> List[Reply]:
    """Get all ancestors of a reply."""
    reply = get_reply_by_id(db, reply_id)
    if not reply:
        return []
    
    return reply.ancestors

def get_reply_descendants(db: Session, reply_id: int) -> List[Reply]:
    """Get all descendants of a reply."""
    reply = get_reply_by_id(db, reply_id)
    if not reply:
        return []
    
    return reply.descendants

def get_reply_siblings(db: Session, reply_id: int) -> List[Reply]:
    """Get all siblings of a reply."""
    reply = get_reply_by_id(db, reply_id)
    if not reply:
        return []
    
    return reply.siblings

def count_post_replies(db: Session, post_id: int) -> int:
    """Count total replies for a post (excluding soft-deleted)."""
    return db.query(Reply).filter(
        and_(
            Reply.post_id == post_id,
            Reply.deleted_at.is_(None)
        )
    ).count()

def get_user_replies(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Reply]:
    """Get all replies by a specific user."""
    return db.query(Reply).filter(
        and_(
            Reply.author_id == user_id,
            Reply.deleted_at.is_(None)
        )
    ).order_by(Reply.created_at.desc()).offset(skip).limit(limit).all()

def search_replies(db: Session, post_id: int, search_term: str, skip: int = 0, limit: int = 100) -> List[Reply]:
    """Search replies in a post by content."""
    return db.query(Reply).filter(
        and_(
            Reply.post_id == post_id,
            Reply.content.ilike(f"%{search_term}%"),
            Reply.deleted_at.is_(None)
        )
    ).order_by(Reply.created_at).offset(skip).limit(limit).all()

def get_recent_replies(db: Session, limit: int = 10) -> List[Reply]:
    """Get most recent replies across all posts."""
    return db.query(Reply).filter(
        Reply.deleted_at.is_(None)
    ).order_by(Reply.created_at.desc()).limit(limit).all()

def bulk_delete_replies(db: Session, reply_ids: List[int]) -> int:
    """Soft delete multiple replies. Returns count of deleted replies."""
    result = db.query(Reply).filter(
        and_(
            Reply.id.in_(reply_ids),
            Reply.deleted_at.is_(None)
        )
    ).update({Reply.deleted_at: datetime.utcnow()}, synchronize_session='fetch')
    
    db.commit()
    return result