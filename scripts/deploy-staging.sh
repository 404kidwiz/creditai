#!/bin/bash

# Staging Environment Deployment Script
# Deploys to staging environment with production-like configuration

set -e

echo "🚀 Deploying CreditAI to Staging Environment..."

# Configuration
ENV="staging"
DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE="environments/staging/.env.template"
STAGING_HOST="${STAGING_HOST:-staging.creditai.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if we're in CI or local deployment
    if [ "$CI" = "true" ]; then
        print_status "Running in CI environment"
    else
        print_status "Running local deployment to staging"
        
        if ! command -v ssh &> /dev/null; then
            print_error "SSH is not available. Required for staging deployment."
            exit 1
        fi
        
        if [ -z "$STAGING_SSH_KEY" ]; then
            print_warning "STAGING_SSH_KEY not set. Using default SSH key."
        fi
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed."
        exit 1
    fi
    
    print_status "Prerequisites check passed ✅"
}

# Setup environment
setup_environment() {
    print_status "Setting up staging environment configuration..."
    
    # In CI, environment variables should be set via secrets
    if [ "$CI" = "true" ]; then
        print_status "Using CI environment variables"
        
        # Create .env.staging from CI variables
        cat > .env.staging << EOF
NODE_ENV=staging
NEXT_PUBLIC_APP_NAME=CreditAI Staging
NEXT_PUBLIC_APP_URL=https://${STAGING_HOST}
NEXT_PUBLIC_API_URL=https://${STAGING_HOST}/api
DATABASE_URL=${STAGING_DATABASE_URL}
NEXT_PUBLIC_SUPABASE_URL=${STAGING_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${STAGING_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${STAGING_SUPABASE_SERVICE_ROLE_KEY}
NEXTAUTH_SECRET=${STAGING_NEXTAUTH_SECRET}
NEXTAUTH_URL=https://${STAGING_HOST}
REDIS_URL=${STAGING_REDIS_URL}
GOOGLE_CLOUD_PROJECT_ID=${STAGING_GOOGLE_CLOUD_PROJECT_ID}
GOOGLE_AI_API_KEY=${STAGING_GOOGLE_AI_API_KEY}
STRIPE_PUBLISHABLE_KEY=${STAGING_STRIPE_PUBLISHABLE_KEY}
STRIPE_SECRET_KEY=${STAGING_STRIPE_SECRET_KEY}
SENTRY_DSN=${STAGING_SENTRY_DSN}
EOF
    else
        # Local deployment - use template
        if [ ! -f ".env.staging" ]; then
            if [ -f "$ENV_FILE" ]; then
                cp "$ENV_FILE" ".env.staging"
                print_warning "Created .env.staging from template. Please update with staging values."
            else
                print_error "Staging environment template not found: $ENV_FILE"
                exit 1
            fi
        fi
    fi
    
    print_status "Environment configuration ready ✅"
}

# Build application
build_application() {
    print_status "Building application for staging..."
    
    # Build Docker image
    docker build \
        --target runner \
        --build-arg NODE_ENV=staging \
        -t creditai:staging \
        .
    
    print_status "Application built successfully ✅"
}

# Run tests
run_tests() {
    print_status "Running tests before staging deployment..."
    
    # Run unit tests
    npm run test:unit
    
    # Run integration tests with staging config
    TEST_ENV=staging npm run test:integration
    
    # Run security tests
    if command -v npm-audit &> /dev/null; then
        npm audit --audit-level moderate
    fi
    
    print_status "All tests passed ✅"
}

# Deploy to staging server
deploy_to_staging() {
    print_status "Deploying to staging server..."
    
    if [ "$CI" = "true" ]; then
        deploy_via_ci
    else
        deploy_via_ssh
    fi
}

# Deploy via CI (using Kubernetes or Docker)
deploy_via_ci() {
    print_status "Deploying via CI pipeline..."
    
    # Push image to registry
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker tag creditai:staging "$DOCKER_REGISTRY/creditai:staging-$GITHUB_SHA"
        docker push "$DOCKER_REGISTRY/creditai:staging-$GITHUB_SHA"
    fi
    
    # Deploy using kubectl if available
    if command -v kubectl &> /dev/null && [ -n "$KUBE_CONFIG_STAGING" ]; then
        echo "$KUBE_CONFIG_STAGING" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Apply staging configuration
        kubectl apply -f k8s/staging/
        
        # Update deployment with new image
        kubectl set image deployment/creditai-staging \
            creditai="$DOCKER_REGISTRY/creditai:staging-$GITHUB_SHA"
        
        # Wait for rollout
        kubectl rollout status deployment/creditai-staging
        
        print_status "Kubernetes deployment completed ✅"
    else
        print_warning "Kubernetes not configured, using Docker Compose"
        deploy_docker_compose_staging
    fi
}

# Deploy via SSH to staging server
deploy_via_ssh() {
    print_status "Deploying via SSH to staging server..."
    
    local ssh_opts="-o StrictHostKeyChecking=no"
    
    if [ -n "$STAGING_SSH_KEY" ]; then
        ssh_opts="$ssh_opts -i $STAGING_SSH_KEY"
    fi
    
    # Copy files to staging server
    rsync -avz --delete \
        --exclude node_modules \
        --exclude .git \
        --exclude .next \
        ./ "$DEPLOY_USER@$STAGING_HOST:/opt/creditai/"
    
    # Execute deployment on staging server
    ssh $ssh_opts "$DEPLOY_USER@$STAGING_HOST" << 'EOF'
        cd /opt/creditai
        
        # Build and deploy
        docker-compose -f docker-compose.staging.yml build
        docker-compose -f docker-compose.staging.yml up -d
        
        # Wait for services to be ready
        sleep 30
        
        # Health check
        if curl -f http://localhost:3000/api/health; then
            echo "Staging deployment successful"
        else
            echo "Staging deployment health check failed"
            exit 1
        fi
EOF
    
    print_status "SSH deployment completed ✅"
}

# Deploy using Docker Compose for staging
deploy_docker_compose_staging() {
    print_status "Deploying using Docker Compose for staging..."
    
    # Start staging services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down || true
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    print_status "Docker Compose staging deployment completed ✅"
}

# Run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    local max_retries=10
    local retry_count=0
    local health_url="https://${STAGING_HOST}/api/health"
    
    if [ "$CI" != "true" ]; then
        health_url="http://localhost:3000/api/health"
    fi
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f "$health_url" &> /dev/null; then
            print_status "Health check passed ✅"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        print_debug "Health check attempt $retry_count/$max_retries failed, retrying..."
        sleep 10
    done
    
    print_error "Health checks failed after $max_retries attempts"
    return 1
}

# Run smoke tests
run_smoke_tests() {
    print_status "Running smoke tests..."
    
    local base_url="https://${STAGING_HOST}"
    if [ "$CI" != "true" ]; then
        base_url="http://localhost:3000"
    fi
    
    # Test main endpoints
    curl -f "$base_url/api/health" || { print_error "Health endpoint failed"; return 1; }
    curl -f "$base_url/" || { print_error "Main page failed"; return 1; }
    
    # Test API endpoints
    curl -f "$base_url/api/system/health" || { print_error "System health endpoint failed"; return 1; }
    
    print_status "Smoke tests passed ✅"
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up staging monitoring..."
    
    # Start monitoring services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d prometheus-staging grafana-staging
    
    print_status "Monitoring services started ✅"
    
    if [ "$CI" != "true" ]; then
        print_status "Monitoring URLs:"
        echo "  Grafana: http://localhost:3002"
        echo "  Prometheus: http://localhost:9091"
    fi
}

# Database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if command -v supabase &> /dev/null; then
        # Run migrations using Supabase CLI
        SUPABASE_URL="${STAGING_SUPABASE_URL}" \
        SUPABASE_SERVICE_ROLE_KEY="${STAGING_SUPABASE_SERVICE_ROLE_KEY}" \
        supabase db push
        
        print_status "Database migrations completed ✅"
    else
        print_warning "Supabase CLI not found. Skipping migrations."
    fi
}

# Notification
send_notification() {
    local status=$1
    local message="Staging deployment $status for commit $GITHUB_SHA"
    
    if [ -n "$SLACK_WEBHOOK_STAGING" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_STAGING"
    fi
    
    print_status "Notification sent: $message"
}

# Rollback function
rollback() {
    print_error "Deployment failed. Rolling back..."
    
    if [ "$CI" = "true" ] && command -v kubectl &> /dev/null; then
        kubectl rollout undo deployment/creditai-staging
        kubectl rollout status deployment/creditai-staging
    else
        # Stop current deployment
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        
        # Start previous version (if available)
        if docker images | grep -q "creditai:staging-previous"; then
            docker tag creditai:staging-previous creditai:staging
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
        fi
    fi
    
    send_notification "rolled back"
    exit 1
}

# Main deployment flow
main() {
    print_status "Starting staging deployment..."
    
    # Set error trap for rollback
    trap rollback ERR
    
    check_prerequisites
    setup_environment
    build_application
    run_tests
    run_migrations
    deploy_to_staging
    setup_monitoring
    run_health_checks
    run_smoke_tests
    
    send_notification "completed successfully"
    
    print_status "Staging deployment completed successfully! 🎉"
    
    if [ "$CI" != "true" ]; then
        print_status "Staging URL: https://${STAGING_HOST}"
    fi
}

# Run main function
main "$@"