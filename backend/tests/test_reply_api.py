import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.main import app
from backend.app.models.models import Base, User, Channel, Post, Reply
from backend.app.database import get_db
import json

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def sample_data():
    """Create sample data for testing"""
    db = TestingSessionLocal()
    
    user1 = User(username="user1", email="user1@example.com", password_hash="hash1")
    user2 = User(username="user2", email="user2@example.com", password_hash="hash2")
    channel = Channel(name="general", description="General Discussion", created_by=user1)
    post = Post(title="Test Post", content="Test content", channel_id=channel.id, author_id=user1.id)
    
    db.add_all([user1, user2, channel, post])
    db.commit()
    
    data = {
        'user1_id': user1.id,
        'user2_id': user2.id,
        'channel_id': channel.id,
        'post_id': post.id
    }
    
    db.close()
    return data

class TestReplyAPIEndpoints:
    """Test suite for Reply API endpoints"""
    
    def test_get_post_replies_empty(self, client, sample_data):
        """Test GET /posts/{post_id}/replies with no replies"""
        post_id = sample_data['post_id']
        
        response = client.get(f"/posts/{post_id}/replies")
        
        assert response.status_code == 200
        replies = response.json()
        assert isinstance(replies, list)
        assert len(replies) == 0
    
    def test_get_post_replies_with_data(self, client, sample_data):
        """Test GET /posts/{post_id}/replies with existing replies"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create test replies directly in database
        db = TestingSessionLocal()
        reply1 = Reply(content="First reply", post_id=post_id, author_id=user1_id)
        reply2 = Reply(content="Second reply", post_id=post_id, author_id=user1_id)
        db.add_all([reply1, reply2])
        db.commit()
        db.close()
        
        response = client.get(f"/posts/{post_id}/replies")
        
        assert response.status_code == 200
        replies = response.json()
        assert len(replies) == 2
        assert replies[0]['content'] == "First reply"
        assert replies[1]['content'] == "Second reply"
    
    def test_get_post_replies_threaded_structure(self, client, sample_data):
        """Test GET /posts/{post_id}/replies returns threaded structure"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create nested replies
        db = TestingSessionLocal()
        parent_reply = Reply(content="Parent reply", post_id=post_id, author_id=user1_id)
        db.add(parent_reply)
        db.commit()
        
        child_reply = Reply(content="Child reply", post_id=post_id, author_id=user1_id, parent_id=parent_reply.id)
        db.add(child_reply)
        db.commit()
        db.close()
        
        response = client.get(f"/posts/{post_id}/replies")
        
        assert response.status_code == 200
        replies = response.json()
        
        # Should return hierarchical structure
        parent = next(r for r in replies if r['content'] == "Parent reply")
        child = next(r for r in replies if r['content'] == "Child reply")
        
        assert parent['parent_id'] is None
        assert child['parent_id'] == parent['id']
        assert parent['depth'] == 0
        assert child['depth'] == 1
    
    def test_get_post_replies_with_pagination(self, client, sample_data):
        """Test GET /posts/{post_id}/replies with pagination"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create many replies
        db = TestingSessionLocal()
        for i in range(25):
            reply = Reply(content=f"Reply {i}", post_id=post_id, author_id=user1_id)
            db.add(reply)
        db.commit()
        db.close()
        
        # Test pagination
        response = client.get(f"/posts/{post_id}/replies?skip=0&limit=10")
        assert response.status_code == 200
        replies = response.json()
        assert len(replies) == 10
        
        # Test second page
        response = client.get(f"/posts/{post_id}/replies?skip=10&limit=10")
        assert response.status_code == 200
        replies = response.json()
        assert len(replies) == 10
        
        # Test third page
        response = client.get(f"/posts/{post_id}/replies?skip=20&limit=10")
        assert response.status_code == 200
        replies = response.json()
        assert len(replies) == 5
    
    def test_get_post_replies_sorted_by_creation(self, client, sample_data):
        """Test GET /posts/{post_id}/replies returns replies sorted by creation time"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create replies with different times
        db = TestingSessionLocal()
        reply1 = Reply(content="First", post_id=post_id, author_id=user1_id)
        reply2 = Reply(content="Second", post_id=post_id, author_id=user1_id)
        reply3 = Reply(content="Third", post_id=post_id, author_id=user1_id)
        db.add_all([reply1, reply2, reply3])
        db.commit()
        db.close()
        
        response = client.get(f"/posts/{post_id}/replies")
        
        assert response.status_code == 200
        replies = response.json()
        
        # Should be sorted by creation time (oldest first)
        assert replies[0]['content'] == "First"
        assert replies[1]['content'] == "Second"
        assert replies[2]['content'] == "Third"
    
    def test_get_post_replies_nonexistent_post(self, client):
        """Test GET /posts/{post_id}/replies with non-existent post"""
        response = client.get("/posts/99999/replies")
        
        assert response.status_code == 404
        assert "Post not found" in response.json()['detail']
    
    def test_create_reply_success(self, client, sample_data):
        """Test POST /posts/{post_id}/replies creates a new reply"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        reply_data = {
            "content": "This is a new reply",
            "author_id": user1_id
        }
        
        response = client.post(f"/posts/{post_id}/replies", json=reply_data)
        
        assert response.status_code == 201
        reply = response.json()
        assert reply['content'] == "This is a new reply"
        assert reply['post_id'] == post_id
        assert reply['author_id'] == user1_id
        assert reply['parent_id'] is None
        assert reply['depth'] == 0
    
    def test_create_nested_reply_success(self, client, sample_data):
        """Test POST /posts/{post_id}/replies creates nested reply"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create parent reply first
        db = TestingSessionLocal()
        parent_reply = Reply(content="Parent reply", post_id=post_id, author_id=user1_id)
        db.add(parent_reply)
        db.commit()
        parent_id = parent_reply.id
        db.close()
        
        # Create child reply
        reply_data = {
            "content": "This is a child reply",
            "author_id": user1_id,
            "parent_id": parent_id
        }
        
        response = client.post(f"/posts/{post_id}/replies", json=reply_data)
        
        assert response.status_code == 201
        reply = response.json()
        assert reply['content'] == "This is a child reply"
        assert reply['parent_id'] == parent_id
        assert reply['depth'] == 1
    
    def test_create_reply_validation_errors(self, client, sample_data):
        """Test POST /posts/{post_id}/replies with validation errors"""
        post_id = sample_data['post_id']
        
        # Missing content
        response = client.post(f"/posts/{post_id}/replies", json={
            "author_id": sample_data['user1_id']
        })
        assert response.status_code == 422
        
        # Empty content
        response = client.post(f"/posts/{post_id}/replies", json={
            "content": "",
            "author_id": sample_data['user1_id']
        })
        assert response.status_code == 422
        
        # Content too long
        response = client.post(f"/posts/{post_id}/replies", json={
            "content": "x" * 10001,  # Assuming max length is 10000
            "author_id": sample_data['user1_id']
        })
        assert response.status_code == 422
        
        # Missing author_id
        response = client.post(f"/posts/{post_id}/replies", json={
            "content": "Test content"
        })
        assert response.status_code == 422
    
    def test_create_reply_nonexistent_post(self, client, sample_data):
        """Test POST /posts/{post_id}/replies with non-existent post"""
        reply_data = {
            "content": "This is a reply",
            "author_id": sample_data['user1_id']
        }
        
        response = client.post("/posts/99999/replies", json=reply_data)
        
        assert response.status_code == 404
        assert "Post not found" in response.json()['detail']
    
    def test_create_reply_nonexistent_parent(self, client, sample_data):
        """Test POST /posts/{post_id}/replies with non-existent parent"""
        post_id = sample_data['post_id']
        
        reply_data = {
            "content": "This is a reply",
            "author_id": sample_data['user1_id'],
            "parent_id": 99999
        }
        
        response = client.post(f"/posts/{post_id}/replies", json=reply_data)
        
        assert response.status_code == 404
        assert "Parent reply not found" in response.json()['detail']
    
    def test_create_reply_max_depth_exceeded(self, client, sample_data):
        """Test POST /posts/{post_id}/replies respects maximum depth"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create deeply nested structure (assuming max depth is 10)
        db = TestingSessionLocal()
        current_parent = None
        for i in range(10):
            reply = Reply(
                content=f"Level {i}",
                post_id=post_id,
                author_id=user1_id,
                parent_id=current_parent
            )
            db.add(reply)
            db.commit()
            current_parent = reply.id
        db.close()
        
        # Try to create reply at max depth + 1
        reply_data = {
            "content": "This should fail",
            "author_id": user1_id,
            "parent_id": current_parent
        }
        
        response = client.post(f"/posts/{post_id}/replies", json=reply_data)
        
        assert response.status_code == 400
        assert "Maximum reply depth exceeded" in response.json()['detail']
    
    def test_get_reply_by_id(self, client, sample_data):
        """Test GET /replies/{reply_id} gets specific reply"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create reply
        db = TestingSessionLocal()
        reply = Reply(content="Test reply", post_id=post_id, author_id=user1_id)
        db.add(reply)
        db.commit()
        reply_id = reply.id
        db.close()
        
        response = client.get(f"/replies/{reply_id}")
        
        assert response.status_code == 200
        reply_data = response.json()
        assert reply_data['id'] == reply_id
        assert reply_data['content'] == "Test reply"
        assert reply_data['post_id'] == post_id
        assert reply_data['author_id'] == user1_id
    
    def test_get_reply_by_id_nonexistent(self, client):
        """Test GET /replies/{reply_id} with non-existent reply"""
        response = client.get("/replies/99999")
        
        assert response.status_code == 404
        assert "Reply not found" in response.json()['detail']
    
    def test_update_reply_success(self, client, sample_data):
        """Test PUT /replies/{reply_id} updates reply"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create reply
        db = TestingSessionLocal()
        reply = Reply(content="Original content", post_id=post_id, author_id=user1_id)
        db.add(reply)
        db.commit()
        reply_id = reply.id
        db.close()
        
        # Update reply
        update_data = {
            "content": "Updated content"
        }
        
        response = client.put(f"/replies/{reply_id}", json=update_data)
        
        assert response.status_code == 200
        updated_reply = response.json()
        assert updated_reply['content'] == "Updated content"
        assert updated_reply['is_edited'] is True
    
    def test_delete_reply_success(self, client, sample_data):
        """Test DELETE /replies/{reply_id} soft deletes reply"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create reply
        db = TestingSessionLocal()
        reply = Reply(content="To be deleted", post_id=post_id, author_id=user1_id)
        db.add(reply)
        db.commit()
        reply_id = reply.id
        db.close()
        
        # Delete reply
        response = client.delete(f"/replies/{reply_id}")
        
        assert response.status_code == 200
        assert response.json()['message'] == "Reply deleted successfully"
        
        # Verify soft deletion
        response = client.get(f"/replies/{reply_id}")
        assert response.status_code == 404  # Soft deleted replies should not be accessible
    
    def test_get_reply_thread(self, client, sample_data):
        """Test GET /replies/{reply_id}/thread gets entire thread"""
        post_id = sample_data['post_id']
        user1_id = sample_data['user1_id']
        
        # Create threaded structure
        db = TestingSessionLocal()
        root = Reply(content="Root", post_id=post_id, author_id=user1_id)
        db.add(root)
        db.commit()
        
        child1 = Reply(content="Child 1", post_id=post_id, author_id=user1_id, parent_id=root.id)
        child2 = Reply(content="Child 2", post_id=post_id, author_id=user1_id, parent_id=root.id)
        db.add_all([child1, child2])
        db.commit()
        
        grandchild = Reply(content="Grandchild", post_id=post_id, author_id=user1_id, parent_id=child1.id)
        db.add(grandchild)
        db.commit()
        
        child1_id = child1.id
        db.close()
        
        # Get thread from child1
        response = client.get(f"/replies/{child1_id}/thread")
        
        assert response.status_code == 200
        thread = response.json()
        
        # Should return root and all descendants
        assert len(thread) == 4  # root, child1, child2, grandchild
        contents = [r['content'] for r in thread]
        assert "Root" in contents
        assert "Child 1" in contents
        assert "Child 2" in contents
        assert "Grandchild" in contents