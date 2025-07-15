from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import channels, posts, messages, replies, votes, auth, moderation
from app.config import settings, setup_logging
from app.database import engine
from sqlalchemy import text
import logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    description="A FastAPI backend for a Reddit-style community discussion platform",
    version=settings.app_version,
    debug=settings.debug
)

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(channels.router)
app.include_router(posts.router)
app.include_router(messages.router)
app.include_router(replies.router)
app.include_router(votes.router)
app.include_router(moderation.router)

@app.get("/")
async def root():
    return {"message": f"{settings.app_name} v{settings.app_version}"}

@app.get("/health")
async def health():
    """Health check endpoint for monitoring and deployment."""
    try:
        # Check database connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        return {
            "status": "healthy",
            "environment": settings.environment,
            "version": settings.app_version,
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "database": "disconnected"
            }
        )

@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info(f"Shutting down {settings.app_name}")

# Error handler for uncaught exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for production error handling."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    if settings.debug:
        # In debug mode, show detailed error
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "type": type(exc).__name__}
        )
    else:
        # In production, return generic error
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )