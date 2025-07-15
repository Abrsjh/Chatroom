import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.models import Base, User, Channel, Post, Reply, Vote, Message
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

def test_user_model_creation(db_session):
    """Test User model creation with required fields"""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="hashed_password"
    )
    db_session.add(user)
    db_session.commit()
    
    assert user.id is not None
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.password_hash == "hashed_password"
    assert user.created_at is not None
    assert isinstance(user.created_at, datetime)

def test_user_model_relationships(db_session):
    """Test User model relationships with posts and channels"""
    user = User(username="testuser", email="test@example.com", password_hash="hash")
    channel = Channel(name="general", description="General channel", created_by=user)
    
    db_session.add(user)
    db_session.add(channel)
    db_session.commit()
    
    assert len(user.channels) == 1
    assert user.channels[0].name == "general"
    assert channel.creator == user

def test_channel_model_creation(db_session):
    """Test Channel model creation with required fields"""
    user = User(username="creator", email="creator@example.com", password_hash="hash")
    db_session.add(user)
    db_session.commit()
    
    channel = Channel(
        name="general",
        description="General discussion channel",
        created_by=user
    )
    db_session.add(channel)
    db_session.commit()
    
    assert channel.id is not None
    assert channel.name == "general"
    assert channel.description == "General discussion channel"
    assert channel.created_by == user
    assert channel.created_at is not None

def test_post_model_creation(db_session):
    """Test Post model creation with required fields"""
    user = User(username="author", email="author@example.com", password_hash="hash")
    channel = Channel(name="general", description="General", created_by=user)
    db_session.add(user)
    db_session.add(channel)
    db_session.commit()
    
    post = Post(
        title="Test Post",
        content="This is a test post",
        channel_id=channel.id,
        author_id=user.id
    )
    db_session.add(post)
    db_session.commit()
    
    assert post.id is not None
    assert post.title == "Test Post"
    assert post.content == "This is a test post"
    assert post.channel_id == channel.id
    assert post.author_id == user.id
    assert post.created_at is not None
    assert post.updated_at is not None

def test_reply_model_creation(db_session):
    """Test Reply model creation with required fields"""
    user = User(username="author", email="author@example.com", password_hash="hash")
    channel = Channel(name="general", description="General", created_by=user)
    post = Post(title="Test Post", content="Content", channel_id=channel.id, author_id=user.id)
    db_session.add_all([user, channel, post])
    db_session.commit()
    
    reply = Reply(
        content="This is a reply",
        post_id=post.id,
        author_id=user.id
    )
    db_session.add(reply)
    db_session.commit()
    
    assert reply.id is not None
    assert reply.content == "This is a reply"
    assert reply.post_id == post.id
    assert reply.author_id == user.id
    assert reply.created_at is not None

def test_vote_model_creation(db_session):
    """Test Vote model creation with required fields"""
    user = User(username="voter", email="voter@example.com", password_hash="hash")
    channel = Channel(name="general", description="General", created_by=user)
    post = Post(title="Test Post", content="Content", channel_id=channel.id, author_id=user.id)
    db_session.add_all([user, channel, post])
    db_session.commit()
    
    vote = Vote(
        post_id=post.id,
        user_id=user.id,
        vote_type="upvote"
    )
    db_session.add(vote)
    db_session.commit()
    
    assert vote.id is not None
    assert vote.post_id == post.id
    assert vote.user_id == user.id
    assert vote.vote_type == "upvote"
    assert vote.created_at is not None

def test_message_model_creation(db_session):
    """Test Message model creation with required fields"""
    sender = User(username="sender", email="sender@example.com", password_hash="hash")
    recipient = User(username="recipient", email="recipient@example.com", password_hash="hash")
    db_session.add_all([sender, recipient])
    db_session.commit()
    
    message = Message(
        content="Hello there!",
        sender_id=sender.id,
        recipient_id=recipient.id
    )
    db_session.add(message)
    db_session.commit()
    
    assert message.id is not None
    assert message.content == "Hello there!"
    assert message.sender_id == sender.id
    assert message.recipient_id == recipient.id
    assert message.created_at is not None

def test_model_relationships(db_session):
    """Test relationships between all models"""
    user1 = User(username="user1", email="user1@example.com", password_hash="hash")
    user2 = User(username="user2", email="user2@example.com", password_hash="hash")
    channel = Channel(name="general", description="General", created_by=user1)
    post = Post(title="Test Post", content="Content", channel_id=channel.id, author_id=user1.id)
    reply = Reply(content="Reply", post_id=post.id, author_id=user2.id)
    vote = Vote(post_id=post.id, user_id=user2.id, vote_type="upvote")
    message = Message(content="DM", sender_id=user1.id, recipient_id=user2.id)
    
    db_session.add_all([user1, user2, channel, post, reply, vote, message])
    db_session.commit()
    
    # Test relationships
    assert post.author == user1
    assert post.channel == channel
    assert len(post.replies) == 1
    assert post.replies[0] == reply
    assert len(post.votes) == 1
    assert post.votes[0] == vote
    assert reply.author == user2
    assert reply.post == post
    assert vote.user == user2
    assert vote.post == post
    assert message.sender == user1
    assert message.recipient == user2