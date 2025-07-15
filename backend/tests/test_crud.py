import pytest
from sqlalchemy.orm import Session
from app.crud.channel import create_channel, get_channel, get_channels, update_channel, delete_channel
from app.crud.post import create_post, get_post, get_posts_by_channel, update_post, delete_post
from app.schemas.channel import ChannelCreate, ChannelUpdate
from app.schemas.post import PostCreate, PostUpdate
from app.models.models import User, Channel, Post
from app.database import get_db


class TestChannelCRUD:
    def test_create_channel(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel_data = ChannelCreate(name="general", description="General discussion")
        channel = create_channel(db, channel_data, user_id=user.id)
        
        assert channel.name == "general"
        assert channel.description == "General discussion"
        assert channel.created_by == user.id
        assert channel.id is not None

    def test_get_channel_exists(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="test", description="Test channel", created_by=user.id)
        db.add(channel)
        db.commit()
        
        retrieved = get_channel(db, channel.id)
        assert retrieved is not None
        assert retrieved.name == "test"
        assert retrieved.id == channel.id

    def test_get_channel_not_exists(self, db: Session):
        retrieved = get_channel(db, 999)
        assert retrieved is None

    def test_get_all_channels(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel1 = Channel(name="general", created_by=user.id)
        channel2 = Channel(name="random", created_by=user.id)
        db.add_all([channel1, channel2])
        db.commit()
        
        channels = get_channels(db)
        assert len(channels) >= 2
        channel_names = [c.name for c in channels]
        assert "general" in channel_names
        assert "random" in channel_names

    def test_update_channel(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="old_name", description="Old desc", created_by=user.id)
        db.add(channel)
        db.commit()
        
        update_data = ChannelUpdate(name="new_name", description="New desc")
        updated = update_channel(db, channel.id, update_data)
        
        assert updated.name == "new_name"
        assert updated.description == "New desc"
        assert updated.id == channel.id

    def test_update_channel_not_exists(self, db: Session):
        update_data = ChannelUpdate(name="new_name")
        updated = update_channel(db, 999, update_data)
        assert updated is None

    def test_delete_channel(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="to_delete", created_by=user.id)
        db.add(channel)
        db.commit()
        channel_id = channel.id
        
        deleted = delete_channel(db, channel_id)
        assert deleted is not None
        assert deleted.id == channel_id
        
        # Verify it's actually deleted
        retrieved = get_channel(db, channel_id)
        assert retrieved is None

    def test_delete_channel_not_exists(self, db: Session):
        deleted = delete_channel(db, 999)
        assert deleted is None


class TestPostCRUD:
    def test_create_post(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post_data = PostCreate(title="Test Post", content="This is test content")
        post = create_post(db, post_data, channel_id=channel.id, author_id=user.id)
        
        assert post.title == "Test Post"
        assert post.content == "This is test content"
        assert post.channel_id == channel.id
        assert post.author_id == user.id
        assert post.id is not None

    def test_get_post_exists(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post = Post(title="Test", content="Content", channel_id=channel.id, author_id=user.id)
        db.add(post)
        db.commit()
        
        retrieved = get_post(db, post.id)
        assert retrieved is not None
        assert retrieved.title == "Test"
        assert retrieved.id == post.id

    def test_get_post_not_exists(self, db: Session):
        retrieved = get_post(db, 999)
        assert retrieved is None

    def test_get_posts_by_channel(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post1 = Post(title="Post 1", content="Content 1", channel_id=channel.id, author_id=user.id)
        post2 = Post(title="Post 2", content="Content 2", channel_id=channel.id, author_id=user.id)
        db.add_all([post1, post2])
        db.commit()
        
        posts = get_posts_by_channel(db, channel.id)
        assert len(posts) == 2
        post_titles = [p.title for p in posts]
        assert "Post 1" in post_titles
        assert "Post 2" in post_titles

    def test_get_posts_by_channel_empty(self, db: Session):
        posts = get_posts_by_channel(db, 999)
        assert len(posts) == 0

    def test_update_post(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post = Post(title="Old Title", content="Old content", channel_id=channel.id, author_id=user.id)
        db.add(post)
        db.commit()
        
        update_data = PostUpdate(title="New Title", content="New content")
        updated = update_post(db, post.id, update_data)
        
        assert updated.title == "New Title"
        assert updated.content == "New content"
        assert updated.id == post.id

    def test_update_post_partial(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post = Post(title="Original", content="Original content", channel_id=channel.id, author_id=user.id)
        db.add(post)
        db.commit()
        
        update_data = PostUpdate(title="Updated Title")
        updated = update_post(db, post.id, update_data)
        
        assert updated.title == "Updated Title"
        assert updated.content == "Original content"  # Should remain unchanged

    def test_update_post_not_exists(self, db: Session):
        update_data = PostUpdate(title="New Title")
        updated = update_post(db, 999, update_data)
        assert updated is None

    def test_delete_post(self, db: Session):
        user = User(username="testuser", email="test@example.com", password_hash="hashed")
        db.add(user)
        db.commit()
        
        channel = Channel(name="general", created_by=user.id)
        db.add(channel)
        db.commit()
        
        post = Post(title="To Delete", content="Content", channel_id=channel.id, author_id=user.id)
        db.add(post)
        db.commit()
        post_id = post.id
        
        deleted = delete_post(db, post_id)
        assert deleted is not None
        assert deleted.id == post_id
        
        # Verify it's actually deleted
        retrieved = get_post(db, post_id)
        assert retrieved is None

    def test_delete_post_not_exists(self, db: Session):
        deleted = delete_post(db, 999)
        assert deleted is None