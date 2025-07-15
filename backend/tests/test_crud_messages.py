import pytest
from sqlalchemy.orm import Session
from app.crud.message import (
    create_message,
    get_conversation,
    get_conversations,
    mark_messages_as_read,
    get_unread_count,
    search_messages,
    delete_message
)
from app.models.models import User, Message
from app.schemas.message import MessageCreate

class TestMessageCRUD:
    """Test suite for Message CRUD operations"""
    
    def test_create_message_success(self, db: Session):
        """Test creating a message successfully"""
        # Create users
        sender = User(username="alice", email="alice@test.com", password_hash="hashed")
        recipient = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([sender, recipient])
        db.commit()
        db.refresh(sender)
        db.refresh(recipient)
        
        # Create message
        message_data = MessageCreate(
            content="Hello Bob!",
            recipient_id=recipient.id
        )
        
        created_message = create_message(db, message_data, sender.id)
        
        assert created_message.content == "Hello Bob!"
        assert created_message.sender_id == sender.id
        assert created_message.recipient_id == recipient.id
        assert created_message.id is not None
        assert created_message.created_at is not None
        assert not hasattr(created_message, 'read_at')  # Should be unread initially
    
    def test_get_conversation_empty(self, db: Session):
        """Test getting conversation when no messages exist"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        messages = get_conversation(db, user1.id, user2.id)
        
        assert messages == []
    
    def test_get_conversation_with_messages(self, db: Session):
        """Test getting conversation with existing messages"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create messages in both directions
        message1 = Message(
            content="Hello Bob!",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        message2 = Message(
            content="Hi Alice!",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        message3 = Message(
            content="How are you?",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        db.add_all([message1, message2, message3])
        db.commit()
        
        # Get conversation
        messages = get_conversation(db, user1.id, user2.id)
        
        assert len(messages) == 3
        # Should be ordered by created_at (oldest first)
        assert messages[0].content == "Hello Bob!"
        assert messages[1].content == "Hi Alice!"
        assert messages[2].content == "How are you?"
    
    def test_get_conversation_pagination(self, db: Session):
        """Test conversation pagination"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create 10 messages
        for i in range(10):
            message = Message(
                content=f"Message {i+1}",
                sender_id=user1.id if i % 2 == 0 else user2.id,
                recipient_id=user2.id if i % 2 == 0 else user1.id
            )
            db.add(message)
        db.commit()
        
        # Test pagination
        messages = get_conversation(db, user1.id, user2.id, skip=3, limit=4)
        
        assert len(messages) == 4
        assert messages[0].content == "Message 4"
        assert messages[3].content == "Message 7"
    
    def test_get_conversations_list(self, db: Session):
        """Test getting list of all conversations for a user"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        user3 = User(username="charlie", email="charlie@test.com", password_hash="hashed")
        user4 = User(username="david", email="david@test.com", password_hash="hashed")
        db.add_all([user1, user2, user3, user4])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        db.refresh(user3)
        db.refresh(user4)
        
        # Create messages
        # Conversation 1: user1 <-> user2
        message1 = Message(
            content="Hello Bob!",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        message2 = Message(
            content="Hi Alice!",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        
        # Conversation 2: user1 <-> user3
        message3 = Message(
            content="Hello Charlie!",
            sender_id=user1.id,
            recipient_id=user3.id
        )
        
        # Message not involving user1 (should not appear in results)
        message4 = Message(
            content="Hi David",
            sender_id=user2.id,
            recipient_id=user4.id
        )
        
        db.add_all([message1, message2, message3, message4])
        db.commit()
        
        conversations = get_conversations(db, user1.id)
        
        assert len(conversations) == 2
        
        # Should include conversations with user2 and user3
        other_user_ids = {conv["other_user_id"] for conv in conversations}
        assert user2.id in other_user_ids
        assert user3.id in other_user_ids
        assert user4.id not in other_user_ids
        
        # Each conversation should have latest message
        for conv in conversations:
            assert "latest_message" in conv
            assert "other_user_id" in conv
            assert "other_username" in conv
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
        
        # Create unread messages from user2 to user1
        message1 = Message(
            content="Unread message 1",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        message2 = Message(
            content="Unread message 2",
            sender_id=user2.id,
            recipient_id=user1.id
        )
        # Message from user1 to user2 (should not be affected)
        message3 = Message(
            content="Message from user1",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        
        db.add_all([message1, message2, message3])
        db.commit()
        
        # Mark messages as read for user1 from user2
        marked_count = mark_messages_as_read(db, user1.id, user2.id)
        
        assert marked_count == 2
        
        # Verify messages are marked as read
        db.refresh(message1)
        db.refresh(message2)
        db.refresh(message3)
        
        assert hasattr(message1, 'read_at') and message1.read_at is not None
        assert hasattr(message2, 'read_at') and message2.read_at is not None
        # message3 should not be affected (different direction)
        assert not hasattr(message3, 'read_at') or message3.read_at is None
    
    def test_get_unread_count(self, db: Session):
        """Test getting unread messages count"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        user3 = User(username="charlie", email="charlie@test.com", password_hash="hashed")
        db.add_all([user1, user2, user3])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        db.refresh(user3)
        
        # Create unread messages to user1
        for i in range(3):
            message = Message(
                content=f"Unread from user2: {i+1}",
                sender_id=user2.id,
                recipient_id=user1.id
            )
            db.add(message)
        
        for i in range(2):
            message = Message(
                content=f"Unread from user3: {i+1}",
                sender_id=user3.id,
                recipient_id=user1.id
            )
            db.add(message)
        
        # Create sent messages (should not count as unread)
        message = Message(
            content="Sent message",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        db.add(message)
        db.commit()
        
        unread_count = get_unread_count(db, user1.id)
        
        assert unread_count == 5  # 3 from user2 + 2 from user3
    
    def test_search_messages(self, db: Session):
        """Test searching messages by content"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        user3 = User(username="charlie", email="charlie@test.com", password_hash="hashed")
        db.add_all([user1, user2, user3])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        db.refresh(user3)
        
        # Create messages with searchable content
        messages = [
            Message(content="Hello world", sender_id=user1.id, recipient_id=user2.id),
            Message(content="How are you doing?", sender_id=user2.id, recipient_id=user1.id),
            Message(content="Hello again", sender_id=user1.id, recipient_id=user2.id),
            Message(content="Goodbye world", sender_id=user2.id, recipient_id=user1.id),
            # Message with user3 (should not appear in search between user1 and user2)
            Message(content="Hello from charlie", sender_id=user3.id, recipient_id=user1.id)
        ]
        db.add_all(messages)
        db.commit()
        
        # Search for "hello" in conversation between user1 and user2
        results = search_messages(db, user1.id, user2.id, "hello")
        
        assert len(results) == 2
        contents = [msg.content for msg in results]
        assert "Hello world" in contents
        assert "Hello again" in contents
        assert "Hello from charlie" not in contents  # Different conversation
        
        # Search for "world"
        results = search_messages(db, user1.id, user2.id, "world")
        
        assert len(results) == 2
        contents = [msg.content for msg in results]
        assert "Hello world" in contents
        assert "Goodbye world" in contents
    
    def test_delete_message_soft_delete(self, db: Session):
        """Test soft deleting a message"""
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
        
        # Delete message
        success = delete_message(db, message.id, user1.id)
        
        assert success is True
        
        # Message should still exist but be marked as deleted
        db.refresh(message)
        assert hasattr(message, 'deleted_at')
        assert message.deleted_at is not None
        assert message.deleted_by == user1.id
    
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
        
        # Try to delete as user3 (not the sender)
        success = delete_message(db, message.id, user3.id)
        
        assert success is False
        
        # Message should not be deleted
        db.refresh(message)
        assert not hasattr(message, 'deleted_at') or message.deleted_at is None
    
    def test_get_conversation_excludes_deleted(self, db: Session):
        """Test that deleted messages are excluded from conversation"""
        # Create users
        user1 = User(username="alice", email="alice@test.com", password_hash="hashed")
        user2 = User(username="bob", email="bob@test.com", password_hash="hashed")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create messages
        message1 = Message(
            content="First message",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        message2 = Message(
            content="Second message",
            sender_id=user1.id,
            recipient_id=user2.id
        )
        db.add_all([message1, message2])
        db.commit()
        db.refresh(message1)
        db.refresh(message2)
        
        # Delete first message
        delete_message(db, message1.id, user1.id)
        
        # Get conversation should only return non-deleted messages
        messages = get_conversation(db, user1.id, user2.id)
        
        assert len(messages) == 1
        assert messages[0].content == "Second message"