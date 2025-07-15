import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.models import User, Message
from app.schemas.message import MessageCreate, MessageResponse

client = TestClient(app)

class TestMessageAPI:
    """Test suite for Message API endpoints"""
    
    def test_get_messages_empty_conversation(self, db: Session):
        """Test getting messages when no conversation exists"""
        # Create two users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Get messages between users (should be empty)
        response = client.get(f"/api/messages?other_user_id={user2.id}")
        
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_messages_with_conversation(self, db: Session):
        """Test getting messages from existing conversation"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create messages
        message1 = Message(
            content="Hello Bob!",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        message2 = Message(
            content="Hi Alice, how are you?",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        db.add_all([message1, message2])
        db.commit()
        
        # Get conversation (should return both messages ordered by created_at)
        response = client.get(f"/api/messages?other_user_id={user2.id}")
        
        assert response.status_code == 200
        messages = response.json()
        assert len(messages) == 2
        
        # Should be ordered by created_at (oldest first)
        assert messages[0]["content"] == "Hello Bob!"
        assert messages[0]["sender_id"] == user1.id
        assert messages[0]["recipient_id"] == user2.id
        
        assert messages[1]["content"] == "Hi Alice, how are you?"
        assert messages[1]["sender_id"] == user2.id
        assert messages[1]["recipient_id"] == user1.id
    
    def test_get_messages_pagination(self, db: Session):
        """Test message pagination with limit and offset"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create 5 messages
        messages = []
        for i in range(5):
            message = Message(
                content=f"Message {i+1}",
                sender_id=user1.id if i % 2 == 0 else user2.id,
                recipient_id=user2.id if i % 2 == 0 else user1.id
            )
            messages.append(message)
        
        db.add_all(messages)
        db.commit()
        
        # Test pagination: skip 2, limit 2
        response = client.get(f"/api/messages?other_user_id={user2.id}&skip=2&limit=2")
        
        assert response.status_code == 200
        result = response.json()
        assert len(result) == 2
        assert result[0]["content"] == "Message 3"
        assert result[1]["content"] == "Message 4"
    
    def test_get_messages_nonexistent_user(self, db: Session):
        """Test getting messages with non-existent user"""
        response = client.get("/api/messages?other_user_id=999")
        
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
    
    def test_create_message_success(self, db: Session):
        """Test creating a new message successfully"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create message data
        message_data = {
            "content": "Hello from Alice!",
            "recipient_id": user2.id
        }
        
        # Send message (assuming authenticated as user1)
        response = client.post("/api/messages", json=message_data)
        
        assert response.status_code == 201
        created_message = response.json()
        
        assert created_message["content"] == "Hello from Alice!"
        assert created_message["sender_id"] == user1.id
        assert created_message["recipient_id"] == user2.id
        assert "id" in created_message
        assert "created_at" in created_message
    
    def test_create_message_empty_content(self, db: Session):
        """Test creating message with empty content fails validation"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user2)
        
        # Try to create message with empty content
        message_data = {
            "content": "",
            "recipient_id": user2.id
        }
        
        response = client.post("/api/messages", json=message_data)
        
        assert response.status_code == 422
        assert "content cannot be empty" in str(response.json())
    
    def test_create_message_nonexistent_recipient(self, db: Session):
        """Test creating message to non-existent recipient"""
        message_data = {
            "content": "Hello!",
            "recipient_id": 999
        }
        
        response = client.post("/api/messages", json=message_data)
        
        assert response.status_code == 404
        assert "Recipient not found" in response.json()["detail"]
    
    def test_create_message_to_self(self, db: Session):
        """Test creating message to oneself should fail"""
        user = User(username="alice", email="alice@test.com", password_hash="hashed")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        message_data = {
            "content": "Message to myself",
            "recipient_id": user.id
        }
        
        # Assuming authenticated as the same user
        response = client.post("/api/messages", json=message_data)
        
        assert response.status_code == 400
        assert "Cannot send message to yourself" in response.json()["detail"]
    
    def test_get_conversations_list(self, db: Session):
        """Test getting list of all conversations for current user"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        user3 = User(username="charlie", email="charlie@test.com", password_hash="hashed")
        db.add_all([user1, user2, user3])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        db.refresh(user3)
        
        # Create messages from user1 to user2 and user3
        message1 = Message(
            content="Hello Bob!",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        message2 = Message(
            content="Hello Charlie!",
            sender_id=user1.id,
            recipient_id=user3.id
        )
        message3 = Message(
            content="Reply from Bob",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        db.add_all([message1, message2, message3])
        db.commit()
        
        # Get conversations for user1
        response = client.get("/api/conversations")
        
        assert response.status_code == 200
        conversations = response.json()
        
        # Should have 2 conversations
        assert len(conversations) == 2
        
        # Each conversation should have latest message and other user info
        conversation_users = {conv["other_user"]["id"] for conv in conversations}
        assert user2.id in conversation_users
        assert user3.id in conversation_users
        
        # Should include latest message for each conversation
        for conv in conversations:
            assert "latest_message" in conv
            assert "other_user" in conv
            assert "unread_count" in conv
    
    def test_mark_messages_as_read(self, db: Session):
        """Test marking messages as read"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create unread messages
        message1 = Message(
            content="Hello Alice!",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        message2 = Message(
            content="How are you?",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        db.add_all([message1, message2])
        db.commit()
        
        # Mark messages as read
        response = client.put(f"/api/messages/read?other_user_id={user2.id}")
        
        assert response.status_code == 200
        result = response.json()
        assert result["marked_as_read"] == 2
    
    def test_get_unread_messages_count(self, db: Session):
        """Test getting unread messages count"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create unread messages to user1
        for i in range(3):
            message = Message(
                content=f"Message {i+1}",
                sender_id=user2.id,
                recipient_id=user1.id
            )
            db.add(message)
        db.commit()
        
        # Get unread count
        response = client.get("/api/messages/unread-count")
        
        assert response.status_code == 200
        result = response.json()
        assert result["unread_count"] == 3
    
    def test_message_search(self, db: Session):
        """Test searching messages by content"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create messages with searchable content
        messages = [
            Message(content="Hello world", sender_id=user1.id, recipient_id=user2.id),
            Message(content="How are you doing?", sender_id=user2.id, recipient_id=user1.id),
            Message(content="Hello again", sender_id=user1.id, recipient_id=user2.id),
            Message(content="Goodbye", sender_id=user2.id, recipient_id=user1.id)
        ]
        db.add_all(messages)
        db.commit()
        
        # Search for "hello"
        response = client.get(f"/api/messages/search?query=hello&other_user_id={user2.id}")
        
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 2
        
        # Should find messages containing "hello" (case insensitive)
        contents = [msg["content"] for msg in results]
        assert "Hello world" in contents
        assert "Hello again" in contents
    
    def test_delete_message(self, db: Session):
        """Test deleting a message (soft delete)"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create message
        message = Message(
            content="Message to delete",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Delete message (only sender can delete)
        response = client.delete(f"/api/messages/{message.id}")
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Message deleted successfully"
        
        # Message should still exist but be marked as deleted
        db.refresh(message)
        assert hasattr(message, 'deleted_at')
    
    def test_delete_message_unauthorized(self, db: Session):
        """Test deleting message by non-sender fails"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        user3 = User(username="charlie", email="charlie@test.com", password_hash="hashed")
        db.add_all([user1, user2, user3])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        db.refresh(user3)
        
        # Create message from user1 to user2
        message = Message(
            content="Private message",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Try to delete as user3 (unauthorized)
        response = client.delete(f"/api/messages/{message.id}")
        
        assert response.status_code == 403
        assert "Not authorized to delete this message" in response.json()["detail"]