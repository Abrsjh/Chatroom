import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.models import Base

def get_database_url() -> str:
    """Get database URL from environment variable or use default"""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/reddit_db"
    )

def get_engine():
    """Create and return SQLAlchemy engine with connection pooling"""
    database_url = get_database_url()
    
    engine = create_engine(
        database_url,
        pool_size=20,
        max_overflow=0,
        pool_pre_ping=True,
        pool_recycle=300
    )
    
    return engine

# Create engine instance
engine = get_engine()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Database dependency for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)