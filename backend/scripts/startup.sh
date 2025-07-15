#!/bin/bash

# Startup script for Reddit Forum Backend
# This script handles application startup with proper initialization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize application
initialize_app() {
    log_info "Initializing application..."
    
    # Set default environment variables
    export PYTHONPATH="${PYTHONPATH:-/app}"
    export PYTHONUNBUFFERED=1
    export PYTHONDONTWRITEBYTECODE=1
    
    # Set default port
    export PORT="${PORT:-8000}"
    
    # Validate environment variables
    python -c "from app.config import validate_environment_variables; validate_environment_variables()"
    
    log_success "Application initialized"
}

# Setup database
setup_database() {
    log_info "Setting up database..."
    
    # Run migrations
    python scripts/migrate.py migrate
    
    # Seed database if in development
    if [ "${ENVIRONMENT:-development}" = "development" ]; then
        python scripts/migrate.py seed
    fi
    
    log_success "Database setup completed"
}

# Start application with proper configuration
start_server() {
    log_info "Starting server..."
    
    # Determine number of workers based on environment
    if [ "${ENVIRONMENT:-development}" = "production" ]; then
        WORKERS=4
        LOG_LEVEL="warning"
    else
        WORKERS=1
        LOG_LEVEL="info"
    fi
    
    # Start uvicorn with appropriate settings
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "$PORT" \
        --workers "$WORKERS" \
        --log-level "$LOG_LEVEL" \
        --access-log \
        --loop uvloop \
        --http httptools
}

# Health check before starting
pre_start_health_check() {
    log_info "Running pre-start health check..."
    
    # Check database connection
    python -c "
from app.database import engine
from sqlalchemy import text
try:
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('Database connection: OK')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
"
    
    log_success "Pre-start health check passed"
}

# Main startup function
startup() {
    log_info "Starting Reddit Forum Backend..."
    
    initialize_app
    setup_database
    pre_start_health_check
    start_server
}

# Script usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start      - Start the application (default)"
    echo "  init       - Initialize application only"
    echo "  db-setup   - Setup database only"
    echo "  health     - Run health check only"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL - Database connection string"
    echo "  SECRET_KEY   - Application secret key"
    echo "  PORT         - Port to run the application (default: 8000)"
    echo "  ENVIRONMENT  - Environment (development/production)"
}

# Signal handlers for graceful shutdown
trap 'log_info "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
trap 'log_info "Received SIGINT, shutting down gracefully..."; exit 0' INT

# Main script execution
main() {
    local command=${1:-start}
    
    case "$command" in
        start)
            startup
            ;;
        init)
            initialize_app
            ;;
        db-setup)
            setup_database
            ;;
        health)
            pre_start_health_check
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Invalid command: $command"
            usage
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"