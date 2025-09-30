#!/bin/bash

# AI Website Builder - Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_warning ".env file not found. Copying from .env.example..."
            cp .env.example .env
            print_warning "Please update .env file with your actual values before deployment!"
        else
            print_error ".env file not found and no .env.example available"
            exit 1
        fi
    fi
    
    print_success "Environment setup completed"
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Generate Prisma client
    npm run db:generate
    
    # Push database schema
    npm run db:push
    
    print_success "Database setup completed"
}

# Function to run seeds
run_seeds() {
    print_status "Running database seeds..."
    
    # Run the comprehensive deployment seed
    npm run seed
    
    print_success "Database seeds completed"
}

# Function to build the application
build_application() {
    print_status "Building application..."
    
    npm run build
    
    print_success "Application built successfully"
}

# Function to start the application
start_application() {
    print_status "Starting application..."
    
    npm start
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Run linting
    npm run lint
    
    # Run any other tests if they exist
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm test
    fi
    
    print_success "Tests completed successfully"
}

# Function to show deployment info
show_deployment_info() {
    print_success "Deployment completed successfully!"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Your application is ready for production!"
    echo "2. Admin user has been created/verified"
    echo "3. AI prompts have been seeded"
    echo "4. Database is set up and ready"
    echo ""
    echo "🔐 ADMIN ACCESS:"
    echo "   Email: ${ADMIN_EMAIL:-admin@example.com}"
    echo "   Password: ${ADMIN_PASSWORD:-admin123}"
    echo ""
    echo "🌐 ACCESS URLS:"
    echo "   - Main App: /"
    echo "   - Admin Dashboard: /admin"
    echo "   - Logs Management: /admin/logs"
    echo ""
    echo "📊 MONITORING:"
    echo "   - Check logs: npm run logs"
    echo "   - View admin panel: /admin"
    echo "   - Monitor system: /admin/logs"
}

# Main deployment function
deploy() {
    local mode=${1:-"full"}
    
    print_status "Starting AI Website Builder deployment (mode: $mode)..."
    echo ""
    
    case $mode in
        "full")
            check_prerequisites
            install_dependencies
            setup_environment
            setup_database
            run_seeds
            build_application
            show_deployment_info
            ;;
        "quick")
            check_prerequisites
            install_dependencies
            setup_database
            run_seeds
            build_application
            show_deployment_info
            ;;
        "seed-only")
            check_prerequisites
            run_seeds
            ;;
        "build-only")
            check_prerequisites
            install_dependencies
            build_application
            ;;
        "start")
            start_application
            ;;
        "test")
            check_prerequisites
            install_dependencies
            run_tests
            ;;
        *)
            print_error "Unknown deployment mode: $mode"
            echo ""
            echo "Available modes:"
            echo "  full       - Complete deployment (default)"
            echo "  quick      - Quick deployment (skip env setup)"
            echo "  seed-only  - Run seeds only"
            echo "  build-only - Build application only"
            echo "  start      - Start application only"
            echo "  test       - Run tests only"
            echo ""
            echo "Usage: $0 [mode]"
            exit 1
            ;;
    esac
}

# Parse command line arguments
if [ $# -gt 0 ]; then
    deploy "$1"
else
    deploy "full"
fi
