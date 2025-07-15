import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.models import User, Channel, Post
from app.database import get_db
from tests.conftest import TestingSessionLocal, engine
from app.models.models import Base


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestPostEndpoints:
    def setup_method(self):
        """Create tables before each test."""
        Base.metadata.create_all(bind=engine)
        
    def teardown_method(self):
        """Drop tables after each test."""
        Base.metadata.drop_all(bind=engine)

    def test_get_posts_by_channel_empty(self):
        """Test GET /channels/{id}/posts returns empty list when no posts exist."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        db.close()
        
        response = client.get(f"/channels/{channel_id}/posts")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []

    def test_get_posts_by_channel_with_data(self):
        """Test GET /channels/{id}/posts returns list of posts."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post1 = Post(title="First Post", content="First content", channel_id=channel.id, author_id=user.id)
        post2 = Post(title="Second Post", content="Second content", channel_id=channel.id, author_id=user.id)
        db.add_all([post1, post2])
        db.commit()
        channel_id = channel.id
        db.close()
        
        response = client.get(f"/channels/{channel_id}/posts")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 2
        
        post_titles = [post["title"] for post in data["data"]]
        assert "First Post" in post_titles
        assert "Second Post" in post_titles

    def test_get_posts_by_channel_not_found(self):
        """Test GET /channels/{id}/posts returns 404 for non-existent channel."""
        response = client.get("/channels/999/posts")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "channel not found" in data["error"]["message"].lower()

    def test_get_post_by_id_exists(self):
        """Test GET /posts/{id} returns specific post."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post = Post(title="Test Post", content="Test content", channel_id=channel.id, author_id=user.id)
        db.add(post)
        db.commit()
        post_id = post.id
        db.close()
        
        response = client.get(f"/posts/{post_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "Test Post"
        assert data["data"]["content"] == "Test content"
        assert data["data"]["id"] == post_id

    def test_get_post_by_id_not_found(self):
        """Test GET /posts/{id} returns 404 for non-existent post."""
        response = client.get("/posts/999")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["error"]["message"].lower()

    def test_create_post_valid(self):
        """Test POST /channels/{id}/posts creates new post."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        user_id = user.id
        db.close()
        
        post_data = {
            "title": "New Post",
            "content": "This is a new post content"
        }
        
        response = client.post(f"/channels/{channel_id}/posts", json=post_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["title"] == "New Post"
        assert data["data"]["content"] == "This is a new post content"
        assert data["data"]["channel_id"] == channel_id
        assert data["data"]["author_id"] == user_id
        assert "id" in data["data"]

    def test_create_post_invalid_data(self):
        """Test POST /channels/{id}/posts with invalid data returns 422."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        user_id = user.id
        db.close()
        
        post_data = {
            "title": "",  # Invalid empty title
            "content": "Valid content"
        }
        
        response = client.post(f"/channels/{channel_id}/posts", json=post_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False

    def test_create_post_missing_title(self):
        """Test POST /channels/{id}/posts without title returns 422."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        user_id = user.id
        db.close()
        
        post_data = {
            "content": "Valid content"
            # Missing title field
        }
        
        response = client.post(f"/channels/{channel_id}/posts", json=post_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 422

    def test_create_post_no_auth(self):
        """Test POST /channels/{id}/posts without authentication returns 401."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        db.close()
        
        post_data = {
            "title": "Test Post",
            "content": "Test content"
        }
        
        response = client.post(f"/channels/{channel_id}/posts", json=post_data)
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False

    def test_create_post_channel_not_found(self):
        """Test POST /channels/{id}/posts returns 404 for non-existent channel."""
        # Setup test user
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()
        
        post_data = {
            "title": "Test Post",
            "content": "Test content"
        }
        
        response = client.post("/channels/999/posts", json=post_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "channel not found" in data["error"]["message"].lower()

    def test_create_post_user_not_found(self):
        """Test POST /channels/{id}/posts returns 401 for non-existent user."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        db.close()
        
        post_data = {
            "title": "Test Post",
            "content": "Test content"
        }
        
        response = client.post(f"/channels/{channel_id}/posts", json=post_data, headers={"X-User-ID": "999"})
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False