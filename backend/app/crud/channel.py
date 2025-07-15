from sqlalchemy.orm import Session
from app.models.models import Channel
from app.schemas.channel import ChannelCreate, ChannelUpdate
from typing import List, Optional


def create_channel(db: Session, channel: ChannelCreate, user_id: int) -> Channel:
    """Create a new channel."""
    db_channel = Channel(
        name=channel.name,
        description=channel.description,
        created_by=user_id
    )
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel


def get_channel(db: Session, channel_id: int) -> Optional[Channel]:
    """Get a channel by ID."""
    return db.query(Channel).filter(Channel.id == channel_id).first()


def get_channels(db: Session, skip: int = 0, limit: int = 100) -> List[Channel]:
    """Get all channels with pagination."""
    return db.query(Channel).offset(skip).limit(limit).all()


def update_channel(db: Session, channel_id: int, channel_update: ChannelUpdate) -> Optional[Channel]:
    """Update a channel."""
    db_channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not db_channel:
        return None
    
    update_data = channel_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_channel, field, value)
    
    db.commit()
    db.refresh(db_channel)
    return db_channel


def delete_channel(db: Session, channel_id: int) -> Optional[Channel]:
    """Delete a channel."""
    db_channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not db_channel:
        return None
    
    db.delete(db_channel)
    db.commit()
    return db_channel