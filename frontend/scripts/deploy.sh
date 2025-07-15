#!/bin/bash

# Deployment script for Reddit Forum Frontend
# This script handles the complete deployment process for Vercel

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
BUILD_DIR="${PROJECT_ROOT}/dist"
COVERAGE_DIR="${PROJECT_ROOT}/coverage"

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

# Check if we're in the correct directory
check_environment() {
    log_info "Checking environment..."
    
    if [ ! -f "${PROJECT_ROOT}/package.json" ]; then
        log_error "package.json not found. Please run this script from the frontend directory."
        exit 1
    fi
    
    if [ ! -f "${PROJECT_ROOT}/vite.config.ts" ]; then
        log_error "vite.config.ts not found. This doesn't appear to be a Vite project."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_NODE_VERSION or higher."
        exit 1
    fi
    
    log_success "Environment check passed"
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    
    rm -rf "${BUILD_DIR}" "${COVERAGE_DIR}"
    
    log_success "Build directory cleaned"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "${PROJECT_ROOT}"
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "${PROJECT_ROOT}"
    
    # Run type checking
    npm run type-check
    
    # Run linting
    npm run lint
    
    # Run tests with coverage
    npm run test:coverage
    
    log_success "All tests passed"
}

# Build the application
build_app() {
    local mode=${1:-production}
    
    log_info "Building application for $mode..."
    
    cd "${PROJECT_ROOT}"
    
    if [ "$mode" = "development" ]; then
        npm run build:dev
    elif [ "$mode" = "analyze" ]; then
        npm run build:analyze
    else
        npm run build:prod
    fi
    
    log_success "Application built successfully"
}

# Validate build
validate_build() {
    log_info "Validating build..."
    
    if [ ! -d "${BUILD_DIR}" ]; then
        log_error "Build directory not found"
        exit 1
    fi
    
    if [ ! -f "${BUILD_DIR}/index.html" ]; then
        log_error "index.html not found in build directory"
        exit 1
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh "${BUILD_DIR}" | cut -f1)
    log_info "Build size: $BUILD_SIZE"
    
    # Check for critical files
    CRITICAL_FILES=("index.html" "assets")
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -e "${BUILD_DIR}/$file" ]; then
            log_error "Critical file/directory missing: $file"
            exit 1
        fi
    done
    
    log_success "Build validation passed"
}

# Deploy to Vercel
deploy_vercel() {
    local environment=${1:-production}
    
    log_info "Deploying to Vercel ($environment)..."
    
    cd "${PROJECT_ROOT}"
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy
    if [ "$environment" = "preview" ]; then
        vercel --confirm
    else
        vercel --prod --confirm
    fi
    
    log_success "Deployment completed"
}

# Main deployment function
deploy() {
    local mode=${1:-production}
    local environment=${2:-production}
    
    log_info "Starting deployment process..."
    log_info "Mode: $mode"
    log_info "Environment: $environment"
    
    check_environment
    clean_build
    install_dependencies
    run_tests
    build_app "$mode"
    validate_build
    deploy_vercel "$environment"
    
    log_success "Deployment completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [mode] [environment]"
    echo ""
    echo "Modes:"
    echo "  production (default) - Build for production"
    echo "  development          - Build for development"
    echo "  analyze             - Build with bundle analysis"
    echo ""
    echo "Environments:"
    echo "  production (default) - Deploy to production"
    echo "  preview             - Deploy to preview"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy production build to production"
    echo "  $0 production preview       # Deploy production build to preview"
    echo "  $0 development preview      # Deploy development build to preview"
    echo "  $0 analyze production       # Deploy with bundle analysis to production"
}

# Main script execution
main() {
    local mode=${1:-production}
    local environment=${2:-production}
    
    case "$mode" in
        production|development|analyze)
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Invalid mode: $mode"
            usage
            exit 1
            ;;
    esac
    
    case "$environment" in
        production|preview)
            ;;
        *)
            log_error "Invalid environment: $environment"
            usage
            exit 1
            ;;
    esac
    
    deploy "$mode" "$environment"
}

# Execute main function with all arguments
main "$@"