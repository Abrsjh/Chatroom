import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db, Base
from app.models.models import User

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_auth.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

class TestUserRegistration:
    def test_register_new_user_success(self):
        """Test successful user registration with valid data"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePass123!"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
        assert "id" in data
        assert "password" not in data  # Password should not be returned
        assert "created_at" in data

    def test_register_duplicate_username_fails(self):
        """Test registration fails with duplicate username"""
        user_data = {
            "username": "duplicateuser",
            "email": "first@example.com",
            "password": "SecurePass123!"
        }
        
        # First registration should succeed
        response1 = client.post("/auth/register", json=user_data)
        assert response1.status_code == 201
        
        # Second registration with same username should fail
        user_data["email"] = "second@example.com"
        response2 = client.post("/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "username already exists" in response2.json()["detail"].lower()

    def test_register_duplicate_email_fails(self):
        """Test registration fails with duplicate email"""
        user_data = {
            "username": "user1",
            "email": "duplicate@example.com",
            "password": "SecurePass123!"
        }
        
        # First registration should succeed
        response1 = client.post("/auth/register", json=user_data)
        assert response1.status_code == 201
        
        # Second registration with same email should fail
        user_data["username"] = "user2"
        response2 = client.post("/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "email already exists" in response2.json()["detail"].lower()

    def test_register_invalid_email_fails(self):
        """Test registration fails with invalid email format"""
        user_data = {
            "username": "testuser",
            "email": "invalid-email",
            "password": "SecurePass123!"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422  # Validation error

    def test_register_weak_password_fails(self):
        """Test registration fails with weak password"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "weak"
        }
        
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422  # Validation error

    def test_register_missing_fields_fails(self):
        """Test registration fails with missing required fields"""
        incomplete_data = {
            "username": "testuser"
            # Missing email and password
        }
        
        response = client.post("/auth/register", json=incomplete_data)
        assert response.status_code == 422  # Validation error

class TestUserLogin:
    def test_login_valid_credentials_success(self):
        """Test successful login with valid username and password"""
        # First register a user
        user_data = {
            "username": "loginuser",
            "email": "login@example.com",
            "password": "SecurePass123!"
        }
        client.post("/auth/register", json=user_data)
        
        # Now test login
        login_data = {
            "username": "loginuser",
            "password": "SecurePass123!"
        }
        
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["username"] == "loginuser"

    def test_login_with_email_success(self):
        """Test successful login with email instead of username"""
        # First register a user
        user_data = {
            "username": "emailuser",
            "email": "emaillogin@example.com",
            "password": "SecurePass123!"
        }
        client.post("/auth/register", json=user_data)
        
        # Now test login with email
        login_data = {
            "username": "emaillogin@example.com",  # Using email as username
            "password": "SecurePass123!"
        }
        
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "emaillogin@example.com"

    def test_login_invalid_username_fails(self):
        """Test login fails with non-existent username"""
        login_data = {
            "username": "nonexistent",
            "password": "anypassword"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()

    def test_login_invalid_password_fails(self):
        """Test login fails with incorrect password"""
        # First register a user
        user_data = {
            "username": "wrongpassuser",
            "email": "wrongpass@example.com",
            "password": "CorrectPass123!"
        }
        client.post("/auth/register", json=user_data)
        
        # Now test login with wrong password
        login_data = {
            "username": "wrongpassuser",
            "password": "WrongPass123!"
        }
        
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()

    def test_login_missing_fields_fails(self):
        """Test login fails with missing required fields"""
        incomplete_data = {
            "username": "testuser"
            # Missing password
        }
        
        response = client.post("/auth/login", json=incomplete_data)
        assert response.status_code == 422  # Validation error

class TestTokenValidation:
    def test_access_protected_endpoint_with_valid_token(self):
        """Test accessing protected endpoint with valid JWT token"""
        # Register and login to get token
        user_data = {
            "username": "tokenuser",
            "email": "token@example.com",
            "password": "SecurePass123!"
        }
        client.post("/auth/register", json=user_data)
        
        login_data = {
            "username": "tokenuser",
            "password": "SecurePass123!"
        }
        login_response = client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Test protected endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "tokenuser"
        assert data["email"] == "token@example.com"

    def test_access_protected_endpoint_without_token_fails(self):
        """Test accessing protected endpoint without token fails"""
        response = client.get("/auth/me")
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower()

    def test_access_protected_endpoint_with_invalid_token_fails(self):
        """Test accessing protected endpoint with invalid token fails"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401
        assert "invalid token" in response.json()["detail"].lower()

    def test_access_protected_endpoint_with_expired_token_fails(self):
        """Test accessing protected endpoint with expired token fails"""
        # This test would require manipulating token expiration
        # For now, we'll test the structure - implementation will handle expiration
        headers = {"Authorization": "Bearer expired_token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401

class TestTokenRefresh:
    def test_refresh_token_success(self):
        """Test successful token refresh with valid refresh token"""
        # Register and login to get tokens
        user_data = {
            "username": "refreshuser",
            "email": "refresh@example.com",
            "password": "SecurePass123!"
        }
        client.post("/auth/register", json=user_data)
        
        login_data = {
            "username": "refreshuser",
            "password": "SecurePass123!"
        }
        login_response = client.post("/auth/login", json=login_data)
        refresh_token = login_response.json().get("refresh_token")
        
        # Test token refresh
        refresh_data = {"refresh_token": refresh_token}
        response = client.post("/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert "expires_in" in data

    def test_refresh_token_invalid_fails(self):
        """Test token refresh fails with invalid refresh token"""
        refresh_data = {"refresh_token": "invalid_refresh_token"}
        response = client.post("/auth/refresh", json=refresh_data)
        assert response.status_code == 401
        assert "invalid refresh token" in response.json()["detail"].lower()

class TestLogout:
    def test_logout_success(self):
        """Test successful logout invalidates token"""
        # Register and login to get token
        user_data = {
            "username": "logoutuser",
            "email": "logout@example.com",
            "password": "SecurePass123!"
        }
        client.post("/auth/register", json=user_data)
        
        login_data = {
            "username": "logoutuser",
            "password": "SecurePass123!"
        }
        login_response = client.post("/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        
        # Test logout
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/auth/logout", headers=headers)
        
        assert response.status_code == 200
        assert "logged out successfully" in response.json()["message"].lower()
        
        # Verify token is invalidated
        protected_response = client.get("/auth/me", headers=headers)
        assert protected_response.status_code == 401

    def test_logout_without_token_fails(self):
        """Test logout fails without authentication token"""
        response = client.post("/auth/logout")
        assert response.status_code == 401

@pytest.fixture(autouse=True)
def cleanup_database():
    """Clean up database after each test"""
    yield
    db = TestingSessionLocal()
    try:
        db.query(User).delete()
        db.commit()
    finally:
        db.close()