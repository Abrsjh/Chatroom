from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models.models import RefreshToken
from app.schemas.auth import (
    UserRegister, UserLogin, UserResponse, TokenResponse, 
    TokenRefresh, LogoutResponse, ChangePassword, UserUpdate
)
from app.crud.auth import user_crud, refresh_token_crud
from app.utils.auth import (
    create_access_token, create_refresh_token, verify_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = user_crud.get_user_by_id(db, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account"""
    
    # Check if username already exists
    if user_crud.check_username_exists(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email already exists
    if user_crud.check_email_exists(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    try:
        user = user_crud.create_user(db, user_data)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )

@router.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    
    user = user_crud.authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Update last login
    user_crud.update_last_login(db, user.id)
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id), "username": user.username}
    )
    
    # Store refresh token in database
    refresh_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_crud.create_refresh_token(db, user.id, refresh_token, refresh_expires_at)
    
    # Limit user tokens
    refresh_token_crud.limit_user_tokens(db, user.id)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_token=refresh_token,
        user=user
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(refresh_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    
    # Verify refresh token format
    payload = verify_token(refresh_data.refresh_token, "refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Check if refresh token exists and is active
    db_token = refresh_token_crud.get_refresh_token(db, refresh_data.refresh_token)
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user
    user = user_crud.get_user_by_id(db, db_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user
    )

@router.post("/logout", response_model=LogoutResponse)
async def logout_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Logout user and revoke all refresh tokens"""
    
    token = credentials.credentials
    payload = verify_token(token, "access")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_id = payload.get("sub")
    if user_id:
        # Revoke all refresh tokens for the user
        refresh_token_crud.revoke_user_tokens(db, int(user_id))
    
    return LogoutResponse(message="Logged out successfully")

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    
    # Check if email is being updated and already exists
    if user_update.email and user_crud.check_email_exists(db, user_update.email, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    updated_user = user_crud.update_user(db, current_user.id, user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user

@router.post("/change-password", response_model=dict)
async def change_user_password(
    password_data: ChangePassword,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    success, message = user_crud.change_password(
        db, current_user.id, password_data.current_password, password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Revoke all refresh tokens to force re-login
    refresh_token_crud.revoke_user_tokens(db, current_user.id)
    
    return {"message": message}

@router.delete("/me", response_model=dict)
async def deactivate_current_user(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate current user account"""
    
    user = user_crud.deactivate_user(db, current_user.id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Revoke all refresh tokens
    refresh_token_crud.revoke_user_tokens(db, current_user.id)
    
    return {"message": "Account deactivated successfully"}

@router.get("/sessions", response_model=list[dict])
async def get_user_sessions(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active sessions for current user"""
    
    active_tokens = refresh_token_crud.get_user_active_tokens(db, current_user.id)
    
    sessions = []
    for token in active_tokens:
        sessions.append({
            "id": token.id,
            "created_at": token.created_at,
            "expires_at": token.expires_at
        })
    
    return sessions

@router.delete("/sessions/{session_id}")
async def revoke_user_session(
    session_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a specific user session"""
    
    # Get the refresh token
    db_token = db.query(RefreshToken).filter(
        RefreshToken.id == session_id,
        RefreshToken.user_id == current_user.id
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    refresh_token_crud.revoke_refresh_token(db, db_token.token)
    
    return {"message": "Session revoked successfully"}