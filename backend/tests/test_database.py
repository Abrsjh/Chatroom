import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.database import get_database_url, get_engine, SessionLocal, get_db, Base
import os

def test_get_database_url_with_env_var():
    """Test database URL generation with environment variable"""
    with patch.dict(os.environ, {'DATABASE_URL': 'postgresql://test:test@localhost/testdb'}):
        url = get_database_url()
        assert url == 'postgresql://test:test@localhost/testdb'

def test_get_database_url_default():
    """Test database URL generation with default values"""
    with patch.dict(os.environ, {}, clear=True):
        url = get_database_url()
        expected = "postgresql://postgres:password@localhost:5432/reddit_db"
        assert url == expected

def test_get_engine_creation():
    """Test engine creation with correct parameters"""
    engine = get_engine()
    assert engine is not None
    assert str(engine.url).startswith('postgresql://')

def test_session_local_creation():
    """Test SessionLocal sessionmaker configuration"""
    assert SessionLocal is not None
    assert isinstance(SessionLocal, sessionmaker)
    
    # Test session creation
    session = SessionLocal()
    assert isinstance(session, Session)
    session.close()

def test_get_db_dependency():
    """Test get_db dependency function for FastAPI"""
    db_generator = get_db()
    
    # Test that it returns a generator
    assert hasattr(db_generator, '__next__')
    
    # Test that it yields a session
    session = next(db_generator)
    assert isinstance(session, Session)
    
    # Test that it closes the session (generator cleanup)
    try:
        next(db_generator)
    except StopIteration:
        pass  # Expected behavior

def test_base_metadata():
    """Test that Base metadata is properly configured"""
    assert Base.metadata is not None
    assert hasattr(Base.metadata, 'create_all')
    assert hasattr(Base.metadata, 'drop_all')

@patch('backend.app.database.create_engine')
def test_engine_configuration(mock_create_engine):
    """Test engine is created with correct configuration"""
    mock_engine = MagicMock()
    mock_create_engine.return_value = mock_engine
    
    from backend.app.database import get_engine
    engine = get_engine()
    
    mock_create_engine.assert_called_once()
    args, kwargs = mock_create_engine.call_args
    
    # Check that pool configuration is included
    assert 'pool_size' in kwargs
    assert 'max_overflow' in kwargs
    assert 'pool_pre_ping' in kwargs

def test_database_url_components():
    """Test database URL contains all required components"""
    url = get_database_url()
    
    # Should be a valid PostgreSQL URL
    assert url.startswith('postgresql://')
    assert '@' in url  # Should have user:password@host format
    assert '/' in url.split('@')[1]  # Should have database name