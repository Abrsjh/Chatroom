#!/bin/bash

# Deployment script for Reddit Forum Backend
# This script handles the complete deployment process for Render

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

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

# Check environment
check_environment() {
    log_info "Checking deployment environment..."
    
    # Check Python version
    PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2)
    REQUIRED_VERSION="3.11.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Python version $PYTHON_VERSION is too old. Required: $REQUIRED_VERSION or higher."
        exit 1
    fi
    
    # Check if required environment variables are set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    if [ -z "$SECRET_KEY" ]; then
        log_error "SECRET_KEY environment variable is not set"
        exit 1
    fi
    
    log_success "Environment check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Upgrade pip
    python -m pip install --upgrade pip
    
    # Install dependencies
    pip install -r requirements.txt
    
    log_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Run migrations
    python scripts/migrate.py migrate
    
    log_success "Database migrations completed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run pytest
    python -m pytest tests/ -v
    
    log_success "Tests passed"
}

# Start the application
start_application() {
    log_info "Starting application..."
    
    cd "$PROJECT_ROOT"
    
    # Start with uvicorn
    uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 4
}

# Health check
health_check() {
    log_info "Running health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:${PORT:-8000}/health > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Main deployment function
deploy() {
    log_info "Starting deployment..."
    
    check_environment
    install_dependencies
    run_migrations
    
    # Only run tests if not in production
    if [ "${ENVIRONMENT:-development}" != "production" ]; then
        run_tests
    fi
    
    log_success "Deployment completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy     - Run full deployment process"
    echo "  start      - Start the application"
    echo "  migrate    - Run database migrations"
    echo "  test       - Run tests"
    echo "  health     - Run health check"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL - Database connection string"
    echo "  SECRET_KEY   - Application secret key"
    echo "  PORT         - Port to run the application (default: 8000)"
    echo "  ENVIRONMENT  - Environment (development/production)"
}

# Main script execution
main() {
    local command=${1:-deploy}
    
    case "$command" in
        deploy)
            deploy
            ;;
        start)
            start_application
            ;;
        migrate)
            run_migrations
            ;;
        test)
            run_tests
            ;;
        health)
            health_check
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