import pytest
from datetime import datetime
from pydantic import ValidationError
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.channel import ChannelCreate, ChannelResponse, ChannelUpdate
from app.schemas.post import PostCreate, PostResponse, PostUpdate
from app.schemas.reply import ReplyCreate, ReplyResponse
from app.schemas.vote import VoteCreate, VoteResponse
from app.schemas.message import MessageCreate, MessageResponse


class TestUserSchemas:
    def test_user_create_valid(self):
        user_data = {
            "username": "testuser",
            "email": "test@example.com", 
            "password": "securepassword123"
        }
        user = UserCreate(**user_data)
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.password == "securepassword123"

    def test_user_create_invalid_email(self):
        user_data = {
            "username": "testuser",
            "email": "invalid-email",
            "password": "securepassword123"
        }
        with pytest.raises(ValidationError):
            UserCreate(**user_data)

    def test_user_response_model(self):
        user_data = {
            "id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "created_at": datetime.now()
        }
        user = UserResponse(**user_data)
        assert user.id == 1
        assert user.username == "testuser"
        assert "password" not in user.model_dump()

    def test_user_update_partial(self):
        update_data = {"username": "newusername"}
        user_update = UserUpdate(**update_data)
        assert user_update.username == "newusername"
        assert user_update.email is None


class TestChannelSchemas:
    def test_channel_create_valid(self):
        channel_data = {
            "name": "general",
            "description": "General discussion channel"
        }
        channel = ChannelCreate(**channel_data)
        assert channel.name == "general"
        assert channel.description == "General discussion channel"

    def test_channel_create_no_description(self):
        channel_data = {"name": "general"}
        channel = ChannelCreate(**channel_data)
        assert channel.name == "general"
        assert channel.description is None

    def test_channel_response_model(self):
        channel_data = {
            "id": 1,
            "name": "general",
            "description": "General discussion",
            "created_by": 1,
            "created_at": datetime.now()
        }
        channel = ChannelResponse(**channel_data)
        assert channel.id == 1
        assert channel.created_by == 1


class TestPostSchemas:
    def test_post_create_valid(self):
        post_data = {
            "title": "Test Post",
            "content": "This is a test post content"
        }
        post = PostCreate(**post_data)
        assert post.title == "Test Post"
        assert post.content == "This is a test post content"

    def test_post_create_empty_title(self):
        post_data = {
            "title": "",
            "content": "Content here"
        }
        with pytest.raises(ValidationError):
            PostCreate(**post_data)

    def test_post_response_model(self):
        post_data = {
            "id": 1,
            "title": "Test Post",
            "content": "Test content",
            "channel_id": 1,
            "author_id": 1,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        post = PostResponse(**post_data)
        assert post.id == 1
        assert post.channel_id == 1


class TestReplySchemas:
    def test_reply_create_valid(self):
        reply_data = {"content": "This is a reply"}
        reply = ReplyCreate(**reply_data)
        assert reply.content == "This is a reply"

    def test_reply_create_empty_content(self):
        reply_data = {"content": ""}
        with pytest.raises(ValidationError):
            ReplyCreate(**reply_data)

    def test_reply_response_model(self):
        reply_data = {
            "id": 1,
            "content": "Reply content",
            "post_id": 1,
            "author_id": 1,
            "created_at": datetime.now()
        }
        reply = ReplyResponse(**reply_data)
        assert reply.id == 1
        assert reply.post_id == 1


class TestVoteSchemas:
    def test_vote_create_valid(self):
        vote_data = {"vote_type": "upvote"}
        vote = VoteCreate(**vote_data)
        assert vote.vote_type == "upvote"

    def test_vote_create_invalid_type(self):
        vote_data = {"vote_type": "invalid"}
        with pytest.raises(ValidationError):
            VoteCreate(**vote_data)

    def test_vote_response_model(self):
        vote_data = {
            "id": 1,
            "post_id": 1,
            "user_id": 1,
            "vote_type": "downvote",
            "created_at": datetime.now()
        }
        vote = VoteResponse(**vote_data)
        assert vote.vote_type == "downvote"


class TestMessageSchemas:
    def test_message_create_valid(self):
        message_data = {
            "content": "Hello there!",
            "recipient_id": 2
        }
        message = MessageCreate(**message_data)
        assert message.content == "Hello there!"
        assert message.recipient_id == 2

    def test_message_create_empty_content(self):
        message_data = {
            "content": "",
            "recipient_id": 2
        }
        with pytest.raises(ValidationError):
            MessageCreate(**message_data)

    def test_message_response_model(self):
        message_data = {
            "id": 1,
            "content": "Hello!",
            "sender_id": 1,
            "recipient_id": 2,
            "created_at": datetime.now()
        }
        message = MessageResponse(**message_data)
        assert message.sender_id == 1
        assert message.recipient_id == 2