#!/usr/bin/env python3
"""
Database migration script for Reddit Forum Backend
This script handles database migrations using Alembic
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Optional

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from app.database import DATABASE_URL

class DatabaseMigrator:
    """Handles database migrations and setup."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or DATABASE_URL
        self.alembic_cfg = Config(str(project_root / "alembic.ini"))
        self.alembic_cfg.set_main_option("sqlalchemy.url", self.database_url)
    
    def create_database_if_not_exists(self) -> bool:
        """Create database if it doesn't exist."""
        try:
            # Extract database name from URL
            db_name = self.database_url.split("/")[-1]
            base_url = self.database_url.rsplit("/", 1)[0]
            
            # Connect to postgres database to create our database
            engine = create_engine(f"{base_url}/postgres")
            
            with engine.connect() as conn:
                # Set autocommit mode for database creation
                conn.execute(text("COMMIT"))
                
                # Check if database exists
                result = conn.execute(text(
                    "SELECT 1 FROM pg_database WHERE datname = :db_name"
                ), {"db_name": db_name})
                
                if not result.fetchone():
                    # Database doesn't exist, create it
                    conn.execute(text(f"CREATE DATABASE {db_name}"))
                    print(f"Created database: {db_name}")
                    return True
                else:
                    print(f"Database already exists: {db_name}")
                    return False
                    
        except SQLAlchemyError as e:
            print(f"Error creating database: {e}")
            return False
    
    def run_migrations(self) -> bool:
        """Run database migrations."""
        try:
            print("Running database migrations...")
            command.upgrade(self.alembic_cfg, "head")
            print("Migrations completed successfully")
            return True
        except Exception as e:
            print(f"Error running migrations: {e}")
            return False
    
    def check_migration_status(self) -> bool:
        """Check current migration status."""
        try:
            print("Checking migration status...")
            command.current(self.alembic_cfg, verbose=True)
            return True
        except Exception as e:
            print(f"Error checking migration status: {e}")
            return False
    
    def create_migration(self, message: str) -> bool:
        """Create a new migration."""
        try:
            print(f"Creating migration: {message}")
            command.revision(self.alembic_cfg, message=message, autogenerate=True)
            print("Migration created successfully")
            return True
        except Exception as e:
            print(f"Error creating migration: {e}")
            return False
    
    def rollback_migration(self, revision: str = "-1") -> bool:
        """Rollback to a specific migration."""
        try:
            print(f"Rolling back to revision: {revision}")
            command.downgrade(self.alembic_cfg, revision)
            print("Rollback completed successfully")
            return True
        except Exception as e:
            print(f"Error rolling back migration: {e}")
            return False
    
    def seed_database(self) -> bool:
        """Seed database with initial data."""
        try:
            print("Seeding database with initial data...")
            
            from app.database import get_database
            from app.models.models import User, Channel
            from app.utils.auth import get_password_hash
            
            engine = create_engine(self.database_url)
            
            with engine.connect() as conn:
                # Create admin user
                admin_password = get_password_hash("admin123")
                conn.execute(text("""
                    INSERT INTO users (username, email, password_hash, is_active, is_superuser, created_at)
                    VALUES ('admin', 'admin@example.com', :password, true, true, NOW())
                    ON CONFLICT (username) DO NOTHING
                """), {"password": admin_password})
                
                # Create test user
                test_password = get_password_hash("test123")
                conn.execute(text("""
                    INSERT INTO users (username, email, password_hash, is_active, is_superuser, created_at)
                    VALUES ('testuser', 'test@example.com', :password, true, false, NOW())
                    ON CONFLICT (username) DO NOTHING
                """), {"password": test_password})
                
                # Create default channels
                conn.execute(text("""
                    INSERT INTO channels (name, description, created_by, created_at, is_active)
                    VALUES 
                        ('general', 'General discussion', 1, NOW(), true),
                        ('announcements', 'Important announcements', 1, NOW(), true),
                        ('help', 'Help and support', 1, NOW(), true)
                    ON CONFLICT (name) DO NOTHING
                """))
                
                conn.commit()
                print("Database seeded successfully")
                return True
                
        except Exception as e:
            print(f"Error seeding database: {e}")
            return False

def main():
    """Main migration script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database migration tool")
    parser.add_argument("command", choices=[
        "migrate", "create", "rollback", "status", "seed", "setup"
    ], help="Migration command to run")
    parser.add_argument("--message", "-m", help="Migration message (for create)")
    parser.add_argument("--revision", "-r", help="Revision to rollback to")
    parser.add_argument("--database-url", help="Database URL override")
    
    args = parser.parse_args()
    
    migrator = DatabaseMigrator(args.database_url)
    
    if args.command == "setup":
        # Full setup: create database, run migrations, seed data
        success = (
            migrator.create_database_if_not_exists() and
            migrator.run_migrations() and
            migrator.seed_database()
        )
    elif args.command == "migrate":
        success = migrator.run_migrations()
    elif args.command == "create":
        if not args.message:
            print("Error: --message is required for create command")
            sys.exit(1)
        success = migrator.create_migration(args.message)
    elif args.command == "rollback":
        revision = args.revision or "-1"
        success = migrator.rollback_migration(revision)
    elif args.command == "status":
        success = migrator.check_migration_status()
    elif args.command == "seed":
        success = migrator.seed_database()
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)
    
    if not success:
        sys.exit(1)
    
    print("Migration operation completed successfully")

if __name__ == "__main__":
    main()