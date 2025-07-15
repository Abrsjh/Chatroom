"""
Environment configuration and settings management
"""

import os
from typing import Optional, List
from pydantic import BaseSettings, validator
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database settings
    database_url: str = "postgresql://user:password@localhost:5432/reddit_forum"
    
    # Security settings
    secret_key: str = "your-secret-key-change-this-in-production"
    jwt_secret_key: str = "your-jwt-secret-key-change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    
    # Application settings
    environment: str = "development"
    debug: bool = True
    app_name: str = "Reddit Forum API"
    app_version: str = "1.0.0"
    
    # CORS settings
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Email settings (optional)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    
    # Redis settings (optional)
    redis_url: Optional[str] = None
    
    # File upload settings
    max_file_size: int = 10485760  # 10MB
    allowed_file_types: List[str] = ["image/jpeg", "image/png", "image/gif"]
    
    # Rate limiting settings
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    
    # Logging settings
    log_level: str = "INFO"
    log_file: str = "app.log"
    
    # Sentry settings (optional)
    sentry_dsn: Optional[str] = None
    
    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("allowed_file_types", pre=True)
    def parse_allowed_file_types(cls, v):
        if isinstance(v, str):
            return [file_type.strip() for file_type in v.split(",")]
        return v
    
    @validator("debug", pre=True)
    def parse_debug(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if environment is production."""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if environment is development."""
        return self.environment.lower() == "development"
    
    @property
    def is_testing(self) -> bool:
        """Check if environment is testing."""
        return self.environment.lower() == "testing"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

# Environment-specific configurations
class ProductionSettings(Settings):
    """Production-specific settings."""
    debug: bool = False
    log_level: str = "WARNING"
    
    class Config:
        env_file = ".env.production"

class DevelopmentSettings(Settings):
    """Development-specific settings."""
    debug: bool = True
    log_level: str = "DEBUG"
    
    class Config:
        env_file = ".env.development"

class TestingSettings(Settings):
    """Testing-specific settings."""
    debug: bool = False
    log_level: str = "INFO"
    database_url: str = "postgresql://user:password@localhost:5432/reddit_forum_test"
    
    class Config:
        env_file = ".env.testing"

def get_environment_settings() -> Settings:
    """Get settings based on environment."""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    if environment == "production":
        return ProductionSettings()
    elif environment == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()

# Global settings instance
settings = get_environment_settings()

# Security utilities
def validate_environment_variables():
    """Validate that required environment variables are set."""
    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
        "JWT_SECRET_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

def generate_secret_key() -> str:
    """Generate a secure secret key."""
    import secrets
    return secrets.token_urlsafe(32)

def get_database_url() -> str:
    """Get database URL with fallback."""
    return os.getenv("DATABASE_URL", settings.database_url)

def get_cors_origins() -> List[str]:
    """Get CORS origins with environment-specific defaults."""
    if settings.is_production:
        return [
            "https://reddit-forum-frontend.vercel.app",
            "https://reddit-forum.com"
        ]
    else:
        return settings.cors_origins

def setup_logging():
    """Set up logging configuration."""
    import logging
    
    log_level = getattr(logging, settings.log_level.upper())
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(settings.log_file),
            logging.StreamHandler()
        ]
    )
    
    # Set up Sentry if configured
    if settings.sentry_dsn:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            integrations=[
                FastApiIntegration(auto_enable=True),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=1.0 if settings.is_development else 0.1,
            environment=settings.environment,
        )