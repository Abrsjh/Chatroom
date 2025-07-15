import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.models import Base, User, Channel, Post, Reply
from datetime import datetime

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def sample_data(db_session):
    """Create sample data for testing"""
    user1 = User(username="user1", email="user1@example.com", password_hash="hash1")
    user2 = User(username="user2", email="user2@example.com", password_hash="hash2")
    channel = Channel(name="general", description="General Discussion", created_by=user1)
    post = Post(title="Test Post", content="Test content", channel_id=channel.id, author_id=user1.id)
    
    db_session.add_all([user1, user2, channel, post])
    db_session.commit()
    
    return {
        'user1': user1,
        'user2': user2,
        'channel': channel,
        'post': post
    }

class TestThreadedReplyModel:
    """Test suite for threaded reply functionality"""
    
    def test_reply_with_parent_reply(self, db_session, sample_data):
        """Test that replies can have parent replies for threading"""
        post = sample_data['post']
        user1 = sample_data['user1']
        user2 = sample_data['user2']
        
        # Create parent reply
        parent_reply = Reply(
            content="This is a parent reply",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(parent_reply)
        db_session.commit()
        
        # Create child reply
        child_reply = Reply(
            content="This is a child reply",
            post_id=post.id,
            author_id=user2.id,
            parent_id=parent_reply.id
        )
        db_session.add(child_reply)
        db_session.commit()
        
        # Test relationships
        assert child_reply.parent == parent_reply
        assert parent_reply.children[0] == child_reply
        assert child_reply.parent_id == parent_reply.id
        assert len(parent_reply.children) == 1
    
    def test_nested_reply_hierarchy(self, db_session, sample_data):
        """Test multiple levels of nested replies"""
        post = sample_data['post']
        user1 = sample_data['user1']
        user2 = sample_data['user2']
        
        # Create a 3-level nested reply structure
        level1_reply = Reply(
            content="Level 1 reply",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(level1_reply)
        db_session.commit()
        
        level2_reply = Reply(
            content="Level 2 reply",
            post_id=post.id,
            author_id=user2.id,
            parent_id=level1_reply.id
        )
        db_session.add(level2_reply)
        db_session.commit()
        
        level3_reply = Reply(
            content="Level 3 reply",
            post_id=post.id,
            author_id=user1.id,
            parent_id=level2_reply.id
        )
        db_session.add(level3_reply)
        db_session.commit()
        
        # Test hierarchy
        assert level3_reply.parent == level2_reply
        assert level2_reply.parent == level1_reply
        assert level1_reply.parent is None
        
        assert len(level1_reply.children) == 1
        assert len(level2_reply.children) == 1
        assert len(level3_reply.children) == 0
    
    def test_reply_depth_calculation(self, db_session, sample_data):
        """Test that reply depth is calculated correctly"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create nested replies
        level1_reply = Reply(
            content="Level 1",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(level1_reply)
        db_session.commit()
        
        level2_reply = Reply(
            content="Level 2",
            post_id=post.id,
            author_id=user1.id,
            parent_id=level1_reply.id
        )
        db_session.add(level2_reply)
        db_session.commit()
        
        level3_reply = Reply(
            content="Level 3",
            post_id=post.id,
            author_id=user1.id,
            parent_id=level2_reply.id
        )
        db_session.add(level3_reply)
        db_session.commit()
        
        # Test depth property
        assert level1_reply.depth == 0
        assert level2_reply.depth == 1
        assert level3_reply.depth == 2
    
    def test_reply_thread_root(self, db_session, sample_data):
        """Test that replies can find their thread root"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create nested replies
        root_reply = Reply(
            content="Root reply",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(root_reply)
        db_session.commit()
        
        nested_reply = Reply(
            content="Nested reply",
            post_id=post.id,
            author_id=user1.id,
            parent_id=root_reply.id
        )
        db_session.add(nested_reply)
        db_session.commit()
        
        deep_nested_reply = Reply(
            content="Deep nested reply",
            post_id=post.id,
            author_id=user1.id,
            parent_id=nested_reply.id
        )
        db_session.add(deep_nested_reply)
        db_session.commit()
        
        # Test thread root
        assert root_reply.thread_root == root_reply
        assert nested_reply.thread_root == root_reply
        assert deep_nested_reply.thread_root == root_reply
    
    def test_reply_ancestors(self, db_session, sample_data):
        """Test that replies can retrieve their ancestors"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create 4-level nested structure
        level1 = Reply(content="Level 1", post_id=post.id, author_id=user1.id)
        db_session.add(level1)
        db_session.commit()
        
        level2 = Reply(content="Level 2", post_id=post.id, author_id=user1.id, parent_id=level1.id)
        db_session.add(level2)
        db_session.commit()
        
        level3 = Reply(content="Level 3", post_id=post.id, author_id=user1.id, parent_id=level2.id)
        db_session.add(level3)
        db_session.commit()
        
        level4 = Reply(content="Level 4", post_id=post.id, author_id=user1.id, parent_id=level3.id)
        db_session.add(level4)
        db_session.commit()
        
        # Test ancestors
        ancestors = level4.ancestors
        assert len(ancestors) == 3
        assert ancestors[0] == level3  # Immediate parent first
        assert ancestors[1] == level2
        assert ancestors[2] == level1  # Root last
    
    def test_reply_descendants(self, db_session, sample_data):
        """Test that replies can retrieve all descendants"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create tree structure
        root = Reply(content="Root", post_id=post.id, author_id=user1.id)
        db_session.add(root)
        db_session.commit()
        
        child1 = Reply(content="Child 1", post_id=post.id, author_id=user1.id, parent_id=root.id)
        child2 = Reply(content="Child 2", post_id=post.id, author_id=user1.id, parent_id=root.id)
        db_session.add_all([child1, child2])
        db_session.commit()
        
        grandchild1 = Reply(content="Grandchild 1", post_id=post.id, author_id=user1.id, parent_id=child1.id)
        grandchild2 = Reply(content="Grandchild 2", post_id=post.id, author_id=user1.id, parent_id=child2.id)
        db_session.add_all([grandchild1, grandchild2])
        db_session.commit()
        
        # Test descendants
        descendants = root.descendants
        assert len(descendants) == 4
        assert child1 in descendants
        assert child2 in descendants
        assert grandchild1 in descendants
        assert grandchild2 in descendants
    
    def test_reply_siblings(self, db_session, sample_data):
        """Test that replies can find their siblings"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create parent with multiple children
        parent = Reply(content="Parent", post_id=post.id, author_id=user1.id)
        db_session.add(parent)
        db_session.commit()
        
        child1 = Reply(content="Child 1", post_id=post.id, author_id=user1.id, parent_id=parent.id)
        child2 = Reply(content="Child 2", post_id=post.id, author_id=user1.id, parent_id=parent.id)
        child3 = Reply(content="Child 3", post_id=post.id, author_id=user1.id, parent_id=parent.id)
        db_session.add_all([child1, child2, child3])
        db_session.commit()
        
        # Test siblings
        siblings = child2.siblings
        assert len(siblings) == 2
        assert child1 in siblings
        assert child3 in siblings
        assert child2 not in siblings
    
    def test_reply_is_ancestor_of(self, db_session, sample_data):
        """Test ancestor relationship checking"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create nested structure
        ancestor = Reply(content="Ancestor", post_id=post.id, author_id=user1.id)
        db_session.add(ancestor)
        db_session.commit()
        
        parent = Reply(content="Parent", post_id=post.id, author_id=user1.id, parent_id=ancestor.id)
        db_session.add(parent)
        db_session.commit()
        
        child = Reply(content="Child", post_id=post.id, author_id=user1.id, parent_id=parent.id)
        db_session.add(child)
        db_session.commit()
        
        # Test ancestor relationships
        assert ancestor.is_ancestor_of(child)
        assert ancestor.is_ancestor_of(parent)
        assert parent.is_ancestor_of(child)
        assert not child.is_ancestor_of(parent)
        assert not parent.is_ancestor_of(ancestor)
    
    def test_reply_max_depth_limit(self, db_session, sample_data):
        """Test that replies respect maximum depth limit"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        # Create deeply nested structure
        current_reply = None
        replies = []
        
        for i in range(10):  # Create 10 levels
            reply = Reply(
                content=f"Level {i}",
                post_id=post.id,
                author_id=user1.id,
                parent_id=current_reply.id if current_reply else None
            )
            db_session.add(reply)
            db_session.commit()
            replies.append(reply)
            current_reply = reply
        
        # Test that depth is calculated correctly
        assert replies[0].depth == 0
        assert replies[5].depth == 5
        assert replies[9].depth == 9
        
        # Test that can_reply_to respects max depth
        assert replies[0].can_reply_to  # Should allow replies at level 0
        assert replies[4].can_reply_to  # Should allow replies at level 4
        assert not replies[9].can_reply_to  # Should not allow replies at max depth
    
    def test_reply_updated_at_field(self, db_session, sample_data):
        """Test that replies have updated_at field for editing"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        reply = Reply(
            content="Original content",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(reply)
        db_session.commit()
        
        original_updated_at = reply.updated_at
        
        # Update reply content
        reply.content = "Updated content"
        db_session.commit()
        
        # Test that updated_at changed
        assert reply.updated_at > original_updated_at
        assert reply.is_edited
    
    def test_reply_deletion_soft_delete(self, db_session, sample_data):
        """Test that replies support soft deletion"""
        post = sample_data['post']
        user1 = sample_data['user1']
        
        reply = Reply(
            content="This will be deleted",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(reply)
        db_session.commit()
        
        # Soft delete
        reply.deleted_at = datetime.utcnow()
        db_session.commit()
        
        # Test soft deletion
        assert reply.is_deleted
        assert reply.deleted_at is not None
        assert reply.content == "This will be deleted"  # Content preserved
    
    def test_reply_vote_count_calculation(self, db_session, sample_data):
        """Test that replies can calculate vote counts"""
        post = sample_data['post']
        user1 = sample_data['user1']
        user2 = sample_data['user2']
        
        reply = Reply(
            content="Test reply",
            post_id=post.id,
            author_id=user1.id
        )
        db_session.add(reply)
        db_session.commit()
        
        # This test will fail until we implement reply voting
        # For now, just test that the properties exist
        assert hasattr(reply, 'upvote_count')
        assert hasattr(reply, 'downvote_count')
        assert hasattr(reply, 'net_votes')
        assert reply.upvote_count == 0
        assert reply.downvote_count == 0
        assert reply.net_votes == 0