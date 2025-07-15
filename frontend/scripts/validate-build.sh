#!/bin/bash

# Build validation script for Reddit Forum Frontend
# This script performs comprehensive validation of the build output

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
BUILD_DIR="${PROJECT_ROOT}/dist"
MAX_CHUNK_SIZE=1000000  # 1MB in bytes
MAX_TOTAL_SIZE=5000000  # 5MB in bytes

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

# Check if build directory exists
check_build_exists() {
    log_info "Checking build directory..."
    
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build directory not found: $BUILD_DIR"
        log_error "Please run 'npm run build' first"
        exit 1
    fi
    
    log_success "Build directory found"
}

# Validate critical files
validate_critical_files() {
    log_info "Validating critical files..."
    
    local critical_files=("index.html")
    local missing_files=()
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "$BUILD_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing critical files:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        exit 1
    fi
    
    # Check if assets directory exists
    if [ ! -d "$BUILD_DIR/assets" ]; then
        log_error "Assets directory not found"
        exit 1
    fi
    
    log_success "All critical files present"
}

# Check HTML structure
validate_html() {
    log_info "Validating HTML structure..."
    
    local html_file="$BUILD_DIR/index.html"
    
    # Check for required HTML elements
    if ! grep -q "<title>" "$html_file"; then
        log_error "Missing <title> tag in index.html"
        exit 1
    fi
    
    if ! grep -q "<meta.*viewport" "$html_file"; then
        log_error "Missing viewport meta tag in index.html"
        exit 1
    fi
    
    if ! grep -q "<div.*id=\"root\"" "$html_file"; then
        log_error "Missing root div in index.html"
        exit 1
    fi
    
    log_success "HTML structure is valid"
}

# Check file sizes
validate_file_sizes() {
    log_info "Validating file sizes..."
    
    local total_size=0
    local oversized_files=()
    
    while IFS= read -r -d '' file; do
        local file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
        total_size=$((total_size + file_size))
        
        # Check individual file size
        if [ "$file_size" -gt "$MAX_CHUNK_SIZE" ]; then
            local readable_size=$(numfmt --to=iec "$file_size")
            oversized_files+=("$(basename "$file"): $readable_size")
        fi
    done < <(find "$BUILD_DIR" -type f -print0)
    
    # Report oversized files
    if [ ${#oversized_files[@]} -gt 0 ]; then
        log_warning "Large files detected (>$(numfmt --to=iec $MAX_CHUNK_SIZE)):"
        for file in "${oversized_files[@]}"; do
            log_warning "  - $file"
        done
    fi
    
    # Check total size
    if [ "$total_size" -gt "$MAX_TOTAL_SIZE" ]; then
        local readable_total=$(numfmt --to=iec "$total_size")
        local readable_max=$(numfmt --to=iec "$MAX_TOTAL_SIZE")
        log_error "Total build size ($readable_total) exceeds limit ($readable_max)"
        exit 1
    fi
    
    local readable_total=$(numfmt --to=iec "$total_size")
    log_success "Build size validation passed: $readable_total"
}

# Check JavaScript files
validate_javascript() {
    log_info "Validating JavaScript files..."
    
    local js_files=()
    while IFS= read -r -d '' file; do
        js_files+=("$file")
    done < <(find "$BUILD_DIR" -name "*.js" -print0)
    
    if [ ${#js_files[@]} -eq 0 ]; then
        log_error "No JavaScript files found in build"
        exit 1
    fi
    
    # Check for common build artifacts
    local main_js_found=false
    for file in "${js_files[@]}"; do
        if [[ "$(basename "$file")" == index-*.js ]]; then
            main_js_found=true
            break
        fi
    done
    
    if [ "$main_js_found" = false ]; then
        log_warning "Main JavaScript file not found (expected index-*.js)"
    fi
    
    log_success "JavaScript files validation passed"
}

# Check CSS files
validate_css() {
    log_info "Validating CSS files..."
    
    local css_files=()
    while IFS= read -r -d '' file; do
        css_files+=("$file")
    done < <(find "$BUILD_DIR" -name "*.css" -print0)
    
    if [ ${#css_files[@]} -eq 0 ]; then
        log_warning "No CSS files found in build"
    else
        log_success "CSS files validation passed"
    fi
}

# Check for source maps
validate_sourcemaps() {
    log_info "Checking for source maps..."
    
    local sourcemap_files=()
    while IFS= read -r -d '' file; do
        sourcemap_files+=("$file")
    done < <(find "$BUILD_DIR" -name "*.map" -print0)
    
    if [ ${#sourcemap_files[@]} -eq 0 ]; then
        log_info "No source maps found (expected for production builds)"
    else
        log_warning "Source maps found in build (${#sourcemap_files[@]} files)"
        log_warning "Consider removing source maps for production"
    fi
}

# Generate build report
generate_report() {
    log_info "Generating build report..."
    
    local report_file="$BUILD_DIR/build-report.txt"
    
    {
        echo "Build Report - $(date)"
        echo "=============================="
        echo ""
        echo "Build Directory: $BUILD_DIR"
        echo "Build Size: $(du -sh "$BUILD_DIR" | cut -f1)"
        echo ""
        echo "File Breakdown:"
        echo "---------------"
        find "$BUILD_DIR" -type f -exec ls -lh {} \; | awk '{print $5 "\t" $9}' | sort -hr
        echo ""
        echo "Asset Summary:"
        echo "-------------"
        echo "JavaScript files: $(find "$BUILD_DIR" -name "*.js" | wc -l)"
        echo "CSS files: $(find "$BUILD_DIR" -name "*.css" | wc -l)"
        echo "Image files: $(find "$BUILD_DIR" -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" -o -name "*.webp" | wc -l)"
        echo "Font files: $(find "$BUILD_DIR" -name "*.woff*" -o -name "*.ttf" -o -name "*.otf" -o -name "*.eot" | wc -l)"
        echo "Source maps: $(find "$BUILD_DIR" -name "*.map" | wc -l)"
        echo ""
        echo "Validation: PASSED"
    } > "$report_file"
    
    log_success "Build report generated: $report_file"
}

# Main validation function
validate_build() {
    log_info "Starting build validation..."
    
    check_build_exists
    validate_critical_files
    validate_html
    validate_file_sizes
    validate_javascript
    validate_css
    validate_sourcemaps
    generate_report
    
    log_success "Build validation completed successfully!"
}

# Script usage
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  -v, --verbose Enable verbose output"
    echo ""
    echo "This script validates the build output in the dist/ directory."
    echo "Run 'npm run build' before running this script."
}

# Main script execution
main() {
    case "${1:-}" in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--verbose)
            set -x
            validate_build
            ;;
        "")
            validate_build
            ;;
        *)
            log_error "Invalid option: $1"
            usage
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"