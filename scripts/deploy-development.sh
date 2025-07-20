#!/bin/bash

# Development Environment Deployment Script
# Sets up local development environment with Docker

set -e

echo "🚀 Deploying CreditAI Development Environment..."

# Configuration
ENV="development"
DOCKER_COMPOSE_FILE="docker-compose.development.yml"
ENV_FILE="environments/development/.env.template"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    print_status "Prerequisites check passed ✅"
}

# Create environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f "$ENV_FILE" ]; then
            cp "$ENV_FILE" ".env.local"
            print_warning "Created .env.local from template. Please update with your actual values."
        else
            print_error "Environment template not found: $ENV_FILE"
            exit 1
        fi
    else
        print_status "Environment file .env.local already exists"
    fi
    
    # Create additional environment files if needed
    if [ ! -f ".env.development" ]; then
        cp "$ENV_FILE" ".env.development"
        print_status "Created .env.development"
    fi
}

# Setup directories
setup_directories() {
    print_status "Setting up directories..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p uploads
    mkdir -p temp
    mkdir -p credentials
    mkdir -p monitoring/data
    
    # Set proper permissions
    chmod 755 logs uploads temp
    chmod 700 credentials
    
    print_status "Directories created ✅"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_status "Dependencies installed ✅"
}

# Setup database
setup_database() {
    print_status "Setting up development database..."
    
    # Start database container if not running
    if ! docker ps | grep -q "creditai-postgres-dev"; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres-dev
        
        # Wait for database to be ready
        print_status "Waiting for database to be ready..."
        sleep 15
        
        # Run migrations
        if command -v supabase &> /dev/null; then
            print_status "Running database migrations..."
            supabase db push --local
        else
            print_warning "Supabase CLI not found. Please run migrations manually."
        fi
    else
        print_status "Database already running"
    fi
}

# Setup Redis
setup_redis() {
    print_status "Setting up Redis cache..."
    
    if ! docker ps | grep -q "creditai-redis-dev"; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d redis-dev
        print_status "Redis started ✅"
    else
        print_status "Redis already running"
    fi
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up development monitoring..."
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d prometheus-dev grafana-dev
    
    print_status "Monitoring services started ✅"
    print_status "Grafana: http://localhost:3001 (admin/development)"
    print_status "Prometheus: http://localhost:9090"
}

# Build and start application
start_application() {
    print_status "Building and starting application..."
    
    # Build the development image
    docker-compose -f "$DOCKER_COMPOSE_FILE" build app-dev
    
    # Start all services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for application to be ready
    print_status "Waiting for application to start..."
    sleep 20
    
    # Health check
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_status "Application is healthy ✅"
        print_status "Application URL: http://localhost:3000"
    else
        print_warning "Application health check failed. Check logs with: docker-compose -f $DOCKER_COMPOSE_FILE logs app-dev"
    fi
}

# Setup development tools
setup_dev_tools() {
    print_status "Setting up development tools..."
    
    # Start mailcatcher for email testing
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d mailcatcher
    
    print_status "Development tools started ✅"
    print_status "MailCatcher: http://localhost:1080"
}

# Show status
show_status() {
    print_status "Development environment status:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    print_status "Service URLs:"
    echo "  Application: http://localhost:3000"
    echo "  Grafana: http://localhost:3001 (admin/development)"
    echo "  Prometheus: http://localhost:9090"
    echo "  MailCatcher: http://localhost:1080"
    echo ""
    
    print_status "Useful commands:"
    echo "  View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  Restart app: docker-compose -f $DOCKER_COMPOSE_FILE restart app-dev"
    echo "  Shell access: docker-compose -f $DOCKER_COMPOSE_FILE exec app-dev sh"
}

# Cleanup function
cleanup() {
    if [ "$1" = "clean" ]; then
        print_status "Cleaning up development environment..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v
        docker system prune -f
        print_status "Cleanup completed ✅"
        exit 0
    fi
}

# Main deployment flow
main() {
    # Handle cleanup flag
    if [ "$1" = "clean" ]; then
        cleanup clean
    fi
    
    print_status "Starting development environment deployment..."
    
    check_prerequisites
    setup_environment
    setup_directories
    install_dependencies
    setup_database
    setup_redis
    setup_monitoring
    setup_dev_tools
    start_application
    show_status
    
    print_status "Development environment deployed successfully! 🎉"
}

# Error handling
trap 'print_error "Deployment failed! Check the logs above."' ERR

# Run main function with all arguments
main "$@"