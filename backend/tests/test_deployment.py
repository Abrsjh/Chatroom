import pytest
import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock

class TestDockerConfiguration:
    """Test suite for Docker configuration and deployment setup."""
    
    def test_dockerfile_exists(self):
        """Test that Dockerfile exists in backend directory."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        assert dockerfile_path.exists(), "Dockerfile not found in backend directory"
    
    def test_dockerfile_python_version(self):
        """Test that Dockerfile uses correct Python version."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "FROM python:3.11" in content, "Dockerfile should use Python 3.11"
    
    def test_dockerfile_working_directory(self):
        """Test that Dockerfile sets correct working directory."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "WORKDIR /app" in content, "Dockerfile should set working directory to /app"
    
    def test_dockerfile_requirements_installation(self):
        """Test that Dockerfile installs requirements."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "COPY requirements.txt" in content, "Dockerfile should copy requirements.txt"
        assert "pip install -r requirements.txt" in content, "Dockerfile should install requirements"
    
    def test_dockerfile_app_copy(self):
        """Test that Dockerfile copies application code."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "COPY app/" in content, "Dockerfile should copy app directory"
    
    def test_dockerfile_port_exposure(self):
        """Test that Dockerfile exposes correct port."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "EXPOSE 8000" in content, "Dockerfile should expose port 8000"
    
    def test_dockerfile_cmd_command(self):
        """Test that Dockerfile has correct CMD command."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "CMD" in content, "Dockerfile should have CMD instruction"
        assert "uvicorn" in content, "Dockerfile should use uvicorn"
    
    def test_dockerfile_environment_variables(self):
        """Test that Dockerfile sets environment variables."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "ENV PYTHONPATH=/app" in content, "Dockerfile should set PYTHONPATH"
    
    def test_dockerfile_user_security(self):
        """Test that Dockerfile creates non-root user."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "RUN adduser" in content or "RUN useradd" in content, "Dockerfile should create non-root user"
        assert "USER" in content, "Dockerfile should switch to non-root user"
    
    def test_dockerfile_optimization(self):
        """Test that Dockerfile is optimized for production."""
        dockerfile_path = Path(__file__).parent.parent / "Dockerfile"
        content = dockerfile_path.read_text()
        assert "--no-cache-dir" in content, "Dockerfile should use --no-cache-dir for pip"
        assert "rm -rf" in content or "apt-get clean" in content, "Dockerfile should clean up after installation"

class TestRenderConfiguration:
    """Test suite for Render deployment configuration."""
    
    def test_render_yaml_exists(self):
        """Test that render.yaml exists."""
        render_path = Path(__file__).parent.parent / "render.yaml"
        assert render_path.exists(), "render.yaml not found"
    
    def test_render_yaml_service_definition(self):
        """Test that render.yaml defines web service."""
        render_path = Path(__file__).parent.parent / "render.yaml"
        content = render_path.read_text()
        assert "services:" in content, "render.yaml should define services"
        assert "type: web" in content, "render.yaml should define web service"
    
    def test_render_yaml_environment_variables(self):
        """Test that render.yaml configures environment variables."""
        render_path = Path(__file__).parent.parent / "render.yaml"
        content = render_path.read_text()
        assert "envVars:" in content, "render.yaml should define environment variables"
        assert "DATABASE_URL" in content, "render.yaml should include DATABASE_URL"
    
    def test_render_yaml_build_command(self):
        """Test that render.yaml has correct build command."""
        render_path = Path(__file__).parent.parent / "render.yaml"
        content = render_path.read_text()
        assert "buildCommand:" in content, "render.yaml should define build command"
        assert "pip install" in content, "render.yaml should install dependencies"
    
    def test_render_yaml_start_command(self):
        """Test that render.yaml has correct start command."""
        render_path = Path(__file__).parent.parent / "render.yaml"
        content = render_path.read_text()
        assert "startCommand:" in content, "render.yaml should define start command"
        assert "uvicorn" in content, "render.yaml should use uvicorn"

class TestEnvironmentConfiguration:
    """Test suite for environment variable configuration."""
    
    def test_env_example_exists(self):
        """Test that .env.example exists."""
        env_path = Path(__file__).parent.parent / ".env.example"
        assert env_path.exists(), ".env.example not found"
    
    def test_env_example_database_url(self):
        """Test that .env.example includes DATABASE_URL."""
        env_path = Path(__file__).parent.parent / ".env.example"
        content = env_path.read_text()
        assert "DATABASE_URL=" in content, ".env.example should include DATABASE_URL"
    
    def test_env_example_secret_key(self):
        """Test that .env.example includes SECRET_KEY."""
        env_path = Path(__file__).parent.parent / ".env.example"
        content = env_path.read_text()
        assert "SECRET_KEY=" in content, ".env.example should include SECRET_KEY"
    
    def test_env_example_environment(self):
        """Test that .env.example includes ENVIRONMENT."""
        env_path = Path(__file__).parent.parent / ".env.example"
        content = env_path.read_text()
        assert "ENVIRONMENT=" in content, ".env.example should include ENVIRONMENT"

class TestDatabaseMigration:
    """Test suite for database migration setup."""
    
    def test_alembic_ini_exists(self):
        """Test that alembic.ini exists."""
        alembic_path = Path(__file__).parent.parent / "alembic.ini"
        assert alembic_path.exists(), "alembic.ini not found"
    
    def test_alembic_directory_exists(self):
        """Test that alembic directory exists."""
        alembic_dir = Path(__file__).parent.parent / "alembic"
        assert alembic_dir.exists(), "alembic directory not found"
        assert alembic_dir.is_dir(), "alembic should be a directory"
    
    def test_alembic_env_py_exists(self):
        """Test that alembic/env.py exists."""
        env_path = Path(__file__).parent.parent / "alembic" / "env.py"
        assert env_path.exists(), "alembic/env.py not found"
    
    def test_alembic_script_py_exists(self):
        """Test that alembic/script.py.mako exists."""
        script_path = Path(__file__).parent.parent / "alembic" / "script.py.mako"
        assert script_path.exists(), "alembic/script.py.mako not found"
    
    def test_migration_script_exists(self):
        """Test that migration script exists."""
        script_path = Path(__file__).parent.parent / "scripts" / "migrate.py"
        assert script_path.exists(), "migration script not found"

class TestDeploymentScripts:
    """Test suite for deployment scripts."""
    
    def test_deploy_script_exists(self):
        """Test that deployment script exists."""
        script_path = Path(__file__).parent.parent / "scripts" / "deploy.sh"
        assert script_path.exists(), "deployment script not found"
    
    def test_health_check_exists(self):
        """Test that health check endpoint exists."""
        from app.main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200, "Health check endpoint should return 200"
        assert "status" in response.json(), "Health check should return status"
    
    def test_startup_script_exists(self):
        """Test that startup script exists."""
        script_path = Path(__file__).parent.parent / "scripts" / "startup.sh"
        assert script_path.exists(), "startup script not found"

class TestSecurityConfiguration:
    """Test suite for security configuration."""
    
    def test_production_settings_secure(self):
        """Test that production settings are secure."""
        # This would test environment-specific security settings
        pass
    
    def test_cors_configuration(self):
        """Test CORS configuration for production."""
        from app.main import app
        
        # Check if CORS is configured
        middleware_classes = [type(middleware).__name__ for middleware in app.user_middleware]
        assert "CORSMiddleware" in middleware_classes, "CORS middleware should be configured"

class TestPerformanceConfiguration:
    """Test suite for performance configuration."""
    
    def test_uvicorn_workers_configured(self):
        """Test that uvicorn workers are configured for production."""
        # This would test worker configuration
        pass
    
    def test_database_connection_pool(self):
        """Test that database connection pool is configured."""
        # This would test database connection pool settings
        pass