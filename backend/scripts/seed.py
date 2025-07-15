#!/usr/bin/env python3
"""
Comprehensive seed data system for Reddit Forum Backend
This script creates initial data for users, channels, and posts
"""

import os
import sys
import asyncio
import hashlib
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.database import DATABASE_URL
from app.utils.auth import get_password_hash
from app.models.models import User, Channel, Post, Reply, Vote, Message
import json
import random
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SeedDataType(Enum):
    """Types of seed data."""
    MINIMAL = "minimal"
    BASIC = "basic"
    COMPREHENSIVE = "comprehensive"
    PERFORMANCE_TEST = "performance_test"

@dataclass
class SeedConfig:
    """Configuration for seed data generation."""
    data_type: SeedDataType = SeedDataType.BASIC
    num_users: int = 10
    num_channels: int = 5
    num_posts_per_channel: int = 10
    num_replies_per_post: int = 5
    num_messages: int = 20
    create_votes: bool = True
    create_admin_user: bool = True
    use_real_names: bool = False
    preserve_existing_data: bool = True

class SeedDataFactory:
    """Factory for creating seed data."""
    
    def __init__(self, config: SeedConfig = None, database_url: str = None):
        self.config = config or SeedConfig()
        self.database_url = database_url or DATABASE_URL
        self.engine = create_engine(self.database_url)
        
        # Sample data
        self.sample_usernames = [
            "alice_dev", "bob_coder", "charlie_tech", "diana_designer", 
            "eve_engineer", "frank_frontend", "grace_backend", "henry_fullstack",
            "ivy_mobile", "jack_devops", "kate_qa", "liam_security",
            "mia_product", "noah_ux", "olivia_data", "peter_ml"
        ]
        
        self.sample_channels = [
            {"name": "general", "description": "General discussion for all topics"},
            {"name": "announcements", "description": "Important announcements and updates"},
            {"name": "help", "description": "Help and support for users"},
            {"name": "random", "description": "Random thoughts and casual conversations"},
            {"name": "tech-news", "description": "Latest technology news and updates"},
            {"name": "programming", "description": "Programming discussions and code sharing"},
            {"name": "design", "description": "Design inspiration and feedback"},
            {"name": "career", "description": "Career advice and job opportunities"},
            {"name": "off-topic", "description": "Off-topic discussions and fun"},
            {"name": "feedback", "description": "Platform feedback and suggestions"}
        ]
        
        self.sample_post_titles = [
            "Welcome to the community!",
            "Best practices for modern web development",
            "How to improve your coding skills",
            "The future of artificial intelligence",
            "Tips for remote work productivity",
            "Debugging techniques that save time",
            "Code review best practices",
            "Understanding design patterns",
            "Database optimization strategies",
            "Security considerations for web apps"
        ]
        
        self.sample_post_content = [
            "This is a sample post to demonstrate the platform features.",
            "Let's discuss the latest trends in technology and development.",
            "I've been working on this project and would love to get some feedback.",
            "Here's an interesting article I found that might be useful.",
            "What are your thoughts on this new technology?",
            "I'm having trouble with this concept, can anyone help?",
            "Just wanted to share this cool discovery I made today.",
            "Let's start a discussion about best practices in our field.",
            "I've been learning about this topic and wanted to share my insights.",
            "Looking for recommendations on tools and resources."
        ]
    
    def validate_user_data(self, user_data: Dict[str, Any]) -> bool:
        """Validate user data before insertion."""
        required_fields = ['username', 'email', 'password_hash']
        
        for field in required_fields:
            if field not in user_data or not user_data[field]:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate email format
        if '@' not in user_data['email']:
            logger.error(f"Invalid email format: {user_data['email']}")
            return False
        
        # Validate username length
        if len(user_data['username']) < 3 or len(user_data['username']) > 50:
            logger.error(f"Invalid username length: {user_data['username']}")
            return False
        
        return True
    
    def validate_channel_data(self, channel_data: Dict[str, Any]) -> bool:
        """Validate channel data before insertion."""
        required_fields = ['name', 'description', 'created_by']
        
        for field in required_fields:
            if field not in channel_data or not channel_data[field]:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate channel name
        if len(channel_data['name']) < 2 or len(channel_data['name']) > 100:
            logger.error(f"Invalid channel name length: {channel_data['name']}")
            return False
        
        return True
    
    def validate_post_data(self, post_data: Dict[str, Any]) -> bool:
        """Validate post data before insertion."""
        required_fields = ['title', 'content', 'channel_id', 'user_id']
        
        for field in required_fields:
            if field not in post_data or not post_data[field]:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate title length
        if len(post_data['title']) < 5 or len(post_data['title']) > 200:
            logger.error(f"Invalid post title length: {post_data['title']}")
            return False
        
        return True
    
    def create_admin_user(self) -> Optional[int]:
        """Create admin user."""
        try:
            with self.engine.connect() as conn:
                # Check if admin user already exists
                result = conn.execute(text(
                    "SELECT id FROM users WHERE username = 'admin'"
                ))
                
                if result.fetchone():
                    logger.info("Admin user already exists")
                    return conn.execute(text(
                        "SELECT id FROM users WHERE username = 'admin'"
                    )).fetchone()[0]
                
                # Create admin user
                admin_data = {
                    'username': 'admin',
                    'email': 'admin@reddit-forum.com',
                    'password_hash': get_password_hash('admin123!'),
                    'is_active': True,
                    'is_superuser': True,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                
                if not self.validate_user_data(admin_data):
                    return None
                
                result = conn.execute(text("""
                    INSERT INTO users (username, email, password_hash, is_active, is_superuser, created_at, updated_at)
                    VALUES (:username, :email, :password_hash, :is_active, :is_superuser, :created_at, :updated_at)
                    RETURNING id
                """), admin_data)
                
                admin_id = result.fetchone()[0]
                conn.commit()
                
                logger.info(f"Created admin user with ID: {admin_id}")
                return admin_id
                
        except Exception as e:
            logger.error(f"Error creating admin user: {e}")
            return None
    
    def create_test_users(self) -> List[int]:
        """Create test users."""
        user_ids = []
        
        try:
            with self.engine.connect() as conn:
                for i in range(self.config.num_users):
                    username = self.sample_usernames[i % len(self.sample_usernames)]
                    if i >= len(self.sample_usernames):
                        username = f"{username}_{i}"
                    
                    # Check if user already exists
                    result = conn.execute(text(
                        "SELECT id FROM users WHERE username = :username"
                    ), {"username": username})
                    
                    if result.fetchone():
                        logger.info(f"User {username} already exists")
                        continue
                    
                    user_data = {
                        'username': username,
                        'email': f"{username}@example.com",
                        'password_hash': get_password_hash('testpass123'),
                        'is_active': True,
                        'is_superuser': False,
                        'created_at': datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        'updated_at': datetime.utcnow()
                    }
                    
                    if not self.validate_user_data(user_data):
                        continue
                    
                    result = conn.execute(text("""
                        INSERT INTO users (username, email, password_hash, is_active, is_superuser, created_at, updated_at)
                        VALUES (:username, :email, :password_hash, :is_active, :is_superuser, :created_at, :updated_at)
                        RETURNING id
                    """), user_data)
                    
                    user_id = result.fetchone()[0]
                    user_ids.append(user_id)
                    logger.info(f"Created user: {username} (ID: {user_id})")
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error creating test users: {e}")
        
        return user_ids
    
    def create_default_channels(self, admin_id: int) -> List[int]:
        """Create default channels."""
        channel_ids = []
        
        try:
            with self.engine.connect() as conn:
                channels_to_create = self.sample_channels[:self.config.num_channels]
                
                for channel_data in channels_to_create:
                    # Check if channel already exists
                    result = conn.execute(text(
                        "SELECT id FROM channels WHERE name = :name"
                    ), {"name": channel_data["name"]})
                    
                    if result.fetchone():
                        logger.info(f"Channel {channel_data['name']} already exists")
                        continue
                    
                    channel_info = {
                        'name': channel_data['name'],
                        'description': channel_data['description'],
                        'created_by': admin_id,
                        'created_at': datetime.utcnow() - timedelta(days=random.randint(1, 10)),
                        'updated_at': datetime.utcnow(),
                        'is_active': True
                    }
                    
                    if not self.validate_channel_data(channel_info):
                        continue
                    
                    result = conn.execute(text("""
                        INSERT INTO channels (name, description, created_by, created_at, updated_at, is_active)
                        VALUES (:name, :description, :created_by, :created_at, :updated_at, :is_active)
                        RETURNING id
                    """), channel_info)
                    
                    channel_id = result.fetchone()[0]
                    channel_ids.append(channel_id)
                    logger.info(f"Created channel: {channel_data['name']} (ID: {channel_id})")
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error creating default channels: {e}")
        
        return channel_ids
    
    def create_sample_posts(self, user_ids: List[int], channel_ids: List[int]) -> List[int]:
        """Create sample posts."""
        post_ids = []
        
        try:
            with self.engine.connect() as conn:
                for channel_id in channel_ids:
                    for i in range(self.config.num_posts_per_channel):
                        user_id = random.choice(user_ids)
                        title = random.choice(self.sample_post_titles)
                        content = random.choice(self.sample_post_content)
                        
                        # Make titles unique by adding channel info
                        title = f"{title} - Channel {channel_id}"
                        
                        post_data = {
                            'title': title,
                            'content': content + f" This is post {i+1} in channel {channel_id}.",
                            'channel_id': channel_id,
                            'user_id': user_id,
                            'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
                            'updated_at': datetime.utcnow(),
                            'is_deleted': False
                        }
                        
                        if not self.validate_post_data(post_data):
                            continue
                        
                        result = conn.execute(text("""
                            INSERT INTO posts (title, content, channel_id, user_id, created_at, updated_at, is_deleted)
                            VALUES (:title, :content, :channel_id, :user_id, :created_at, :updated_at, :is_deleted)
                            RETURNING id
                        """), post_data)
                        
                        post_id = result.fetchone()[0]
                        post_ids.append(post_id)
                        logger.info(f"Created post: {title[:50]}... (ID: {post_id})")
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error creating sample posts: {e}")
        
        return post_ids
    
    def create_sample_replies(self, user_ids: List[int], post_ids: List[int]) -> List[int]:
        """Create sample replies."""
        reply_ids = []
        
        try:
            with self.engine.connect() as conn:
                for post_id in post_ids:
                    for i in range(random.randint(1, self.config.num_replies_per_post)):
                        user_id = random.choice(user_ids)
                        content = f"This is a reply to post {post_id}. Great point! I think we should consider this approach."
                        
                        reply_data = {
                            'content': content,
                            'post_id': post_id,
                            'user_id': user_id,
                            'parent_id': None,  # Top-level reply
                            'depth': 0,
                            'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                            'updated_at': datetime.utcnow(),
                            'is_deleted': False
                        }
                        
                        result = conn.execute(text("""
                            INSERT INTO replies (content, post_id, user_id, parent_id, depth, created_at, updated_at, is_deleted)
                            VALUES (:content, :post_id, :user_id, :parent_id, :depth, :created_at, :updated_at, :is_deleted)
                            RETURNING id
                        """), reply_data)
                        
                        reply_id = result.fetchone()[0]
                        reply_ids.append(reply_id)
                        logger.info(f"Created reply for post {post_id} (ID: {reply_id})")
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Error creating sample replies: {e}")
        
        return reply_ids
    
    def create_sample_votes(self, user_ids: List[int], post_ids: List[int], reply_ids: List[int]) -> int:
        """Create sample votes."""
        vote_count = 0
        
        if not self.config.create_votes:
            return vote_count
        
        try:
            with self.engine.connect() as conn:
                # Create votes for posts
                for post_id in post_ids:
                    for user_id in random.sample(user_ids, min(len(user_ids), random.randint(1, 5))):
                        vote_type = random.choice(['upvote', 'downvote'])
                        
                        vote_data = {
                            'user_id': user_id,
                            'post_id': post_id,
                            'reply_id': None,
                            'vote_type': vote_type,
                            'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
                            'updated_at': datetime.utcnow()
                        }
                        
                        try:
                            conn.execute(text("""
                                INSERT INTO votes (user_id, post_id, reply_id, vote_type, created_at, updated_at)
                                VALUES (:user_id, :post_id, :reply_id, :vote_type, :created_at, :updated_at)
                            """), vote_data)
                            vote_count += 1
                        except IntegrityError:
                            # User already voted on this post
                            pass
                
                # Create votes for replies
                for reply_id in reply_ids:
                    for user_id in random.sample(user_ids, min(len(user_ids), random.randint(1, 3))):
                        vote_type = random.choice(['upvote', 'downvote'])
                        
                        vote_data = {
                            'user_id': user_id,
                            'post_id': None,
                            'reply_id': reply_id,
                            'vote_type': vote_type,
                            'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
                            'updated_at': datetime.utcnow()
                        }
                        
                        try:
                            conn.execute(text("""
                                INSERT INTO votes (user_id, post_id, reply_id, vote_type, created_at, updated_at)
                                VALUES (:user_id, :post_id, :reply_id, :vote_type, :created_at, :updated_at)
                            """), vote_data)
                            vote_count += 1
                        except IntegrityError:
                            # User already voted on this reply
                            pass
                
                conn.commit()
                logger.info(f"Created {vote_count} votes")
                
        except Exception as e:
            logger.error(f"Error creating sample votes: {e}")
        
        return vote_count
    
    def create_sample_messages(self, user_ids: List[int]) -> int:
        """Create sample messages."""
        message_count = 0
        
        try:
            with self.engine.connect() as conn:
                for i in range(self.config.num_messages):
                    sender_id = random.choice(user_ids)
                    recipient_id = random.choice([uid for uid in user_ids if uid != sender_id])
                    
                    content = f"Hello! This is a direct message #{i+1}. How are you doing?"
                    
                    message_data = {
                        'content': content,
                        'sender_id': sender_id,
                        'recipient_id': recipient_id,
                        'created_at': datetime.utcnow() - timedelta(hours=random.randint(1, 168)),
                        'read_at': None if random.random() > 0.7 else datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
                        'is_deleted': False
                    }
                    
                    conn.execute(text("""
                        INSERT INTO messages (content, sender_id, recipient_id, created_at, read_at, is_deleted)
                        VALUES (:content, :sender_id, :recipient_id, :created_at, :read_at, :is_deleted)
                    """), message_data)
                    
                    message_count += 1
                
                conn.commit()
                logger.info(f"Created {message_count} messages")
                
        except Exception as e:
            logger.error(f"Error creating sample messages: {e}")
        
        return message_count
    
    def seed_users_idempotent(self) -> List[int]:
        """Idempotent user seeding."""
        user_ids = []
        
        # Create admin user
        admin_id = self.create_admin_user()
        if admin_id:
            user_ids.append(admin_id)
        
        # Create test users
        test_user_ids = self.create_test_users()
        user_ids.extend(test_user_ids)
        
        return user_ids
    
    def seed_channels_idempotent(self, admin_id: int) -> List[int]:
        """Idempotent channel seeding."""
        return self.create_default_channels(admin_id)
    
    def seed_posts_idempotent(self, user_ids: List[int], channel_ids: List[int]) -> List[int]:
        """Idempotent post seeding."""
        return self.create_sample_posts(user_ids, channel_ids)
    
    def cleanup_seed_data(self) -> bool:
        """Clean up seed data."""
        try:
            with self.engine.connect() as conn:
                # Delete in reverse order of dependencies
                tables = ['votes', 'replies', 'posts', 'messages', 'channels', 'users']
                
                for table in tables:
                    if table == 'users':
                        # Don't delete admin user
                        conn.execute(text(f"DELETE FROM {table} WHERE username != 'admin'"))
                    else:
                        conn.execute(text(f"DELETE FROM {table}"))
                
                conn.commit()
                logger.info("Cleaned up seed data")
                return True
                
        except Exception as e:
            logger.error(f"Error cleaning up seed data: {e}")
            return False
    
    def reset_database(self) -> bool:
        """Reset database to initial state."""
        try:
            with self.engine.connect() as conn:
                # Truncate all tables
                tables = ['moderation_logs', 'moderation_actions', 'votes', 'replies', 'posts', 'messages', 'channels', 'users']
                
                for table in tables:
                    conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
                
                conn.commit()
                logger.info("Reset database to initial state")
                return True
                
        except Exception as e:
            logger.error(f"Error resetting database: {e}")
            return False
    
    def generate_seed_report(self) -> Dict[str, Any]:
        """Generate a report of seed data."""
        try:
            with self.engine.connect() as conn:
                report = {}
                
                # Count records in each table
                tables = ['users', 'channels', 'posts', 'replies', 'votes', 'messages']
                
                for table in tables:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    report[table] = result.fetchone()[0]
                
                return report
                
        except Exception as e:
            logger.error(f"Error generating seed report: {e}")
            return {}

class SeedDataManager:
    """Main manager for seed data operations."""
    
    def __init__(self, config: SeedConfig = None):
        self.config = config or SeedConfig()
        self.factory = SeedDataFactory(self.config)
    
    def seed_all(self) -> bool:
        """Seed all data."""
        try:
            logger.info("Starting comprehensive seed data generation")
            
            # Seed users
            user_ids = self.factory.seed_users_idempotent()
            if not user_ids:
                logger.error("Failed to create users")
                return False
            
            admin_id = user_ids[0]  # First user is admin
            
            # Seed channels
            channel_ids = self.factory.seed_channels_idempotent(admin_id)
            if not channel_ids:
                logger.error("Failed to create channels")
                return False
            
            # Seed posts
            post_ids = self.factory.seed_posts_idempotent(user_ids, channel_ids)
            if not post_ids:
                logger.error("Failed to create posts")
                return False
            
            # Seed replies
            reply_ids = self.factory.create_sample_replies(user_ids, post_ids)
            
            # Seed votes
            vote_count = self.factory.create_sample_votes(user_ids, post_ids, reply_ids)
            
            # Seed messages
            message_count = self.factory.create_sample_messages(user_ids)
            
            # Generate report
            report = self.factory.generate_seed_report()
            
            logger.info("Seed data generation completed successfully")
            logger.info(f"Created: {report}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error in seed_all: {e}")
            return False
    
    def seed_minimal(self) -> bool:
        """Seed minimal data."""
        self.config.data_type = SeedDataType.MINIMAL
        self.config.num_users = 3
        self.config.num_channels = 2
        self.config.num_posts_per_channel = 2
        self.config.num_replies_per_post = 1
        self.config.num_messages = 3
        self.config.create_votes = False
        
        return self.seed_all()
    
    def seed_performance_test(self) -> bool:
        """Seed data for performance testing."""
        self.config.data_type = SeedDataType.PERFORMANCE_TEST
        self.config.num_users = 100
        self.config.num_channels = 20
        self.config.num_posts_per_channel = 50
        self.config.num_replies_per_post = 10
        self.config.num_messages = 500
        self.config.create_votes = True
        
        return self.seed_all()

def main():
    """Main seed script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database seed tool")
    parser.add_argument("command", choices=[
        "seed", "minimal", "performance", "cleanup", "reset", "report"
    ], help="Seed command to run")
    parser.add_argument("--users", type=int, default=10, help="Number of users to create")
    parser.add_argument("--channels", type=int, default=5, help="Number of channels to create")
    parser.add_argument("--posts", type=int, default=10, help="Number of posts per channel")
    parser.add_argument("--replies", type=int, default=5, help="Number of replies per post")
    parser.add_argument("--messages", type=int, default=20, help="Number of messages")
    parser.add_argument("--no-votes", action="store_true", help="Skip vote creation")
    parser.add_argument("--database-url", help="Database URL override")
    
    args = parser.parse_args()
    
    # Create configuration
    config = SeedConfig(
        num_users=args.users,
        num_channels=args.channels,
        num_posts_per_channel=args.posts,
        num_replies_per_post=args.replies,
        num_messages=args.messages,
        create_votes=not args.no_votes
    )
    
    manager = SeedDataManager(config)
    
    if args.command == "seed":
        success = manager.seed_all()
    elif args.command == "minimal":
        success = manager.seed_minimal()
    elif args.command == "performance":
        success = manager.seed_performance_test()
    elif args.command == "cleanup":
        success = manager.factory.cleanup_seed_data()
    elif args.command == "reset":
        success = manager.factory.reset_database()
    elif args.command == "report":
        report = manager.factory.generate_seed_report()
        print(json.dumps(report, indent=2))
        success = True
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)
    
    if not success:
        sys.exit(1)
    
    print("Seed operation completed successfully")

if __name__ == "__main__":
    main()