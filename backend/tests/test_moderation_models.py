import pytest
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from backend.app.models.models import User, Post, Reply, Channel, ModerationAction, ModerationLog, ActionType, TargetType
from backend.app.database import get_db
from backend.tests.conftest import TestingSessionLocal


class TestModerationModels:
    """Test moderation-related database models"""
    
    def test_moderation_action_creation(self):
        """Test creating a moderation action record"""
        db = TestingSessionLocal()
        
        # Create test user and moderator
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        
        # Create test channel and post
        channel = Channel(name="test-channel", description="Test channel", created_by=1)
        post = Post(title="Test Post", content="Test content", channel_id=1, author_id=1)
        
        db.add_all([user, moderator, channel, post])
        db.commit()
        
        # Create moderation action
        action = ModerationAction(
            action_type=ActionType.DELETE,
            target_type=TargetType.POST,
            target_id=post.id,
            moderator_id=moderator.id,
            reason="Spam content",
            metadata={"original_content": "Test content"}
        )
        
        db.add(action)
        db.commit()
        
        # Verify action was created
        assert action.id is not None
        assert action.action_type == ActionType.DELETE
        assert action.target_type == TargetType.POST
        assert action.target_id == post.id
        assert action.moderator_id == moderator.id
        assert action.reason == "Spam content"
        assert action.metadata["original_content"] == "Test content"
        assert action.created_at is not None
        
        db.close()
    
    def test_moderation_log_creation(self):
        """Test creating a moderation log entry"""
        db = TestingSessionLocal()
        
        # Create test users
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        
        db.add_all([user, moderator])
        db.commit()
        
        # Create moderation log
        log = ModerationLog(
            user_id=user.id,
            moderator_id=moderator.id,
            action="User warned for inappropriate content",
            details={"warning_type": "content", "severity": "minor"}
        )
        
        db.add(log)
        db.commit()
        
        # Verify log was created
        assert log.id is not None
        assert log.user_id == user.id
        assert log.moderator_id == moderator.id
        assert log.action == "User warned for inappropriate content"
        assert log.details["warning_type"] == "content"
        assert log.created_at is not None
        
        db.close()
    
    def test_moderation_action_relationships(self):
        """Test relationships between moderation actions and other models"""
        db = TestingSessionLocal()
        
        # Create test data
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        channel = Channel(name="test-channel", description="Test channel", created_by=1)
        post = Post(title="Test Post", content="Test content", channel_id=1, author_id=1)
        
        db.add_all([user, moderator, channel, post])
        db.commit()
        
        # Create moderation action
        action = ModerationAction(
            action_type=ActionType.FLAG,
            target_type=TargetType.POST,
            target_id=post.id,
            moderator_id=moderator.id,
            reason="Inappropriate content"
        )
        
        db.add(action)
        db.commit()
        
        # Test relationships
        assert action.moderator == moderator
        assert moderator.moderation_actions[0] == action
        
        db.close()
    
    def test_action_type_enum_values(self):
        """Test that ActionType enum has expected values"""
        assert ActionType.DELETE.value == "delete"
        assert ActionType.FLAG.value == "flag"
        assert ActionType.APPROVE.value == "approve"
        assert ActionType.WARN.value == "warn"
        assert ActionType.BAN.value == "ban"
    
    def test_target_type_enum_values(self):
        """Test that TargetType enum has expected values"""
        assert TargetType.POST.value == "post"
        assert TargetType.REPLY.value == "reply"
        assert TargetType.USER.value == "user"
    
    def test_moderation_action_constraints(self):
        """Test database constraints for moderation actions"""
        db = TestingSessionLocal()
        
        # Create test users
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        db.add(moderator)
        db.commit()
        
        # Test required fields
        with pytest.raises(IntegrityError):
            action = ModerationAction(
                # Missing required action_type
                target_type=TargetType.POST,
                target_id=1,
                moderator_id=moderator.id
            )
            db.add(action)
            db.commit()
        
        db.rollback()
        db.close()
    
    def test_moderation_log_constraints(self):
        """Test database constraints for moderation logs"""
        db = TestingSessionLocal()
        
        # Create test users
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        db.add_all([user, moderator])
        db.commit()
        
        # Test required fields
        with pytest.raises(IntegrityError):
            log = ModerationLog(
                # Missing required action
                user_id=user.id,
                moderator_id=moderator.id
            )
            db.add(log)
            db.commit()
        
        db.rollback()
        db.close()
    
    def test_soft_delete_for_moderated_content(self):
        """Test soft delete functionality for moderated content"""
        db = TestingSessionLocal()
        
        # Create test data
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        channel = Channel(name="test-channel", description="Test channel", created_by=1)
        post = Post(title="Test Post", content="Test content", channel_id=1, author_id=1)
        
        db.add_all([user, moderator, channel, post])
        db.commit()
        
        # Post should initially not be deleted
        assert post.deleted_at is None
        
        # Simulate moderation delete action
        post.deleted_at = datetime.now(timezone.utc)
        db.commit()
        
        # Post should now be marked as deleted
        assert post.deleted_at is not None
        
        db.close()
    
    def test_moderation_metadata_storage(self):
        """Test storing complex metadata in moderation actions"""
        db = TestingSessionLocal()
        
        # Create test data
        moderator = User(username="moderator", email="mod@example.com", password_hash="hashed", is_superuser=True)
        db.add(moderator)
        db.commit()
        
        # Create action with complex metadata
        complex_metadata = {
            "original_content": "Inappropriate message",
            "automated_flags": ["profanity", "spam"],
            "user_reports": 5,
            "ai_confidence": 0.85,
            "review_notes": "Clearly violates community guidelines"
        }
        
        action = ModerationAction(
            action_type=ActionType.DELETE,
            target_type=TargetType.POST,
            target_id=1,
            moderator_id=moderator.id,
            reason="Multiple violations",
            metadata=complex_metadata
        )
        
        db.add(action)
        db.commit()
        
        # Verify metadata was stored correctly
        assert action.metadata["original_content"] == "Inappropriate message"
        assert action.metadata["automated_flags"] == ["profanity", "spam"]
        assert action.metadata["user_reports"] == 5
        assert action.metadata["ai_confidence"] == 0.85
        assert action.metadata["review_notes"] == "Clearly violates community guidelines"
        
        db.close()