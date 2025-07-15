#!/bin/bash

# Pre-deployment checks script for Reddit Forum Frontend
# This script runs all necessary checks before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
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

# Check Node.js and npm versions
check_node_version() {
    log_info "Checking Node.js version..."
    
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
        log_error "Node.js version $node_version is too old. Required: $required_version or higher"
        exit 1
    fi
    
    log_success "Node.js version: $node_version"
}

# Check npm version
check_npm_version() {
    log_info "Checking npm version..."
    
    local npm_version=$(npm --version)
    local required_version="9.0.0"
    
    if [ "$(printf '%s\n' "$required_version" "$npm_version" | sort -V | head -n1)" != "$required_version" ]; then
        log_error "npm version $npm_version is too old. Required: $required_version or higher"
        exit 1
    fi
    
    log_success "npm version: $npm_version"
}

# Check environment variables
check_environment_variables() {
    log_info "Checking environment variables..."
    
    local required_vars=("VITE_API_URL" "VITE_APP_TITLE")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ] && [ ! -f "$PROJECT_ROOT/.env.local" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Missing environment variables (will use defaults):"
        for var in "${missing_vars[@]}"; do
            log_warning "  - $var"
        done
        log_info "Consider creating .env.local file with your configuration"
    else
        log_success "Environment variables configured"
    fi
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    cd "$PROJECT_ROOT"
    
    if [ ! -f "package-lock.json" ]; then
        log_warning "package-lock.json not found. Consider running 'npm install' to generate it."
    fi
    
    # Check for security vulnerabilities
    if command -v npm audit &> /dev/null; then
        log_info "Running security audit..."
        if npm audit --audit-level=high; then
            log_success "No high-severity vulnerabilities found"
        else
            log_error "Security vulnerabilities found. Run 'npm audit fix' to resolve."
            exit 1
        fi
    fi
    
    log_success "Dependencies check passed"
}

# Run type checking
check_types() {
    log_info "Running type checking..."
    
    cd "$PROJECT_ROOT"
    
    if npm run type-check; then
        log_success "Type checking passed"
    else
        log_error "Type checking failed"
        exit 1
    fi
}

# Run linting
check_linting() {
    log_info "Running linting..."
    
    cd "$PROJECT_ROOT"
    
    if npm run lint; then
        log_success "Linting passed"
    else
        log_error "Linting failed"
        exit 1
    fi
}

# Run tests
check_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    if npm run test; then
        log_success "Tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Check build
check_build() {
    log_info "Testing build process..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    rm -rf dist
    
    # Run build
    if npm run build:prod; then
        log_success "Build completed successfully"
    else
        log_error "Build failed"
        exit 1
    fi
    
    # Validate build
    if [ -f "$SCRIPT_DIR/validate-build.sh" ]; then
        bash "$SCRIPT_DIR/validate-build.sh"
    else
        log_warning "Build validation script not found"
    fi
}

# Check Git status
check_git_status() {
    log_info "Checking Git status..."
    
    cd "$PROJECT_ROOT"
    
    if ! git diff --quiet HEAD; then
        log_warning "Uncommitted changes detected:"
        git status --porcelain
        log_warning "Consider committing changes before deployment"
    else
        log_success "Working directory clean"
    fi
}

# Check for required tools
check_tools() {
    log_info "Checking required tools..."
    
    local required_tools=("git" "node" "npm")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            log_error "  - $tool"
        done
        exit 1
    fi
    
    log_success "All required tools available"
}

# Main pre-deployment check function
run_pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    check_tools
    check_node_version
    check_npm_version
    check_environment_variables
    check_dependencies
    check_git_status
    check_types
    check_linting
    check_tests
    check_build
    
    log_success "All pre-deployment checks passed!"
    log_info "Ready for deployment"
}

# Script usage
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -s, --skip-tests Skip test execution"
    echo "  -q, --quick    Skip build check"
    echo ""
    echo "This script runs comprehensive pre-deployment checks including:"
    echo "- Environment validation"
    echo "- Dependency checks"
    echo "- Type checking"
    echo "- Linting"
    echo "- Tests"
    echo "- Build validation"
}

# Main script execution
main() {
    local skip_tests=false
    local skip_build=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -s|--skip-tests)
                skip_tests=true
                shift
                ;;
            -q|--quick)
                skip_build=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log_info "Starting pre-deployment checks..."
    
    check_tools
    check_node_version
    check_npm_version
    check_environment_variables
    check_dependencies
    check_git_status
    check_types
    check_linting
    
    if [ "$skip_tests" = false ]; then
        check_tests
    else
        log_warning "Skipping tests"
    fi
    
    if [ "$skip_build" = false ]; then
        check_build
    else
        log_warning "Skipping build check"
    fi
    
    log_success "All pre-deployment checks passed!"
    log_info "Ready for deployment"
}

# Execute main function with all arguments
main "$@"