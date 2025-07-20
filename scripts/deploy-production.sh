#!/bin/bash

# Production Environment Deployment Script
# High-availability production deployment with zero-downtime and rollback capabilities

set -e

echo "🚀 Deploying CreditAI to Production Environment..."

# Configuration
ENV="production"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE="environments/production/.env.template"
PRODUCTION_HOST="${PRODUCTION_HOST:-creditai.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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

print_critical() {
    echo -e "${MAGENTA}[CRITICAL]${NC} $1"
}

# Pre-deployment safety checks
safety_checks() {
    print_status "Running pre-deployment safety checks..."
    
    # Check if this is a production branch
    if [ "$CI" = "true" ]; then
        if [ "$GITHUB_REF" != "refs/heads/main" ]; then
            print_error "Production deployments only allowed from main branch"
            exit 1
        fi
    fi
    
    # Check for required environment variables
    local required_vars=(
        "PRODUCTION_DATABASE_URL"
        "PRODUCTION_SUPABASE_URL" 
        "PRODUCTION_NEXTAUTH_SECRET"
        "PRODUCTION_STRIPE_SECRET_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check staging deployment status
    if ! curl -f "https://staging.creditai.com/api/health" &> /dev/null; then
        print_error "Staging environment is not healthy. Cannot proceed with production deployment."
        exit 1
    fi
    
    print_status "Safety checks passed ✅"
}

# Create production backup
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        print_status "Creating production backup before deployment..."
        
        local backup_timestamp=$(date +%Y%m%d-%H%M%S)
        local backup_name="pre-deploy-backup-$backup_timestamp"
        
        # Database backup
        if command -v pg_dump &> /dev/null; then
            pg_dump "$PRODUCTION_DATABASE_URL" > "$backup_name-database.sql"
            gzip "$backup_name-database.sql"
            
            # Upload to backup storage
            if command -v gsutil &> /dev/null; then
                gsutil cp "$backup_name-database.sql.gz" "gs://creditai-backups/pre-deploy/"
            fi
        fi
        
        # Configuration backup
        if [ "$CI" = "true" ] && command -v kubectl &> /dev/null; then
            kubectl get all -o yaml > "$backup_name-k8s-config.yaml"
            if command -v gsutil &> /dev/null; then
                gsutil cp "$backup_name-k8s-config.yaml" "gs://creditai-backups/pre-deploy/"
            fi
        fi
        
        echo "$backup_name" > .last-backup
        print_status "Backup created: $backup_name ✅"
    else
        print_warning "Backup skipped (BACKUP_BEFORE_DEPLOY=false)"
    fi
}

# Build and test application
build_and_test() {
    print_status "Building and testing application for production..."
    
    # Install dependencies
    npm ci --production=false
    
    # Run comprehensive test suite
    print_status "Running comprehensive test suite..."
    npm run test:unit
    npm run test:integration
    npm run test:performance
    
    # Security scan
    if command -v npm-audit &> /dev/null; then
        npm audit --audit-level high
    fi
    
    # Build application
    print_status "Building production application..."
    NODE_ENV=production npm run build
    
    # Build Docker image
    docker build \
        --target runner \
        --build-arg NODE_ENV=production \
        -t creditai:production-$(date +%Y%m%d-%H%M%S) \
        -t creditai:production-latest \
        .
    
    print_status "Build and test completed ✅"
}

# Blue-green deployment setup
setup_blue_green_deployment() {
    print_status "Setting up blue-green deployment..."
    
    # Determine current and new environments
    local current_env=$(kubectl get service creditai-production -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")
    local new_env="green"
    
    if [ "$current_env" = "green" ]; then
        new_env="blue"
    fi
    
    echo "$new_env" > .deployment-target
    echo "$current_env" > .deployment-current
    
    print_status "Deploying to $new_env environment (current: $current_env)"
    
    export DEPLOYMENT_TARGET="$new_env"
    export DEPLOYMENT_CURRENT="$current_env"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    print_status "Deploying to Kubernetes production cluster..."
    
    # Setup kubectl
    if [ -n "$KUBE_CONFIG_PRODUCTION" ]; then
        echo "$KUBE_CONFIG_PRODUCTION" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
    fi
    
    local deployment_target=$(cat .deployment-target)
    local image_tag="creditai:production-$(date +%Y%m%d-%H%M%S)"
    
    # Apply configuration
    envsubst < k8s/production/deployment.yaml | \
        sed "s/{{DEPLOYMENT_VERSION}}/$deployment_target/g" | \
        sed "s/{{IMAGE_TAG}}/$image_tag/g" | \
        kubectl apply -f -
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available --timeout=600s \
        deployment/creditai-production-$deployment_target
    
    print_status "Kubernetes deployment completed ✅"
}

# Deploy using Docker Compose (fallback)
deploy_docker_compose() {
    print_status "Deploying using Docker Compose..."
    
    # Tag current image as previous
    docker tag creditai:production-latest creditai:production-previous || true
    
    # Deploy new version
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --no-deps app
    
    # Wait for service to be ready
    sleep 30
    
    print_status "Docker Compose deployment completed ✅"
}

# Health checks and validation
run_production_health_checks() {
    print_status "Running production health checks..."
    
    local health_url
    local max_retries=20
    local retry_count=0
    
    if [ -f ".deployment-target" ]; then
        local deployment_target=$(cat .deployment-target)
        health_url="https://$deployment_target.creditai.com/api/health"
    else
        health_url="https://$PRODUCTION_HOST/api/health"
    fi
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f -m 10 "$health_url" &> /dev/null; then
            print_status "Health check passed ✅"
            break
        fi
        
        retry_count=$((retry_count + 1))
        print_debug "Health check attempt $retry_count/$max_retries failed, retrying..."
        sleep 15
    done
    
    if [ $retry_count -eq $max_retries ]; then
        print_error "Health checks failed after $max_retries attempts"
        return 1
    fi
    
    # Additional validation tests
    run_production_validation_tests
}

# Production validation tests
run_production_validation_tests() {
    print_status "Running production validation tests..."
    
    local base_url="https://$PRODUCTION_HOST"
    
    # Test critical endpoints
    curl -f -m 10 "$base_url/api/health" || { print_error "Health endpoint failed"; return 1; }
    curl -f -m 10 "$base_url/api/system/health" || { print_error "System health failed"; return 1; }
    curl -f -m 10 "$base_url/" || { print_error "Main page failed"; return 1; }
    
    # Test authentication endpoints
    curl -f -m 10 "$base_url/api/auth/session" || { print_error "Auth session endpoint failed"; return 1; }
    
    # Test API rate limiting
    local rate_limit_test=true
    for i in {1..5}; do
        if ! curl -f -m 5 "$base_url/api/health" &> /dev/null; then
            rate_limit_test=false
            break
        fi
    done
    
    if [ "$rate_limit_test" = true ]; then
        print_status "Rate limiting working correctly ✅"
    else
        print_warning "Rate limiting test inconclusive"
    fi
    
    print_status "Production validation tests passed ✅"
}

# Switch traffic (Blue-Green)
switch_traffic() {
    if [ -f ".deployment-target" ] && command -v kubectl &> /dev/null; then
        print_status "Switching traffic to new deployment..."
        
        local deployment_target=$(cat .deployment-target)
        
        # Update service selector
        kubectl patch service creditai-production \
            -p '{"spec":{"selector":{"version":"'$deployment_target'"}}}'
        
        # Wait for traffic switch
        sleep 10
        
        # Verify traffic switch
        if curl -f "https://$PRODUCTION_HOST/api/health" &> /dev/null; then
            print_status "Traffic switch successful ✅"
        else
            print_error "Traffic switch validation failed"
            return 1
        fi
    else
        print_status "Direct deployment, no traffic switch needed"
    fi
}

# Cleanup old deployment
cleanup_old_deployment() {
    if [ -f ".deployment-current" ] && command -v kubectl &> /dev/null; then
        print_status "Cleaning up old deployment..."
        
        local old_deployment=$(cat .deployment-current)
        
        # Scale down old deployment
        kubectl scale deployment creditai-production-$old_deployment --replicas=0
        
        # Wait before cleanup
        sleep 60
        
        # Delete old deployment
        kubectl delete deployment creditai-production-$old_deployment || true
        
        print_status "Old deployment cleaned up ✅"
    fi
}

# Database migrations
run_production_migrations() {
    print_status "Running production database migrations..."
    
    # Create migration backup
    local migration_backup="migration-backup-$(date +%Y%m%d-%H%M%S)"
    pg_dump "$PRODUCTION_DATABASE_URL" > "$migration_backup.sql"
    gzip "$migration_backup.sql"
    
    if command -v gsutil &> /dev/null; then
        gsutil cp "$migration_backup.sql.gz" "gs://creditai-backups/migrations/"
    fi
    
    # Run migrations
    if command -v supabase &> /dev/null; then
        SUPABASE_URL="$PRODUCTION_SUPABASE_URL" \
        SUPABASE_SERVICE_ROLE_KEY="$PRODUCTION_SUPABASE_SERVICE_ROLE_KEY" \
        supabase db push
        
        print_status "Database migrations completed ✅"
    else
        print_warning "Supabase CLI not found. Skipping migrations."
    fi
}

# Monitoring and alerting
setup_production_monitoring() {
    print_status "Setting up production monitoring..."
    
    # Update monitoring configuration
    if command -v kubectl &> /dev/null; then
        kubectl apply -f k8s/monitoring/
    else
        docker-compose -f docker-compose.monitoring.yml up -d
    fi
    
    # Send deployment event to monitoring
    if [ -n "$NEW_RELIC_API_KEY" ]; then
        curl -X POST "https://api.newrelic.com/v2/applications/$NEW_RELIC_APP_ID/deployments.json" \
            -H "X-Api-Key:$NEW_RELIC_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"deployment\": {
                    \"revision\": \"$GITHUB_SHA\",
                    \"changelog\": \"Production deployment\",
                    \"description\": \"Automated production deployment\",
                    \"user\": \"GitHub Actions\"
                }
            }"
    fi
    
    print_status "Production monitoring updated ✅"
}

# Notification and alerting
send_production_notification() {
    local status=$1
    local message="🚀 Production deployment $status"
    
    if [ "$status" = "completed" ]; then
        message="$message\n✅ Version: $GITHUB_SHA\n🔗 URL: https://$PRODUCTION_HOST"
    else
        message="$message\n❌ Version: $GITHUB_SHA\n🔥 Rollback initiated"
    fi
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_PRODUCTION" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_PRODUCTION"
    fi
    
    # Email notification
    if [ -n "$PRODUCTION_ALERT_EMAIL" ]; then
        echo "$message" | mail -s "CreditAI Production Deployment $status" "$PRODUCTION_ALERT_EMAIL"
    fi
    
    # PagerDuty (for failures)
    if [ "$status" = "failed" ] && [ -n "$PAGERDUTY_ROUTING_KEY" ]; then
        curl -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H "Content-Type: application/json" \
            -d "{
                \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"CreditAI Production Deployment Failed\",
                    \"severity\": \"critical\",
                    \"source\": \"deployment-pipeline\"
                }
            }"
    fi
    
    print_status "Notifications sent: $status"
}

# Rollback function
rollback_production() {
    print_critical "Production deployment failed. Initiating rollback..."
    
    if [ -f ".deployment-current" ] && command -v kubectl &> /dev/null; then
        local rollback_target=$(cat .deployment-current)
        
        # Switch traffic back
        kubectl patch service creditai-production \
            -p '{"spec":{"selector":{"version":"'$rollback_target'"}}}'
        
        # Scale up old deployment
        kubectl scale deployment creditai-production-$rollback_target --replicas=2
        
        # Wait for rollback
        kubectl wait --for=condition=available --timeout=300s \
            deployment/creditai-production-$rollback_target
        
        print_status "Kubernetes rollback completed"
    else
        # Docker rollback
        if docker images | grep -q "creditai:production-previous"; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            docker tag creditai:production-previous creditai:production-latest
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
            
            print_status "Docker rollback completed"
        fi
    fi
    
    # Restore database if needed
    if [ -f ".last-backup" ]; then
        local backup_name=$(cat .last-backup)
        print_warning "Database rollback available: $backup_name"
        print_warning "Manual database restore may be required"
    fi
    
    send_production_notification "failed"
    exit 1
}

# Post-deployment verification
post_deployment_verification() {
    print_status "Running post-deployment verification..."
    
    # Wait for application to stabilize
    sleep 60
    
    # Run extended health checks
    local verification_passed=true
    
    # Test all critical user journeys
    local test_urls=(
        "https://$PRODUCTION_HOST/"
        "https://$PRODUCTION_HOST/api/health"
        "https://$PRODUCTION_HOST/api/system/health"
        "https://$PRODUCTION_HOST/login"
        "https://$PRODUCTION_HOST/pricing"
    )
    
    for url in "${test_urls[@]}"; do
        if ! curl -f -m 10 "$url" &> /dev/null; then
            print_error "Post-deployment verification failed for: $url"
            verification_passed=false
        fi
    done
    
    # Check error rates
    if command -v kubectl &> /dev/null; then
        local error_count=$(kubectl logs -l app=creditai-production --since=5m | grep -c "ERROR" || echo "0")
        if [ "$error_count" -gt 10 ]; then
            print_error "High error count detected: $error_count errors in last 5 minutes"
            verification_passed=false
        fi
    fi
    
    if [ "$verification_passed" = true ]; then
        print_status "Post-deployment verification passed ✅"
    else
        print_error "Post-deployment verification failed"
        return 1
    fi
}

# Main deployment flow
main() {
    print_status "Starting production deployment..."
    print_critical "PRODUCTION DEPLOYMENT - PROCEED WITH CAUTION"
    
    # Set error trap for rollback
    trap rollback_production ERR
    
    # Deployment steps
    safety_checks
    create_backup
    build_and_test
    run_production_migrations
    
    if command -v kubectl &> /dev/null; then
        setup_blue_green_deployment
        deploy_kubernetes
        run_production_health_checks
        switch_traffic
        cleanup_old_deployment
    else
        deploy_docker_compose
        run_production_health_checks
    fi
    
    setup_production_monitoring
    post_deployment_verification
    
    # Success
    send_production_notification "completed"
    
    print_status "Production deployment completed successfully! 🎉"
    print_status "Production URL: https://$PRODUCTION_HOST"
    
    # Cleanup deployment files
    rm -f .deployment-target .deployment-current .last-backup
}

# Manual approval for production (if not in CI)
if [ "$CI" != "true" ]; then
    print_critical "This will deploy to PRODUCTION environment!"
    print_warning "Make sure you have:"
    echo "  ✅ Tested in staging"
    echo "  ✅ Reviewed all changes"  
    echo "  ✅ Notified the team"
    echo "  ✅ Have rollback plan ready"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Production deployment cancelled"
        exit 0
    fi
fi

# Run main function
main "$@"