import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root_endpoint():
    """Test that root endpoint returns correct response"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Reddit-style Community API"}

def test_health_endpoint():
    """Test that health endpoint returns correct response"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}