import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.app.main import app
from backend.app.models.models import User, Post, Reply, Vote
from backend.tests.conftest import TestingSessionLocal


client = TestClient(app)


class TestVoteAPI:
    """Test cases for voting API endpoints"""
    
    def test_vote_on_post_upvote(self, db: Session):
        """Test upvoting a post"""
        # Create test user and post
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Vote on post
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "upvote", "user_id": user.id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["vote_type"] == "upvote"
        assert data["user_id"] == user.id
        assert data["post_id"] == post.id
        assert data["reply_id"] is None
        
        # Verify post vote counts updated
        response = client.get(f"/api/posts/{post.id}")
        assert response.status_code == 200
        post_data = response.json()
        assert post_data["upvote_count"] == 1
        assert post_data["downvote_count"] == 0
        assert post_data["net_votes"] == 1
    
    def test_vote_on_post_downvote(self, db: Session):
        """Test downvoting a post"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Vote on post
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "downvote", "user_id": user.id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["vote_type"] == "downvote"
        
        # Verify post vote counts
        response = client.get(f"/api/posts/{post.id}")
        post_data = response.json()
        assert post_data["upvote_count"] == 0
        assert post_data["downvote_count"] == 1
        assert post_data["net_votes"] == -1
    
    def test_vote_on_reply_upvote(self, db: Session):
        """Test upvoting a reply"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.flush()
        
        reply = Reply(
            content="Test reply",
            author_id=user.id,
            post_id=post.id
        )
        db.add(reply)
        db.commit()
        
        # Vote on reply
        response = client.put(
            f"/api/replies/{reply.id}/vote",
            json={"vote_type": "upvote", "user_id": user.id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["vote_type"] == "upvote"
        assert data["user_id"] == user.id
        assert data["post_id"] is None
        assert data["reply_id"] == reply.id
        
        # Verify reply vote counts
        response = client.get(f"/api/replies/{reply.id}")
        reply_data = response.json()
        assert reply_data["upvote_count"] == 1
        assert reply_data["net_votes"] == 1
    
    def test_change_vote_from_upvote_to_downvote(self, db: Session):
        """Test changing vote from upvote to downvote"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Initial upvote
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "upvote", "user_id": user.id}
        )
        assert response.status_code == 200
        
        # Change to downvote
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "downvote", "user_id": user.id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["vote_type"] == "downvote"
        
        # Verify counts changed
        response = client.get(f"/api/posts/{post.id}")
        post_data = response.json()
        assert post_data["upvote_count"] == 0
        assert post_data["downvote_count"] == 1
        assert post_data["net_votes"] == -1
    
    def test_remove_vote_same_type(self, db: Session):
        """Test removing vote by sending same vote type"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Initial upvote
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "upvote", "user_id": user.id}
        )
        assert response.status_code == 200
        
        # Remove vote by sending same type
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "upvote", "user_id": user.id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Vote removed"
        
        # Verify counts reset
        response = client.get(f"/api/posts/{post.id}")
        post_data = response.json()
        assert post_data["upvote_count"] == 0
        assert post_data["downvote_count"] == 0
        assert post_data["net_votes"] == 0
    
    def test_get_user_vote_status(self, db: Session):
        """Test getting user's current vote on post/reply"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Vote on post
        client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "upvote", "user_id": user.id}
        )
        
        # Get vote status
        response = client.get(f"/api/posts/{post.id}/vote/{user.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["vote_type"] == "upvote"
        assert data["user_id"] == user.id
        assert data["post_id"] == post.id
    
    def test_get_vote_status_no_vote(self, db: Session):
        """Test getting vote status when user hasn't voted"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Get vote status without voting
        response = client.get(f"/api/posts/{post.id}/vote/{user.id}")
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Vote not found"
    
    def test_vote_nonexistent_post(self):
        """Test voting on non-existent post returns 404"""
        response = client.put(
            "/api/posts/99999/vote",
            json={"vote_type": "upvote", "user_id": 1}
        )
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Post not found"
    
    def test_vote_nonexistent_reply(self):
        """Test voting on non-existent reply returns 404"""
        response = client.put(
            "/api/replies/99999/vote",
            json={"vote_type": "upvote", "user_id": 1}
        )
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Reply not found"
    
    def test_vote_invalid_vote_type(self, db: Session):
        """Test voting with invalid vote type"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "invalid", "user_id": user.id}
        )
        assert response.status_code == 422  # Validation error
    
    def test_vote_missing_user_id(self, db: Session):
        """Test voting without user ID"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=user.id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        response = client.put(
            f"/api/posts/{post.id}/vote",
            json={"vote_type": "upvote"}
        )
        assert response.status_code == 422  # Validation error
    
    def test_get_post_votes_aggregated(self, db: Session):
        """Test getting aggregated vote counts for post"""
        # Create multiple users
        users = []
        for i in range(3):
            user = User(
                username=f"user{i}",
                email=f"user{i}@example.com",
                password_hash="hashedpassword"
            )
            users.append(user)
            db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=users[0].id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Add votes: 2 upvotes, 1 downvote
        client.put(f"/api/posts/{post.id}/vote", json={"vote_type": "upvote", "user_id": users[0].id})
        client.put(f"/api/posts/{post.id}/vote", json={"vote_type": "upvote", "user_id": users[1].id})
        client.put(f"/api/posts/{post.id}/vote", json={"vote_type": "downvote", "user_id": users[2].id})
        
        # Get vote summary
        response = client.get(f"/api/posts/{post.id}/votes")
        assert response.status_code == 200
        data = response.json()
        assert data["upvote_count"] == 2
        assert data["downvote_count"] == 1
        assert data["net_votes"] == 1
        assert data["total_votes"] == 3
    
    def test_get_reply_votes_aggregated(self, db: Session):
        """Test getting aggregated vote counts for reply"""
        users = []
        for i in range(3):
            user = User(
                username=f"user{i}",
                email=f"user{i}@example.com",
                password_hash="hashedpassword"
            )
            users.append(user)
            db.add(user)
        db.flush()
        
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=users[0].id,
            channel_id=1
        )
        db.add(post)
        db.flush()
        
        reply = Reply(
            content="Test reply",
            author_id=users[0].id,
            post_id=post.id
        )
        db.add(reply)
        db.commit()
        
        # Add votes
        client.put(f"/api/replies/{reply.id}/vote", json={"vote_type": "upvote", "user_id": users[1].id})
        client.put(f"/api/replies/{reply.id}/vote", json={"vote_type": "downvote", "user_id": users[2].id})
        
        # Get vote summary
        response = client.get(f"/api/replies/{reply.id}/votes")
        assert response.status_code == 200
        data = response.json()
        assert data["upvote_count"] == 1
        assert data["downvote_count"] == 1
        assert data["net_votes"] == 0
        assert data["total_votes"] == 2
    
    def test_get_user_votes_list(self, db: Session):
        """Test getting list of user's votes"""
        user = User(
            username="testuser",
            email="test@example.com",
            password_hash="hashedpassword"
        )
        db.add(user)
        db.flush()
        
        # Create posts and replies
        post1 = Post(title="Post 1", content="Content 1", author_id=user.id, channel_id=1)
        post2 = Post(title="Post 2", content="Content 2", author_id=user.id, channel_id=1)
        db.add_all([post1, post2])
        db.flush()
        
        reply1 = Reply(content="Reply 1", author_id=user.id, post_id=post1.id)
        db.add(reply1)
        db.commit()
        
        # Vote on posts and reply
        client.put(f"/api/posts/{post1.id}/vote", json={"vote_type": "upvote", "user_id": user.id})
        client.put(f"/api/posts/{post2.id}/vote", json={"vote_type": "downvote", "user_id": user.id})
        client.put(f"/api/replies/{reply1.id}/vote", json={"vote_type": "upvote", "user_id": user.id})
        
        # Get user's votes
        response = client.get(f"/api/users/{user.id}/votes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        
        # Verify vote types
        vote_types = [vote["vote_type"] for vote in data]
        assert "upvote" in vote_types
        assert "downvote" in vote_types
        
        # Verify targets
        post_votes = [vote for vote in data if vote["post_id"] is not None]
        reply_votes = [vote for vote in data if vote["reply_id"] is not None]
        assert len(post_votes) == 2
        assert len(reply_votes) == 1
    
    def test_bulk_vote_operations(self, db: Session):
        """Test performance with multiple votes"""
        # Create multiple users
        users = []
        for i in range(10):
            user = User(
                username=f"user{i}",
                email=f"user{i}@example.com", 
                password_hash="hashedpassword"
            )
            users.append(user)
            db.add(user)
        db.flush()
        
        post = Post(
            title="Popular Post",
            content="This will get many votes",
            author_id=users[0].id,
            channel_id=1
        )
        db.add(post)
        db.commit()
        
        # Add many votes
        for i, user in enumerate(users[1:]):
            vote_type = "upvote" if i % 2 == 0 else "downvote"
            response = client.put(
                f"/api/posts/{post.id}/vote",
                json={"vote_type": vote_type, "user_id": user.id}
            )
            assert response.status_code == 200
        
        # Check final counts
        response = client.get(f"/api/posts/{post.id}/votes")
        data = response.json()
        assert data["total_votes"] == 9  # 10 users minus author
        assert data["upvote_count"] + data["downvote_count"] == 9