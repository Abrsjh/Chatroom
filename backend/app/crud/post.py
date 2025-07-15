from sqlalchemy.orm import Session
from app.models.models import Post
from app.schemas.post import PostCreate, PostUpdate
from typing import List, Optional


def create_post(db: Session, post: PostCreate, channel_id: int, author_id: int) -> Post:
    """Create a new post."""
    db_post = Post(
        title=post.title,
        content=post.content,
        channel_id=channel_id,
        author_id=author_id
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def get_post(db: Session, post_id: int) -> Optional[Post]:
    """Get a post by ID."""
    return db.query(Post).filter(Post.id == post_id).first()


def get_posts_by_channel(db: Session, channel_id: int, skip: int = 0, limit: int = 100) -> List[Post]:
    """Get all posts in a channel with pagination."""
    return (
        db.query(Post)
        .filter(Post.channel_id == channel_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_post(db: Session, post_id: int, post_update: PostUpdate) -> Optional[Post]:
    """Update a post."""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        return None
    
    update_data = post_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_post, field, value)
    
    db.commit()
    db.refresh(db_post)
    return db_post


def delete_post(db: Session, post_id: int) -> Optional[Post]:
    """Delete a post."""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        return None
    
    db.delete(db_post)
    db.commit()
    return db_post