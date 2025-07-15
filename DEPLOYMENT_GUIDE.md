# Deployment Instructions

## Overview
This document provides step-by-step instructions for deploying the Community Discussion Platform to production using Vercel (frontend) and Render (backend).

## Prerequisites

### Required Accounts
- [Vercel Account](https://vercel.com/signup)
- [Render Account](https://render.com/register)
- Git repository (GitHub, GitLab, or Bitbucket)

### Required Tools
- Git CLI
- Node.js 18+
- Python 3.11+
- PostgreSQL (for local testing)

## Phase 1: Backend Deployment (Render)

### Step 1: Create PostgreSQL Database
1. Log into [Render Dashboard](https://render.com/dashboard)
2. Click "New" → "PostgreSQL"
3. Configure database:
   - **Name**: `community-platform-db`
   - **Database Name**: `community_platform`
   - **User**: `admin` (or your preferred username)
   - **Region**: Choose region closest to your users
   - **Plan**: Select appropriate plan (Free tier available)
4. Click "Create Database"
5. Save the connection details (available in database dashboard)

### Step 2: Create Backend Web Service
1. In Render Dashboard, click "New" → "Web Service"
2. Connect your Git repository
3. Configure service settings:
   - **Name**: `community-platform-backend`
   - **Environment**: Python 3
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: `backend/`
   - **Build Command**: `pip install -r requirements.txt && python -m alembic upgrade head`
   - **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Configure Environment Variables
In your web service settings, add these environment variables:

#### Required Variables
```
DATABASE_URL=[Your PostgreSQL connection string from Step 1]
JWT_SECRET_KEY=[Generate using: python -c "import secrets; print(secrets.token_urlsafe(32))"]
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://your-frontend-domain.vercel.app
PORT=8000
PYTHON_VERSION=3.11
```

#### Optional Variables
```
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
LOG_LEVEL=INFO
PASSWORD_HASH_ROUNDS=12
MAX_REPLY_DEPTH=10
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### Step 4: Deploy Backend
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Test the deployment by visiting: `https://your-backend-name.onrender.com/health`
4. Save your backend URL for frontend configuration

## Phase 2: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend Configuration
1. Update `vercel.json` with your backend URL:
   ```json
   {
     "env": {
       "VITE_API_URL": "https://your-backend-name.onrender.com"
     }
   }
   ```

### Step 2: Create Vercel Project
1. Log into [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend/`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Configure Environment Variables
In Vercel project settings, add these environment variables:

#### Production Environment
```
VITE_API_URL=https://your-backend-name.onrender.com
VITE_APP_NAME=Community Discussion Platform
VITE_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
```

#### Optional Variables
```
VITE_POLLING_INTERVAL=5000
VITE_MAX_REPLY_DEPTH=10
VITE_SENTRY_DSN=[Your Sentry DSN if using]
VITE_GOOGLE_ANALYTICS_ID=[Your GA ID if using]
```

### Step 4: Deploy Frontend
1. Click "Deploy"
2. Wait for deployment to complete
3. Test the deployment by visiting your Vercel URL
4. Update CORS_ORIGINS in your backend with the frontend URL

## Phase 3: Post-Deployment Configuration

### Step 1: Update CORS Configuration
1. Go back to your Render backend service
2. Update the `CORS_ORIGINS` environment variable:
   ```
   CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
   ```
3. Redeploy the backend service

### Step 2: Database Seeding (Optional)
1. Access your Render service's shell (if available) or run locally:
   ```bash
   python scripts/seed_database.py
   ```
2. This will create initial channels and sample data

### Step 3: Custom Domain Setup (Optional)

#### For Vercel (Frontend)
1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable SSL certificate

#### For Render (Backend)
1. In Render service settings, go to "Custom Domains"
2. Add your API subdomain (e.g., `api.yourdomain.com`)
3. Configure DNS records as instructed
4. Update frontend environment variables with new API URL

## Phase 4: Monitoring and Maintenance

### Step 1: Health Checks
Both services include health check endpoints:
- Frontend: Available at root URL
- Backend: Available at `/health`

### Step 2: Log Monitoring
- **Vercel**: Check deployment logs in dashboard
- **Render**: Check service logs in dashboard
- Consider setting up log aggregation (e.g., Sentry, LogRocket)

### Step 3: Database Maintenance
- Regular backups are handled by Render
- Monitor database performance and storage usage
- Plan for scaling as user base grows

## Troubleshooting

### Common Deployment Issues

#### Backend Deployment Failures
- **Database Connection**: Check DATABASE_URL format
- **Migration Errors**: Verify database permissions
- **Build Failures**: Check requirements.txt and Python version

#### Frontend Deployment Failures
- **Build Errors**: Check environment variables
- **API Connection**: Verify CORS configuration
- **Asset Loading**: Check build configuration

### Debug Commands

#### Test Backend Health
```bash
curl https://your-backend-name.onrender.com/health
```

#### Test Frontend Build Locally
```bash
cd frontend
npm run build
npm run preview
```

#### Check Backend Logs
```bash
# In Render dashboard, access service logs
# Look for startup errors or API request failures
```

## Security Checklist

### Before Going Live
- [ ] JWT_SECRET_KEY is strong and unique
- [ ] Database user has minimal required permissions
- [ ] CORS_ORIGINS is set to specific domains only
- [ ] DEBUG is set to false in production
- [ ] SSL/TLS is enabled for all connections
- [ ] Rate limiting is configured
- [ ] Security headers are enabled
- [ ] Environment variables are not exposed in logs

### After Deployment
- [ ] Test all major user flows
- [ ] Verify authentication works correctly
- [ ] Check real-time messaging functionality
- [ ] Test file upload/download (if applicable)
- [ ] Monitor for any security vulnerabilities
- [ ] Set up alerting for errors and performance issues

## Performance Optimization

### Frontend Optimization
- Enable Vercel Analytics
- Set up proper caching headers
- Monitor Core Web Vitals
- Consider CDN for static assets

### Backend Optimization
- Monitor database query performance
- Set up connection pooling
- Consider Redis for caching
- Monitor API response times

## Scaling Considerations

### When to Scale
- CPU usage consistently above 70%
- Memory usage consistently above 80%
- Database connections near limit
- Response times increasing

### Scaling Options
- **Render**: Upgrade to higher-tier plans
- **Database**: Increase storage and connection limits
- **Caching**: Add Redis for session storage
- **CDN**: Consider CloudFront for global distribution

## Backup Strategy

### Database Backups
- Render automatically backs up PostgreSQL
- Consider additional backup strategy for critical data
- Test backup restoration process

### Code Backups
- Ensure code is properly version controlled
- Tag releases for easy rollback
- Document deployment process

## Rollback Procedure

### If Deployment Fails
1. **Render**: Rollback to previous successful deployment
2. **Vercel**: Rollback to previous deployment in dashboard
3. **Database**: Restore from backup if schema changes were made

### Emergency Rollback
1. Revert to last known good commit
2. Redeploy both services
3. Verify all functionality works
4. Communicate with users about any downtime

## Support and Documentation

### Additional Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

### Getting Help
- Check service status pages
- Review deployment logs
- Test locally with production environment variables
- Contact support if needed

## Conclusion

Following this deployment guide will result in a production-ready Community Discussion Platform with:

- ✅ Secure authentication and authorization
- ✅ Real-time messaging capabilities
- ✅ Threaded discussions with voting
- ✅ Content moderation tools
- ✅ Mobile-responsive design
- ✅ Production-grade security
- ✅ Scalable architecture
- ✅ Comprehensive monitoring

The platform is now ready for users and can be scaled based on traffic and usage patterns.