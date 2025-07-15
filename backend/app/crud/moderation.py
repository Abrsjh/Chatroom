from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from backend.app.models.models import (
    User, Post, Reply, ModerationAction, ModerationLog, 
    ActionType, TargetType
)
from backend.app.schemas.moderation import (
    ModerationActionCreate, ModerationLogCreate, ModerationLogFilters
)


class ModerationCRUD:
    """CRUD operations for moderation system"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Moderation Actions
    def create_moderation_action(
        self, 
        action: ModerationActionCreate, 
        moderator_id: int
    ) -> ModerationAction:
        """Create a new moderation action"""
        db_action = ModerationAction(
            action_type=action.action_type,
            target_type=action.target_type,
            target_id=action.target_id,
            moderator_id=moderator_id,
            reason=action.reason,
            metadata=action.metadata or {}
        )
        
        self.db.add(db_action)
        self.db.commit()
        self.db.refresh(db_action)
        return db_action
    
    def get_moderation_actions(
        self,
        filters: ModerationLogFilters = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ModerationAction]:
        """Get moderation actions with optional filtering"""
        query = self.db.query(ModerationAction)
        
        if filters:
            if filters.action_type:
                query = query.filter(ModerationAction.action_type == filters.action_type)
            if filters.target_type:
                query = query.filter(ModerationAction.target_type == filters.target_type)
            if filters.moderator_id:
                query = query.filter(ModerationAction.moderator_id == filters.moderator_id)
            if filters.target_id:
                query = query.filter(ModerationAction.target_id == filters.target_id)
            if filters.start_date:
                query = query.filter(ModerationAction.created_at >= filters.start_date)
            if filters.end_date:
                query = query.filter(ModerationAction.created_at <= filters.end_date)
        
        return query.order_by(desc(ModerationAction.created_at)).offset(offset).limit(limit).all()
    
    def get_moderation_action_by_id(self, action_id: int) -> Optional[ModerationAction]:
        """Get a specific moderation action by ID"""
        return self.db.query(ModerationAction).filter(ModerationAction.id == action_id).first()
    
    def get_actions_for_target(
        self, 
        target_type: TargetType, 
        target_id: int
    ) -> List[ModerationAction]:
        """Get all moderation actions for a specific target"""
        return self.db.query(ModerationAction).filter(
            and_(
                ModerationAction.target_type == target_type,
                ModerationAction.target_id == target_id
            )
        ).order_by(desc(ModerationAction.created_at)).all()
    
    # Moderation Logs
    def create_moderation_log(
        self,
        log: ModerationLogCreate,
        moderator_id: int
    ) -> ModerationLog:
        """Create a new moderation log entry"""
        db_log = ModerationLog(
            user_id=log.user_id,
            moderator_id=moderator_id,
            action=log.action,
            details=log.details or {}
        )
        
        self.db.add(db_log)
        self.db.commit()
        self.db.refresh(db_log)
        return db_log
    
    def get_moderation_logs(
        self,
        filters: ModerationLogFilters = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ModerationLog]:
        """Get moderation logs with optional filtering"""
        query = self.db.query(ModerationLog)
        
        if filters:
            if filters.moderator_id:
                query = query.filter(ModerationLog.moderator_id == filters.moderator_id)
            if filters.start_date:
                query = query.filter(ModerationLog.created_at >= filters.start_date)
            if filters.end_date:
                query = query.filter(ModerationLog.created_at <= filters.end_date)
        
        return query.order_by(desc(ModerationLog.created_at)).offset(offset).limit(limit).all()
    
    def get_user_moderation_history(self, user_id: int) -> List[ModerationLog]:
        """Get moderation history for a specific user"""
        return self.db.query(ModerationLog).filter(
            ModerationLog.user_id == user_id
        ).order_by(desc(ModerationLog.created_at)).all()
    
    # Content Moderation Actions
    def delete_post(self, post_id: int, moderator_id: int, reason: str) -> bool:
        """Soft delete a post"""
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            return False
        
        # Soft delete the post
        post.deleted_at = datetime.now(timezone.utc)
        
        # Log the action
        action = ModerationActionCreate(
            action_type=ActionType.DELETE,
            target_type=TargetType.POST,
            target_id=post_id,
            reason=reason,
            metadata={"original_title": post.title, "original_content": post.content}
        )
        
        self.create_moderation_action(action, moderator_id)
        self.db.commit()
        return True
    
    def delete_reply(self, reply_id: int, moderator_id: int, reason: str) -> bool:
        """Soft delete a reply"""
        reply = self.db.query(Reply).filter(Reply.id == reply_id).first()
        if not reply:
            return False
        
        # Soft delete the reply
        reply.deleted_at = datetime.now(timezone.utc)
        
        # Log the action
        action = ModerationActionCreate(
            action_type=ActionType.DELETE,
            target_type=TargetType.REPLY,
            target_id=reply_id,
            reason=reason,
            metadata={"original_content": reply.content}
        )
        
        self.create_moderation_action(action, moderator_id)
        self.db.commit()
        return True
    
    def flag_content(
        self, 
        target_type: TargetType, 
        target_id: int, 
        moderator_id: int, 
        reason: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Flag content for review"""
        # Verify target exists
        if target_type == TargetType.POST:
            target = self.db.query(Post).filter(Post.id == target_id).first()
        elif target_type == TargetType.REPLY:
            target = self.db.query(Reply).filter(Reply.id == target_id).first()
        else:
            return False
        
        if not target:
            return False
        
        # Create flag action
        action = ModerationActionCreate(
            action_type=ActionType.FLAG,
            target_type=target_type,
            target_id=target_id,
            reason=reason,
            metadata=metadata or {}
        )
        
        self.create_moderation_action(action, moderator_id)
        return True
    
    def approve_content(
        self, 
        target_type: TargetType, 
        target_id: int, 
        moderator_id: int, 
        reason: str
    ) -> bool:
        """Approve previously flagged content"""
        # Verify target exists
        if target_type == TargetType.POST:
            target = self.db.query(Post).filter(Post.id == target_id).first()
        elif target_type == TargetType.REPLY:
            target = self.db.query(Reply).filter(Reply.id == target_id).first()
        else:
            return False
        
        if not target:
            return False
        
        # Create approval action
        action = ModerationActionCreate(
            action_type=ActionType.APPROVE,
            target_type=target_type,
            target_id=target_id,
            reason=reason
        )
        
        self.create_moderation_action(action, moderator_id)
        return True
    
    def warn_user(
        self, 
        user_id: int, 
        moderator_id: int, 
        reason: str, 
        details: Optional[str] = None
    ) -> bool:
        """Issue a warning to a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Create warning action
        action = ModerationActionCreate(
            action_type=ActionType.WARN,
            target_type=TargetType.USER,
            target_id=user_id,
            reason=reason,
            metadata={"details": details} if details else {}
        )
        
        self.create_moderation_action(action, moderator_id)
        
        # Create log entry
        log = ModerationLogCreate(
            user_id=user_id,
            action=f"User warned: {reason}",
            details={"warning_details": details} if details else {}
        )
        
        self.create_moderation_log(log, moderator_id)
        return True
    
    def ban_user(
        self, 
        user_id: int, 
        moderator_id: int, 
        reason: str, 
        duration_days: Optional[int] = None,
        permanent: bool = False
    ) -> bool:
        """Ban a user temporarily or permanently"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Deactivate user
        user.is_active = False
        
        # Calculate ban expiration
        ban_expires = None
        if not permanent and duration_days:
            ban_expires = datetime.now(timezone.utc) + timedelta(days=duration_days)
        
        # Create ban action
        metadata = {
            "duration_days": duration_days,
            "permanent": permanent,
            "ban_expires": ban_expires.isoformat() if ban_expires else None
        }
        
        action = ModerationActionCreate(
            action_type=ActionType.BAN,
            target_type=TargetType.USER,
            target_id=user_id,
            reason=reason,
            metadata=metadata
        )
        
        self.create_moderation_action(action, moderator_id)
        
        # Create log entry
        ban_type = "permanent" if permanent else f"{duration_days} days"
        log = ModerationLogCreate(
            user_id=user_id,
            action=f"User banned ({ban_type}): {reason}",
            details={
                "ban_type": ban_type,
                "ban_expires": ban_expires.isoformat() if ban_expires else None
            }
        )
        
        self.create_moderation_log(log, moderator_id)
        self.db.commit()
        return True
    
    # Statistics and Analytics
    def get_moderation_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get moderation statistics for the last N days"""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        actions = self.db.query(ModerationAction).filter(
            ModerationAction.created_at >= start_date
        ).all()
        
        stats = {
            "total_actions": len(actions),
            "actions_by_type": {},
            "actions_by_target_type": {},
            "recent_actions": actions[:10]
        }
        
        for action in actions:
            action_type = action.action_type.value
            target_type = action.target_type.value
            
            stats["actions_by_type"][action_type] = stats["actions_by_type"].get(action_type, 0) + 1
            stats["actions_by_target_type"][target_type] = stats["actions_by_target_type"].get(target_type, 0) + 1
        
        return stats
    
    def is_user_moderator(self, user_id: int) -> bool:
        """Check if a user has moderation permissions"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return user and user.is_superuser
    
    def get_flagged_content(self, limit: int = 50) -> List[ModerationAction]:
        """Get all flagged content awaiting review"""
        return self.db.query(ModerationAction).filter(
            ModerationAction.action_type == ActionType.FLAG
        ).order_by(desc(ModerationAction.created_at)).limit(limit).all()
    
    def get_banned_users(self) -> List[User]:
        """Get all currently banned users"""
        return self.db.query(User).filter(User.is_active == False).all()