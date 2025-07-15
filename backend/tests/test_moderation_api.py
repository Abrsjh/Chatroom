import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.models import User, Post, Reply, Channel, ModerationAction, ActionType, TargetType
from backend.tests.conftest import TestingSessionLocal, get_test_db


client = TestClient(app)


class TestModerationAPI:
    """Test moderation API endpoints"""
    
    def setup_method(self):
        """Set up test data for each test"""
        self.db = TestingSessionLocal()
        
        # Create test users
        self.regular_user = User(
            username="regular_user",
            email="user@example.com",
            password_hash="hashed"
        )
        
        self.moderator = User(
            username="moderator",
            email="mod@example.com",
            password_hash="hashed",
            is_superuser=True
        )
        
        # Create test channel
        self.channel = Channel(
            name="test-channel",
            description="Test channel",
            created_by=1
        )
        
        # Create test post
        self.post = Post(
            title="Test Post",
            content="Test content",
            channel_id=1,
            author_id=1
        )
        
        # Create test reply
        self.reply = Reply(
            content="Test reply",
            post_id=1,
            author_id=1
        )
        
        self.db.add_all([self.regular_user, self.moderator, self.channel, self.post, self.reply])
        self.db.commit()
    
    def teardown_method(self):
        """Clean up after each test"""
        self.db.close()
    
    def test_delete_post_as_moderator(self):
        """Test deleting a post as a moderator"""
        # Mock authentication to return moderator
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.delete(
                f"/api/moderation/posts/{self.post.id}",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={"reason": "Inappropriate content"}
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Post deleted successfully"
        
        # Verify post was soft deleted
        self.db.refresh(self.post)
        assert self.post.deleted_at is not None
        
        # Verify moderation action was logged
        action = self.db.query(ModerationAction).filter_by(
            target_type=TargetType.POST,
            target_id=self.post.id
        ).first()
        assert action is not None
        assert action.action_type == ActionType.DELETE
        assert action.reason == "Inappropriate content"
    
    def test_delete_post_as_regular_user_forbidden(self):
        """Test that regular users cannot delete posts"""
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.delete(
                f"/api/moderation/posts/{self.post.id}",
                headers={"Authorization": f"Bearer {self.get_user_token()}"},
                json={"reason": "Inappropriate content"}
            )
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]
    
    def test_flag_post_as_moderator(self):
        """Test flagging a post as a moderator"""
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.put(
                f"/api/moderation/posts/{self.post.id}/flag",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={"reason": "Needs review"}
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Post flagged successfully"
        
        # Verify moderation action was logged
        action = self.db.query(ModerationAction).filter_by(
            target_type=TargetType.POST,
            target_id=self.post.id,
            action_type=ActionType.FLAG
        ).first()
        assert action is not None
        assert action.reason == "Needs review"
    
    def test_approve_post_as_moderator(self):
        """Test approving a flagged post as a moderator"""
        # First flag the post
        flag_action = ModerationAction(
            action_type=ActionType.FLAG,
            target_type=TargetType.POST,
            target_id=self.post.id,
            moderator_id=self.moderator.id,
            reason="Needs review"
        )
        self.db.add(flag_action)
        self.db.commit()
        
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.put(
                f"/api/moderation/posts/{self.post.id}/approve",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={"reason": "Content is acceptable"}
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Post approved successfully"
        
        # Verify approval action was logged
        action = self.db.query(ModerationAction).filter_by(
            target_type=TargetType.POST,
            target_id=self.post.id,
            action_type=ActionType.APPROVE
        ).first()
        assert action is not None
        assert action.reason == "Content is acceptable"
    
    def test_delete_reply_as_moderator(self):
        """Test deleting a reply as a moderator"""
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.delete(
                f"/api/moderation/replies/{self.reply.id}",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={"reason": "Spam content"}
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Reply deleted successfully"
        
        # Verify reply was soft deleted
        self.db.refresh(self.reply)
        assert self.reply.deleted_at is not None
        
        # Verify moderation action was logged
        action = self.db.query(ModerationAction).filter_by(
            target_type=TargetType.REPLY,
            target_id=self.reply.id
        ).first()
        assert action is not None
        assert action.action_type == ActionType.DELETE
    
    def test_warn_user_as_moderator(self):
        """Test warning a user as a moderator"""
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.post(
                f"/api/moderation/users/{self.regular_user.id}/warn",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={
                    "reason": "Inappropriate behavior",
                    "details": "User has been posting spam content"
                }
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "User warned successfully"
        
        # Verify warning action was logged
        action = self.db.query(ModerationAction).filter_by(
            target_type=TargetType.USER,
            target_id=self.regular_user.id,
            action_type=ActionType.WARN
        ).first()
        assert action is not None
        assert action.reason == "Inappropriate behavior"
    
    def test_ban_user_as_moderator(self):
        """Test banning a user as a moderator"""
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.post(
                f"/api/moderation/users/{self.regular_user.id}/ban",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={
                    "reason": "Repeated violations",
                    "duration_days": 7
                }
            )
        
        assert response.status_code == 200
        assert response.json()["message"] == "User banned successfully"
        
        # Verify user was deactivated
        self.db.refresh(self.regular_user)
        assert self.regular_user.is_active is False
        
        # Verify ban action was logged
        action = self.db.query(ModerationAction).filter_by(
            target_type=TargetType.USER,
            target_id=self.regular_user.id,
            action_type=ActionType.BAN
        ).first()
        assert action is not None
        assert action.reason == "Repeated violations"
        assert action.metadata["duration_days"] == 7
    
    def test_get_moderation_logs(self):
        """Test retrieving moderation logs"""
        # Create some moderation actions
        actions = [
            ModerationAction(
                action_type=ActionType.DELETE,
                target_type=TargetType.POST,
                target_id=self.post.id,
                moderator_id=self.moderator.id,
                reason="Spam"
            ),
            ModerationAction(
                action_type=ActionType.WARN,
                target_type=TargetType.USER,
                target_id=self.regular_user.id,
                moderator_id=self.moderator.id,
                reason="Inappropriate content"
            )
        ]
        
        self.db.add_all(actions)
        self.db.commit()
        
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.get(
                "/api/moderation/logs",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"}
            )
        
        assert response.status_code == 200
        logs = response.json()["data"]
        assert len(logs) == 2
        assert logs[0]["action_type"] == "delete"
        assert logs[1]["action_type"] == "warn"
    
    def test_get_moderation_logs_with_filters(self):
        """Test retrieving moderation logs with filters"""
        # Create moderation actions
        actions = [
            ModerationAction(
                action_type=ActionType.DELETE,
                target_type=TargetType.POST,
                target_id=self.post.id,
                moderator_id=self.moderator.id,
                reason="Spam"
            ),
            ModerationAction(
                action_type=ActionType.FLAG,
                target_type=TargetType.POST,
                target_id=self.post.id,
                moderator_id=self.moderator.id,
                reason="Review needed"
            )
        ]
        
        self.db.add_all(actions)
        self.db.commit()
        
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.get(
                "/api/moderation/logs?action_type=delete&target_type=post",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"}
            )
        
        assert response.status_code == 200
        logs = response.json()["data"]
        assert len(logs) == 1
        assert logs[0]["action_type"] == "delete"
        assert logs[0]["target_type"] == "post"
    
    def test_unauthorized_access_to_moderation_endpoints(self):
        """Test that unauthorized users cannot access moderation endpoints"""
        response = client.delete(f"/api/moderation/posts/{self.post.id}")
        assert response.status_code == 401
        
        response = client.get("/api/moderation/logs")
        assert response.status_code == 401
    
    def test_moderation_action_not_found(self):
        """Test handling of non-existent posts/replies in moderation"""
        with app.dependency_overrides:
            app.dependency_overrides[get_test_db] = lambda: self.db
            
            response = client.delete(
                "/api/moderation/posts/999",
                headers={"Authorization": f"Bearer {self.get_moderator_token()}"},
                json={"reason": "Test"}
            )
        
        assert response.status_code == 404
        assert "Post not found" in response.json()["detail"]
    
    def get_moderator_token(self):
        """Helper method to get a moderator JWT token"""
        # This would be implemented based on your auth system
        return "mock_moderator_token"
    
    def get_user_token(self):
        """Helper method to get a regular user JWT token"""
        # This would be implemented based on your auth system
        return "mock_user_token"