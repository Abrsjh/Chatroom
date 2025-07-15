from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, CheckConstraint, UniqueConstraint, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.hybrid import hybrid_property
import enum

Base = declarative_base()

class VoteType(enum.Enum):
    upvote = "upvote"
    downvote = "downvote"

class ActionType(enum.Enum):
    DELETE = "delete"
    FLAG = "flag"
    APPROVE = "approve"
    WARN = "warn"
    BAN = "ban"

class TargetType(enum.Enum):
    POST = "post"
    REPLY = "reply"
    USER = "user"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    channels = relationship("Channel", back_populates="creator")
    posts = relationship("Post", back_populates="author")
    replies = relationship("Reply", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    sent_messages = relationship("Message", foreign_keys="[Message.sender_id]", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="[Message.recipient_id]", back_populates="recipient")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    moderation_actions = relationship("ModerationAction", back_populates="moderator")
    moderation_logs = relationship("ModerationLog", foreign_keys="[ModerationLog.user_id]", back_populates="user")
    moderator_logs = relationship("ModerationLog", foreign_keys="[ModerationLog.moderator_id]", back_populates="moderator")

class Channel(Base):
    __tablename__ = "channels"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="channels")
    posts = relationship("Post", back_populates="channel")

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    channel = relationship("Channel", back_populates="posts")
    author = relationship("User", back_populates="posts")
    replies = relationship("Reply", back_populates="post", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="post", cascade="all, delete-orphan")
    
    @property
    def upvote_count(self):
        """Count upvotes for this post"""
        return len([v for v in self.votes if v.vote_type == VoteType.upvote.value])
    
    @property
    def downvote_count(self):
        """Count downvotes for this post"""
        return len([v for v in self.votes if v.vote_type == VoteType.downvote.value])
    
    @property
    def net_votes(self):
        """Calculate net votes (upvotes - downvotes)"""
        return self.upvote_count - self.downvote_count
    
    @property
    def total_votes(self):
        """Calculate total votes"""
        return self.upvote_count + self.downvote_count

class Reply(Base):
    __tablename__ = "replies"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("replies.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    post = relationship("Post", back_populates="replies")
    author = relationship("User", back_populates="replies")
    parent = relationship("Reply", remote_side=[id], back_populates="children")
    children = relationship("Reply", back_populates="parent", order_by="Reply.created_at", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="reply", cascade="all, delete-orphan")
    
    @hybrid_property
    def is_edited(self):
        """Check if reply has been edited"""
        return self.updated_at > self.created_at
    
    @hybrid_property
    def is_deleted(self):
        """Check if reply has been soft deleted"""
        return self.deleted_at is not None
    
    @property
    def depth(self):
        """Calculate the depth of this reply in the thread"""
        if self.parent is None:
            return 0
        return self.parent.depth + 1
    
    @property
    def thread_root(self):
        """Get the root reply of this thread"""
        if self.parent is None:
            return self
        return self.parent.thread_root
    
    @property
    def ancestors(self):
        """Get all ancestors of this reply (immediate parent first, root last)"""
        ancestors = []
        current = self.parent
        while current is not None:
            ancestors.append(current)
            current = current.parent
        return ancestors
    
    @property
    def descendants(self):
        """Get all descendants of this reply"""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.descendants)
        return descendants
    
    @property
    def siblings(self):
        """Get all siblings of this reply (replies with same parent)"""
        if self.parent is None:
            # Root level replies are siblings of each other
            return [reply for reply in self.post.replies if reply.parent is None and reply.id != self.id]
        else:
            return [reply for reply in self.parent.children if reply.id != self.id]
    
    def is_ancestor_of(self, other_reply):
        """Check if this reply is an ancestor of another reply"""
        return self in other_reply.ancestors
    
    @property
    def can_reply_to(self):
        """Check if replies can be made to this reply (respects max depth)"""
        MAX_DEPTH = 10
        return self.depth < MAX_DEPTH
    
    @property
    def upvote_count(self):
        """Count upvotes for this reply"""
        return len([v for v in self.votes if v.vote_type == VoteType.upvote.value])
    
    @property
    def downvote_count(self):
        """Count downvotes for this reply"""
        return len([v for v in self.votes if v.vote_type == VoteType.downvote.value])
    
    @property
    def net_votes(self):
        """Calculate net votes (upvotes - downvotes)"""
        return self.upvote_count - self.downvote_count

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    reply_id = Column(Integer, ForeignKey("replies.id", ondelete="CASCADE"), nullable=True)
    vote_type = Column(Enum(VoteType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        # User can only vote once per post
        UniqueConstraint('user_id', 'post_id', name='unique_user_post_vote'),
        # User can only vote once per reply
        UniqueConstraint('user_id', 'reply_id', name='unique_user_reply_vote'),
        # Must vote on either post or reply, but not both or neither
        CheckConstraint(
            '(post_id IS NOT NULL AND reply_id IS NULL) OR (post_id IS NULL AND reply_id IS NOT NULL)',
            name='vote_target_constraint'
        ),
    )
    
    # Relationships
    user = relationship("User", back_populates="votes")
    post = relationship("Post", back_populates="votes")
    reply = relationship("Reply", back_populates="votes")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

class ModerationAction(Base):
    __tablename__ = "moderation_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(Enum(ActionType), nullable=False)
    target_type = Column(Enum(TargetType), nullable=False)
    target_id = Column(Integer, nullable=False)
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    moderator = relationship("User", back_populates="moderation_actions")

class ModerationLog(Base):
    __tablename__ = "moderation_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="moderation_logs")
    moderator = relationship("User", foreign_keys=[moderator_id], back_populates="moderator_logs")