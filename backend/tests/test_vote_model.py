import pytest
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from backend.app.models.models import Vote, User, Post, Reply
from backend.app.database import get_db
from backend.tests.conftest import TestingSessionLocal


class TestVoteModel:
    """Test cases for Vote model functionality"""
    
    def test_vote_model_creation(self, db: Session):
        """Test basic Vote model creation"""
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
        db.flush()
        
        # Create vote
        vote = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="upvote"
        )
        db.add(vote)
        db.commit()
        
        # Verify vote creation
        assert vote.id is not None
        assert vote.user_id == user.id
        assert vote.post_id == post.id
        assert vote.reply_id is None
        assert vote.vote_type == "upvote"
        assert vote.created_at is not None
        assert vote.updated_at is not None
    
    def test_vote_model_reply_voting(self, db: Session):
        """Test voting on replies"""
        # Create test user, post, and reply
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
        db.flush()
        
        # Create vote on reply
        vote = Vote(
            user_id=user.id,
            reply_id=reply.id,
            vote_type="downvote"
        )
        db.add(vote)
        db.commit()
        
        # Verify reply vote
        assert vote.id is not None
        assert vote.user_id == user.id
        assert vote.post_id is None
        assert vote.reply_id == reply.id
        assert vote.vote_type == "downvote"
    
    def test_vote_type_validation(self, db: Session):
        """Test vote type must be upvote or downvote"""
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
        
        # This should fail with invalid vote type
        vote = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="invalid_vote"
        )
        db.add(vote)
        
        with pytest.raises(Exception):  # Should raise constraint violation
            db.commit()
    
    def test_user_cannot_vote_twice_same_post(self, db: Session):
        """Test user cannot vote multiple times on same post"""
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
        
        # First vote
        vote1 = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="upvote"
        )
        db.add(vote1)
        db.commit()
        
        # Second vote should fail
        vote2 = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="downvote"
        )
        db.add(vote2)
        
        with pytest.raises(IntegrityError):
            db.commit()
    
    def test_user_cannot_vote_twice_same_reply(self, db: Session):
        """Test user cannot vote multiple times on same reply"""
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
        db.flush()
        
        # First vote
        vote1 = Vote(
            user_id=user.id,
            reply_id=reply.id,
            vote_type="upvote"
        )
        db.add(vote1)
        db.commit()
        
        # Second vote should fail
        vote2 = Vote(
            user_id=user.id,
            reply_id=reply.id,
            vote_type="downvote"
        )
        db.add(vote2)
        
        with pytest.raises(IntegrityError):
            db.commit()
    
    def test_vote_must_target_post_or_reply(self, db: Session):
        """Test vote must target either post or reply, not both or neither"""
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
        db.flush()
        
        # Vote targeting both post and reply should fail
        vote_both = Vote(
            user_id=user.id,
            post_id=post.id,
            reply_id=reply.id,
            vote_type="upvote"
        )
        db.add(vote_both)
        
        with pytest.raises(Exception):
            db.commit()
        
        db.rollback()
        
        # Vote targeting neither should fail
        vote_neither = Vote(
            user_id=user.id,
            vote_type="upvote"
        )
        db.add(vote_neither)
        
        with pytest.raises(Exception):
            db.commit()
    
    def test_vote_relationships(self, db: Session):
        """Test Vote model relationships with User, Post, and Reply"""
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
        db.flush()
        
        # Create post vote
        post_vote = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="upvote"
        )
        db.add(post_vote)
        
        # Create reply vote from different user
        user2 = User(
            username="user2",
            email="user2@example.com",
            password_hash="hashedpassword"
        )
        db.add(user2)
        db.flush()
        
        reply_vote = Vote(
            user_id=user2.id,
            reply_id=reply.id,
            vote_type="downvote"
        )
        db.add(reply_vote)
        db.commit()
        
        # Test relationships
        assert post_vote.user == user
        assert post_vote.post == post
        assert post_vote.reply is None
        
        assert reply_vote.user == user2
        assert reply_vote.post is None
        assert reply_vote.reply == reply
        
        # Test back-references
        assert post_vote in user.votes
        assert reply_vote in user2.votes
        assert post_vote in post.votes
        assert reply_vote in reply.votes
    
    def test_vote_aggregation_properties(self, db: Session):
        """Test vote count and score calculation"""
        # Create users
        users = []
        for i in range(5):
            user = User(
                username=f"user{i}",
                email=f"user{i}@example.com",
                password_hash="hashedpassword"
            )
            users.append(user)
            db.add(user)
        db.flush()
        
        # Create post
        post = Post(
            title="Test Post",
            content="Test content",
            author_id=users[0].id,
            channel_id=1
        )
        db.add(post)
        db.flush()
        
        # Create votes: 3 upvotes, 1 downvote
        votes = [
            Vote(user_id=users[1].id, post_id=post.id, vote_type="upvote"),
            Vote(user_id=users[2].id, post_id=post.id, vote_type="upvote"),
            Vote(user_id=users[3].id, post_id=post.id, vote_type="upvote"),
            Vote(user_id=users[4].id, post_id=post.id, vote_type="downvote"),
        ]
        
        for vote in votes:
            db.add(vote)
        db.commit()
        
        # Refresh post to get updated vote counts
        db.refresh(post)
        
        # Test aggregated properties
        assert post.upvote_count == 3
        assert post.downvote_count == 1
        assert post.net_votes == 2  # 3 - 1
        assert post.total_votes == 4  # 3 + 1
    
    def test_vote_update_changes_timestamp(self, db: Session):
        """Test updating vote changes updated_at timestamp"""
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
        
        vote = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="upvote"
        )
        db.add(vote)
        db.commit()
        
        original_updated_at = vote.updated_at
        
        # Update vote
        vote.vote_type = "downvote"
        db.commit()
        
        assert vote.updated_at > original_updated_at
    
    def test_cascade_delete_user(self, db: Session):
        """Test votes are deleted when user is deleted"""
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
        
        vote = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="upvote"
        )
        db.add(vote)
        db.commit()
        
        vote_id = vote.id
        
        # Delete user
        db.delete(user)
        db.commit()
        
        # Vote should be deleted
        deleted_vote = db.query(Vote).filter(Vote.id == vote_id).first()
        assert deleted_vote is None
    
    def test_cascade_delete_post(self, db: Session):
        """Test votes are deleted when post is deleted"""
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
        
        vote = Vote(
            user_id=user.id,
            post_id=post.id,
            vote_type="upvote"
        )
        db.add(vote)
        db.commit()
        
        vote_id = vote.id
        
        # Delete post
        db.delete(post)
        db.commit()
        
        # Vote should be deleted
        deleted_vote = db.query(Vote).filter(Vote.id == vote_id).first()
        assert deleted_vote is None
    
    def test_cascade_delete_reply(self, db: Session):
        """Test votes are deleted when reply is deleted"""
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
        db.flush()
        
        vote = Vote(
            user_id=user.id,
            reply_id=reply.id,
            vote_type="upvote"
        )
        db.add(vote)
        db.commit()
        
        vote_id = vote.id
        
        # Delete reply
        db.delete(reply)
        db.commit()
        
        # Vote should be deleted
        deleted_vote = db.query(Vote).filter(Vote.id == vote_id).first()
        assert deleted_vote is None