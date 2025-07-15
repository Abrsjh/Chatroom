# Frontend Environment Variables Setup

## Vercel Environment Variables

### Required Environment Variables
Add these in your Vercel dashboard under Project Settings > Environment Variables:

#### Production Environment
```
VITE_API_URL=https://your-backend-app.onrender.com
VITE_APP_NAME=Community Discussion Platform
VITE_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0
```

#### Preview Environment
```
VITE_API_URL=https://your-backend-staging.onrender.com
VITE_APP_NAME=Community Discussion Platform (Preview)
VITE_ENVIRONMENT=preview
VITE_APP_VERSION=1.0.0-preview
```

#### Development Environment
```
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Community Discussion Platform (Dev)
VITE_ENVIRONMENT=development
VITE_APP_VERSION=1.0.0-dev
```

### Optional Environment Variables
```
VITE_POLLING_INTERVAL=5000
VITE_MAX_REPLY_DEPTH=10
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## Local Development Setup

### .env.local file
Create a `.env.local` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Community Discussion Platform (Local)
VITE_ENVIRONMENT=development
VITE_APP_VERSION=1.0.0-local
VITE_POLLING_INTERVAL=3000
VITE_MAX_REPLY_DEPTH=10
```

### .env.example file
Create a `.env.example` file in the `frontend/` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000

# App Configuration
VITE_APP_NAME=Community Discussion Platform
VITE_ENVIRONMENT=development
VITE_APP_VERSION=1.0.0

# Feature Configuration
VITE_POLLING_INTERVAL=5000
VITE_MAX_REPLY_DEPTH=10

# Optional: Analytics and Monitoring
VITE_SENTRY_DSN=
VITE_GOOGLE_ANALYTICS_ID=
```

## Environment-Specific Configuration

### Production Settings
- `VITE_API_URL`: Your production backend URL on Render
- `VITE_ENVIRONMENT`: Set to "production"
- Enable caching and optimization
- Set proper CORS origins

### Staging/Preview Settings
- `VITE_API_URL`: Your staging backend URL
- `VITE_ENVIRONMENT`: Set to "preview"
- Enable debug logging
- Use test data where appropriate

### Development Settings
- `VITE_API_URL`: Local backend (http://localhost:8000)
- `VITE_ENVIRONMENT`: Set to "development"
- Enable hot reloading
- Use mock data for testing

## Vercel Deployment Instructions

### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Select the root directory

### 2. Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend/`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Set Environment Variables
1. Go to Project Settings > Environment Variables
2. Add all required variables listed above
3. Set the appropriate environment (Production, Preview, Development)

### 4. Deploy
- Push to your main branch for production deployment
- Push to other branches for preview deployments
- Vercel will automatically build and deploy

## Troubleshooting

### Common Issues

#### Build Failures
- Check that all environment variables are set
- Verify the backend URL is accessible
- Ensure all dependencies are installed

#### Runtime Errors
- Check browser console for errors
- Verify API endpoints are responding
- Check CORS configuration

#### Environment Variable Issues
- Ensure all variables start with `VITE_`
- Check variable names match exactly
- Verify values don't contain special characters

### Debug Commands
```bash
# Check environment variables
npm run build -- --mode development

# Test build locally
npm run preview

# Check bundle size
npm run build:analyze
```

## Security Notes

- Never commit `.env.local` to version control
- Use different API URLs for different environments
- Rotate sensitive values regularly
- Use Vercel's encrypted environment variables for sensitive data
- Enable security headers in vercel.json