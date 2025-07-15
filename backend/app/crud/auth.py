from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from typing import Optional, Union
from app.models.models import User, RefreshToken
from app.schemas.auth import UserRegister, UserUpdate
from app.utils.auth import get_password_hash, verify_password, generate_verification_token
import secrets

class UserCRUD:
    def create_user(self, db: Session, user_data: UserRegister) -> User:
        """Create a new user with hashed password"""
        hashed_password = get_password_hash(user_data.password)
        
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            is_active=True,
            is_verified=False,
            is_superuser=False
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    def get_user_by_username_or_email(self, db: Session, identifier: str) -> Optional[User]:
        """Get user by username or email"""
        return db.query(User).filter(
            or_(User.username == identifier, User.email == identifier)
        ).first()
    
    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user with username/email and password"""
        user = self.get_user_by_username_or_email(db, username)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        return user
    
    def update_user(self, db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        """Update user information"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            return None
        
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    def update_last_login(self, db: Session, user_id: int) -> Optional[User]:
        """Update user's last login timestamp"""
        user = self.get_user_by_id(db, user_id)
        if user:
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)
        return user
    
    def change_password(self, db: Session, user_id: int, current_password: str, new_password: str) -> tuple[bool, str]:
        """Change user password after verifying current password"""
        user = self.get_user_by_id(db, user_id)
        if not user:
            return False, "User not found"
        
        if not verify_password(current_password, user.password_hash):
            return False, "Current password is incorrect"
        
        user.password_hash = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        db.commit()
        return True, "Password changed successfully"
    
    def reset_password(self, db: Session, user_id: int, new_password: str) -> Optional[User]:
        """Reset user password (for password reset flow)"""
        user = self.get_user_by_id(db, user_id)
        if user:
            user.password_hash = get_password_hash(new_password)
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
        return user
    
    def deactivate_user(self, db: Session, user_id: int) -> Optional[User]:
        """Deactivate user account"""
        user = self.get_user_by_id(db, user_id)
        if user:
            user.is_active = False
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
        return user
    
    def verify_user(self, db: Session, user_id: int) -> Optional[User]:
        """Mark user as verified"""
        user = self.get_user_by_id(db, user_id)
        if user:
            user.is_verified = True
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
        return user
    
    def check_username_exists(self, db: Session, username: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if username already exists"""
        query = db.query(User).filter(User.username == username)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        return query.first() is not None
    
    def check_email_exists(self, db: Session, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if email already exists"""
        query = db.query(User).filter(User.email == email)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        return query.first() is not None

class RefreshTokenCRUD:
    def create_refresh_token(self, db: Session, user_id: int, token: str, expires_at: datetime) -> RefreshToken:
        """Create a new refresh token"""
        db_token = RefreshToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at,
            is_revoked=False
        )
        
        db.add(db_token)
        db.commit()
        db.refresh(db_token)
        return db_token
    
    def get_refresh_token(self, db: Session, token: str) -> Optional[RefreshToken]:
        """Get refresh token by token string"""
        return db.query(RefreshToken).filter(
            and_(
                RefreshToken.token == token,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        ).first()
    
    def revoke_refresh_token(self, db: Session, token: str) -> bool:
        """Revoke a refresh token"""
        db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
        if db_token:
            db_token.is_revoked = True
            db.commit()
            return True
        return False
    
    def revoke_user_tokens(self, db: Session, user_id: int) -> int:
        """Revoke all refresh tokens for a user"""
        result = db.query(RefreshToken).filter(
            and_(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False
            )
        ).update({"is_revoked": True})
        db.commit()
        return result
    
    def cleanup_expired_tokens(self, db: Session) -> int:
        """Remove expired refresh tokens"""
        result = db.query(RefreshToken).filter(
            RefreshToken.expires_at < datetime.utcnow()
        ).delete()
        db.commit()
        return result
    
    def get_user_active_tokens(self, db: Session, user_id: int) -> list[RefreshToken]:
        """Get all active refresh tokens for a user"""
        return db.query(RefreshToken).filter(
            and_(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        ).all()
    
    def limit_user_tokens(self, db: Session, user_id: int, max_tokens: int = 5) -> int:
        """Limit the number of active tokens per user"""
        active_tokens = db.query(RefreshToken).filter(
            and_(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow()
            )
        ).order_by(RefreshToken.created_at.desc()).all()
        
        if len(active_tokens) >= max_tokens:
            # Revoke oldest tokens
            tokens_to_revoke = active_tokens[max_tokens-1:]
            for token in tokens_to_revoke:
                token.is_revoked = True
            db.commit()
            return len(tokens_to_revoke)
        return 0

# Create instances
user_crud = UserCRUD()
refresh_token_crud = RefreshTokenCRUD()