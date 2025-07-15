import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.models import User, Channel
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


class TestChannelEndpoints:
    def setup_method(self):
        """Create tables before each test."""
        Base.metadata.create_all(bind=engine)
        
    def teardown_method(self):
        """Drop tables after each test."""
        Base.metadata.drop_all(bind=engine)

    def test_get_channels_empty(self):
        """Test GET /channels returns empty list when no channels exist."""
        response = client.get("/channels")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []

    def test_get_channels_with_data(self):
        """Test GET /channels returns list of channels."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel1 = Channel(name="general", description="General chat", created_by=user.id)
        channel2 = Channel(name="random", description="Random topics", created_by=user.id)
        db.add_all([channel1, channel2])
        db.commit()
        db.close()
        
        response = client.get("/channels")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 2
        
        channel_names = [channel["name"] for channel in data["data"]]
        assert "general" in channel_names
        assert "random" in channel_names

    def test_get_channel_by_id_exists(self):
        """Test GET /channels/{id} returns specific channel."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", description="General chat", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        db.close()
        
        response = client.get(f"/channels/{channel_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "general"
        assert data["data"]["description"] == "General chat"
        assert data["data"]["id"] == channel_id

    def test_get_channel_by_id_not_found(self):
        """Test GET /channels/{id} returns 404 for non-existent channel."""
        response = client.get("/channels/999")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["error"]["message"].lower()

    def test_create_channel_valid(self):
        """Test POST /channels creates new channel."""
        # Setup test user
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()
        
        channel_data = {
            "name": "new-channel",
            "description": "A new channel for testing"
        }
        
        # Mock authentication by passing user_id in headers (simplified for testing)
        response = client.post("/channels", json=channel_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "new-channel"
        assert data["data"]["description"] == "A new channel for testing"
        assert data["data"]["created_by"] == user_id
        assert "id" in data["data"]

    def test_create_channel_invalid_data(self):
        """Test POST /channels with invalid data returns 422."""
        # Setup test user
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()
        
        channel_data = {
            "name": "",  # Invalid empty name
            "description": "Test description"
        }
        
        response = client.post("/channels", json=channel_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False

    def test_create_channel_missing_name(self):
        """Test POST /channels without name returns 422."""
        # Setup test user
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        user_id = user.id
        db.close()
        
        channel_data = {
            "description": "Test description"
            # Missing name field
        }
        
        response = client.post("/channels", json=channel_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 422

    def test_create_channel_no_auth(self):
        """Test POST /channels without authentication returns 401."""
        channel_data = {
            "name": "test-channel",
            "description": "Test description"
        }
        
        response = client.post("/channels", json=channel_data)
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False

    def test_create_channel_duplicate_name(self):
        """Test POST /channels with duplicate name returns 400."""
        # Setup test data
        db = TestingSessionLocal()
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        existing_channel = Channel(name="duplicate", created_by=user.id)
        db.add(existing_channel)
        db.commit()
        user_id = user.id
        db.close()
        
        channel_data = {
            "name": "duplicate",
            "description": "This should fail"
        }
        
        response = client.post("/channels", json=channel_data, headers={"X-User-ID": str(user_id)})
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "already exists" in data["error"]["message"].lower()