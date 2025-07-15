# Backend Environment Variables Setup

## Render Environment Variables

### Required Environment Variables
Add these in your Render dashboard under Environment Variables:

#### Production Environment
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET_KEY=your-super-secure-secret-key-here
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
PORT=8000
PYTHON_VERSION=3.11
```

#### Staging Environment
```
DATABASE_URL=postgresql://user:password@staging-host:port/staging-database
JWT_SECRET_KEY=your-staging-secret-key-here
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
ENVIRONMENT=staging
DEBUG=true
CORS_ORIGINS=https://your-frontend-staging.vercel.app
PORT=8000
PYTHON_VERSION=3.11
```

### Optional Environment Variables
```
# Database Configuration
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30

# Security
JWT_ALGORITHM=HS256
PASSWORD_HASH_ROUNDS=12

# Application Settings
MAX_REPLY_DEPTH=10
POLLING_INTERVAL=5000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Monitoring and Logging
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=INFO
ENABLE_METRICS=true

# Email Configuration (if needed)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Storage (if needed)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

## Local Development Setup

### .env file
Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/community_platform_dev
JWT_SECRET_KEY=your-local-development-secret-key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=8000
PYTHON_VERSION=3.11
LOG_LEVEL=DEBUG
```

### .env.example file
Create a `.env.example` file in the `backend/` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/community_platform_dev

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_ALGORITHM=HS256

# Application Settings
ENVIRONMENT=development
DEBUG=true
PORT=8000
PYTHON_VERSION=3.11

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Database Pool Settings
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30

# Security Settings
PASSWORD_HASH_ROUNDS=12

# Feature Configuration
MAX_REPLY_DEPTH=10
POLLING_INTERVAL=5000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging Configuration
LOG_LEVEL=INFO
ENABLE_METRICS=false

# Optional: Monitoring
SENTRY_DSN=
```

## Environment-Specific Configuration

### Production Settings
- `DATABASE_URL`: PostgreSQL connection string from Render
- `JWT_SECRET_KEY`: Strong, randomly generated secret
- `DEBUG`: Set to `false`
- `CORS_ORIGINS`: Production frontend URLs only
- `LOG_LEVEL`: Set to `INFO` or `WARNING`

### Staging Settings
- `DATABASE_URL`: Staging database connection string
- `JWT_SECRET_KEY`: Different from production
- `DEBUG`: Set to `true` for debugging
- `CORS_ORIGINS`: Staging frontend URLs
- `LOG_LEVEL`: Set to `DEBUG`

### Development Settings
- `DATABASE_URL`: Local PostgreSQL connection
- `JWT_SECRET_KEY`: Local development secret
- `DEBUG`: Set to `true`
- `CORS_ORIGINS`: Local frontend URLs
- `LOG_LEVEL`: Set to `DEBUG`

## Render Deployment Instructions

### 1. Create New Web Service
1. Go to [Render Dashboard](https://render.com/dashboard)
2. Click "New" > "Web Service"
3. Connect your Git repository
4. Select the root directory

### 2. Configure Service Settings
- **Name**: community-platform-backend
- **Environment**: Python 3
- **Region**: Choose closest to your users
- **Branch**: main (or your production branch)
- **Root Directory**: backend/
- **Build Command**: `pip install -r requirements.txt && python -m alembic upgrade head`
- **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 3. Create PostgreSQL Database
1. Click "New" > "PostgreSQL"
2. Name: community-platform-db
3. Database Name: community_platform
4. User: Choose a username
5. Region: Same as your web service
6. Plan: Choose appropriate plan

### 4. Set Environment Variables
1. Go to your web service settings
2. Add all required variables listed above
3. Set `DATABASE_URL` to your PostgreSQL connection string
4. Generate a strong `JWT_SECRET_KEY`

### 5. Deploy
- Push to your main branch
- Render will automatically build and deploy
- Monitor the deployment logs

## Security Configuration

### JWT Secret Key Generation
```python
import secrets
secret_key = secrets.token_urlsafe(32)
print(secret_key)
```

### Database Connection Security
- Use connection pooling
- Enable SSL for database connections
- Set up proper database user permissions

### CORS Configuration
```python
# In production, be specific about origins
CORS_ORIGINS = [
    "https://your-frontend-domain.vercel.app",
    "https://your-custom-domain.com"
]
```

## Database Migration

### Initial Setup
```bash
# Create migration repository
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Run migration
alembic upgrade head
```

### Production Migration
```bash
# In your build command or deploy script
python -m alembic upgrade head
```

## Monitoring and Logging

### Health Check Endpoint
The application includes a health check endpoint at `/health` that Render will use to monitor service health.

### Logging Configuration
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Metrics (Optional)
Enable application metrics for monitoring:
```env
ENABLE_METRICS=true
```

## Troubleshooting

### Common Issues

#### Database Connection Errors
- Check `DATABASE_URL` format
- Verify database is running and accessible
- Check firewall rules

#### Migration Failures
- Ensure database user has proper permissions
- Check migration files for syntax errors
- Verify database schema state

#### Environment Variable Issues
- Check variable names match exactly
- Verify values don't contain special characters
- Ensure secrets are properly escaped

### Debug Commands
```bash
# Test database connection
python -c "from app.database import engine; print(engine.url)"

# Run migrations manually
alembic upgrade head

# Check application health
curl https://your-app.onrender.com/health
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for each environment
3. **Rotate secrets regularly** (every 90 days)
4. **Use environment-specific databases** 
5. **Enable SSL/TLS** for all connections
6. **Monitor logs** for security events
7. **Use Render's encrypted environment variables** for sensitive data
8. **Implement rate limiting** on API endpoints
9. **Keep dependencies updated** regularly
10. **Use proper CORS configuration** for each environment