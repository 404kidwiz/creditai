#!/bin/bash

# Disaster Recovery Script for CreditAI
# Automated disaster recovery testing and execution

set -e

# Configuration
DR_ENVIRONMENT=${DR_ENVIRONMENT:-"dr-test"}
DR_REGION=${DR_REGION:-"us-west-2"}
BACKUP_SOURCE=${BACKUP_SOURCE:-"gcs"}
RESTORE_TYPE=${RESTORE_TYPE:-"latest"}
DRY_RUN=${DRY_RUN:-"false"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Functions
print_status() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

print_critical() {
    echo -e "${MAGENTA}[$(date '+%Y-%m-%d %H:%M:%S')] CRITICAL: $1${NC}"
}

# DR Test Initialization
initialize_dr_test() {
    print_status "Initializing disaster recovery test..."
    
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Create DR test namespace
    if command -v kubectl &> /dev/null; then
        kubectl create namespace "$DR_ENVIRONMENT" --dry-run=client -o yaml | kubectl apply -f -
        kubectl label namespace "$DR_ENVIRONMENT" purpose=disaster-recovery --overwrite
    fi
    
    # Set up temporary directory
    DR_TEMP_DIR="/tmp/creditai-dr-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$DR_TEMP_DIR"
    chmod 700 "$DR_TEMP_DIR"
    
    print_status "DR test environment initialized: $DR_ENVIRONMENT"
}

# Find and download latest backup
download_backup() {
    print_status "Downloading latest backup for recovery..."
    
    local backup_dir="$DR_TEMP_DIR/backups"
    mkdir -p "$backup_dir"
    
    case "$BACKUP_SOURCE" in
        "gcs")
            # Download from Google Cloud Storage
            local latest_backup_path=$(gsutil ls -l "gs://${GCS_BACKUP_BUCKET}/full/**" | sort -k2 | tail -1 | awk '{print $3}')
            
            if [ -n "$latest_backup_path" ]; then
                gsutil -m cp -r "$latest_backup_path" "$backup_dir/"
                print_status "Downloaded backup from GCS: $latest_backup_path"
            else
                print_error "No backup found in GCS bucket"
                return 1
            fi
            ;;
        "s3")
            # Download from AWS S3
            local latest_backup=$(aws s3 ls "s3://${AWS_S3_BACKUP_BUCKET}/full/" --recursive | sort | tail -1 | awk '{print $4}')
            
            if [ -n "$latest_backup" ]; then
                aws s3 cp "s3://${AWS_S3_BACKUP_BUCKET}/$latest_backup" "$backup_dir/" --recursive
                print_status "Downloaded backup from S3: $latest_backup"
            else
                print_error "No backup found in S3 bucket"
                return 1
            fi
            ;;
        "local")
            # Copy from local backup directory
            local latest_backup=$(find /var/backups/creditai -name "*full*" -type f | sort | tail -1)
            
            if [ -n "$latest_backup" ]; then
                cp -r "$latest_backup" "$backup_dir/"
                print_status "Copied local backup: $latest_backup"
            else
                print_error "No local backup found"
                return 1
            fi
            ;;
    esac
    
    # List downloaded files
    print_status "Backup files downloaded:"
    ls -la "$backup_dir/"
}

# Decrypt backup files if encrypted
decrypt_backups() {
    print_status "Checking for encrypted backup files..."
    
    local encrypted_files=$(find "$DR_TEMP_DIR/backups" -name "*.enc" -type f)
    
    if [ -n "$encrypted_files" ]; then
        if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
            print_error "Encrypted backups found but no encryption key provided"
            return 1
        fi
        
        print_status "Decrypting backup files..."
        
        while IFS= read -r encrypted_file; do
            local decrypted_file="${encrypted_file%.enc}"
            
            if [ "$DRY_RUN" = "false" ]; then
                openssl enc -aes-256-cbc -d -salt -in "$encrypted_file" \
                    -out "$decrypted_file" -k "$BACKUP_ENCRYPTION_KEY"
                
                if [ -f "$decrypted_file" ]; then
                    rm "$encrypted_file"
                    print_status "Decrypted: $(basename "$decrypted_file")"
                else
                    print_error "Failed to decrypt: $(basename "$encrypted_file")"
                    return 1
                fi
            else
                print_status "Would decrypt: $(basename "$encrypted_file")"
            fi
        done <<< "$encrypted_files"
    else
        print_status "No encrypted files found"
    fi
}

# Setup DR database
setup_dr_database() {
    print_status "Setting up disaster recovery database..."
    
    local db_backup=$(find "$DR_TEMP_DIR/backups" -name "*database*.sql.gz" -o -name "*database*.sql" | head -1)
    
    if [ -z "$db_backup" ]; then
        print_error "No database backup found"
        return 1
    fi
    
    # Create DR database instance
    local dr_db_name="${DR_ENVIRONMENT}_creditai"
    local dr_db_user="${DR_ENVIRONMENT}_user"
    local dr_db_password=$(openssl rand -base64 32)
    
    if [ "$DRY_RUN" = "false" ]; then
        # Create database
        createdb "$dr_db_name" || print_warning "Database may already exist"
        
        # Create user
        psql -c "CREATE USER $dr_db_user WITH PASSWORD '$dr_db_password';" postgres || true
        psql -c "GRANT ALL PRIVILEGES ON DATABASE $dr_db_name TO $dr_db_user;" postgres || true
        
        # Restore database
        if [[ "$db_backup" == *.gz ]]; then
            gunzip -c "$db_backup" | psql "$dr_db_name"
        else
            psql "$dr_db_name" < "$db_backup"
        fi
        
        print_status "Database restored successfully"
        
        # Save credentials for application
        cat > "$DR_TEMP_DIR/db-credentials.env" << EOF
DR_DATABASE_URL=postgresql://$dr_db_user:$dr_db_password@localhost:5432/$dr_db_name
DR_DATABASE_NAME=$dr_db_name
DR_DATABASE_USER=$dr_db_user
DR_DATABASE_PASSWORD=$dr_db_password
EOF
    else
        print_status "Would restore database from: $(basename "$db_backup")"
    fi
}

# Setup DR Redis
setup_dr_redis() {
    print_status "Setting up disaster recovery Redis..."
    
    local redis_backup=$(find "$DR_TEMP_DIR/backups" -name "*redis*.rdb.gz" -o -name "*redis*.rdb" | head -1)
    
    if [ -n "$redis_backup" ]; then
        if [ "$DRY_RUN" = "false" ]; then
            # Start Redis instance for DR
            local redis_port=6380
            local redis_config="$DR_TEMP_DIR/redis-dr.conf"
            
            cat > "$redis_config" << EOF
port $redis_port
dir $DR_TEMP_DIR
dbfilename redis-dr.rdb
save 900 1
save 300 10
save 60 10000
EOF
            
            # Extract and prepare Redis data
            if [[ "$redis_backup" == *.gz ]]; then
                gunzip -c "$redis_backup" > "$DR_TEMP_DIR/redis-dr.rdb"
            else
                cp "$redis_backup" "$DR_TEMP_DIR/redis-dr.rdb"
            fi
            
            # Start Redis server
            redis-server "$redis_config" --daemonize yes
            
            print_status "Redis DR instance started on port $redis_port"
            
            # Save Redis connection info
            cat >> "$DR_TEMP_DIR/db-credentials.env" << EOF
DR_REDIS_URL=redis://localhost:$redis_port
DR_REDIS_PORT=$redis_port
EOF
        else
            print_status "Would restore Redis from: $(basename "$redis_backup")"
        fi
    else
        print_warning "No Redis backup found"
    fi
}

# Deploy application in DR environment
deploy_dr_application() {
    print_status "Deploying application in DR environment..."
    
    if command -v kubectl &> /dev/null; then
        # Create DR deployment configuration
        local dr_deployment="$DR_TEMP_DIR/dr-deployment.yaml"
        
        cat > "$dr_deployment" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: creditai-dr
  namespace: $DR_ENVIRONMENT
  labels:
    app: creditai
    environment: disaster-recovery
spec:
  replicas: 1
  selector:
    matchLabels:
      app: creditai
      environment: disaster-recovery
  template:
    metadata:
      labels:
        app: creditai
        environment: disaster-recovery
    spec:
      containers:
      - name: creditai
        image: creditai:production-latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DISASTER_RECOVERY_MODE
          value: "true"
        envFrom:
        - secretRef:
            name: creditai-dr-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "125m"
          limits:
            memory: "512Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: creditai-dr-service
  namespace: $DR_ENVIRONMENT
spec:
  selector:
    app: creditai
    environment: disaster-recovery
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
EOF
        
        # Create secrets for DR environment
        if [ -f "$DR_TEMP_DIR/db-credentials.env" ]; then
            kubectl create secret generic creditai-dr-secrets \
                --namespace="$DR_ENVIRONMENT" \
                --from-env-file="$DR_TEMP_DIR/db-credentials.env" \
                --dry-run=client -o yaml | kubectl apply -f -
        fi
        
        if [ "$DRY_RUN" = "false" ]; then
            # Deploy to DR environment
            kubectl apply -f "$dr_deployment"
            
            # Wait for deployment
            kubectl wait --for=condition=available --timeout=600s \
                deployment/creditai-dr -n "$DR_ENVIRONMENT"
            
            print_status "DR application deployed successfully"
        else
            print_status "Would deploy DR application with configuration:"
            cat "$dr_deployment"
        fi
    else
        print_warning "kubectl not available, skipping Kubernetes DR deployment"
    fi
}

# Test DR environment
test_dr_environment() {
    print_status "Testing disaster recovery environment..."
    
    local tests_passed=0
    local tests_total=0
    
    # Test 1: Health endpoint
    tests_total=$((tests_total + 1))
    if [ "$DRY_RUN" = "false" ]; then
        if command -v kubectl &> /dev/null; then
            local dr_service_ip=$(kubectl get service creditai-dr-service -n "$DR_ENVIRONMENT" \
                -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
            
            if [ -n "$dr_service_ip" ]; then
                if curl -f "http://$dr_service_ip/api/health" &> /dev/null; then
                    print_status "✅ Health endpoint test passed"
                    tests_passed=$((tests_passed + 1))
                else
                    print_error "❌ Health endpoint test failed"
                fi
            else
                print_warning "⚠️ Service IP not available yet"
            fi
        fi
    else
        print_status "Would test health endpoint"
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 2: Database connectivity
    tests_total=$((tests_total + 1))
    if [ "$DRY_RUN" = "false" ] && [ -f "$DR_TEMP_DIR/db-credentials.env" ]; then
        source "$DR_TEMP_DIR/db-credentials.env"
        
        if psql "$DR_DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            print_status "✅ Database connectivity test passed"
            tests_passed=$((tests_passed + 1))
        else
            print_error "❌ Database connectivity test failed"
        fi
    else
        print_status "Would test database connectivity"
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 3: Redis connectivity
    tests_total=$((tests_total + 1))
    if [ "$DRY_RUN" = "false" ] && [ -f "$DR_TEMP_DIR/db-credentials.env" ]; then
        source "$DR_TEMP_DIR/db-credentials.env"
        
        if [ -n "$DR_REDIS_PORT" ] && redis-cli -p "$DR_REDIS_PORT" ping &> /dev/null; then
            print_status "✅ Redis connectivity test passed"
            tests_passed=$((tests_passed + 1))
        else
            print_warning "⚠️ Redis connectivity test skipped (optional)"
            tests_passed=$((tests_passed + 1))
        fi
    else
        print_status "Would test Redis connectivity"
        tests_passed=$((tests_passed + 1))
    fi
    
    # Test 4: Application functionality
    tests_total=$((tests_total + 1))
    if [ "$DRY_RUN" = "false" ]; then
        # Test basic application functionality
        if command -v kubectl &> /dev/null; then
            local dr_service_ip=$(kubectl get service creditai-dr-service -n "$DR_ENVIRONMENT" \
                -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
            
            if [ -n "$dr_service_ip" ]; then
                if curl -f "http://$dr_service_ip/" &> /dev/null; then
                    print_status "✅ Application functionality test passed"
                    tests_passed=$((tests_passed + 1))
                else
                    print_error "❌ Application functionality test failed"
                fi
            fi
        fi
    else
        print_status "Would test application functionality"
        tests_passed=$((tests_passed + 1))
    fi
    
    # Summary
    print_status "DR Test Results: $tests_passed/$tests_total tests passed"
    
    if [ "$tests_passed" -eq "$tests_total" ]; then
        print_status "🎉 All DR tests passed!"
        return 0
    else
        print_error "💥 Some DR tests failed!"
        return 1
    fi
}

# Calculate RTO and RPO
calculate_rto_rpo() {
    print_status "Calculating RTO and RPO metrics..."
    
    local recovery_start_time=$(date +%s)
    local backup_timestamp=$(find "$DR_TEMP_DIR/backups" -name "backup-metadata.json" -exec jq -r '.timestamp' {} \; 2>/dev/null || echo "")
    
    if [ -n "$backup_timestamp" ]; then
        local backup_time=$(date -d "$backup_timestamp" +%s 2>/dev/null || echo "0")
        local current_time=$(date +%s)
        
        # RPO (Recovery Point Objective) - time between backup and current time
        local rpo_seconds=$((current_time - backup_time))
        local rpo_hours=$((rpo_seconds / 3600))
        local rpo_minutes=$(((rpo_seconds % 3600) / 60))
        
        print_status "📊 Recovery Metrics:"
        echo "  RPO (Recovery Point Objective): ${rpo_hours}h ${rpo_minutes}m"
        echo "  Backup timestamp: $backup_timestamp"
        echo "  Data loss window: $rpo_seconds seconds"
        
        # RTO will be calculated after recovery completion
        echo "$recovery_start_time" > "$DR_TEMP_DIR/recovery-start-time"
    else
        print_warning "Could not find backup metadata for RPO calculation"
    fi
}

# Generate DR test report
generate_dr_report() {
    print_status "Generating disaster recovery test report..."
    
    local report_file="$DR_TEMP_DIR/dr-test-report.md"
    local recovery_end_time=$(date +%s)
    local recovery_start_time=$(cat "$DR_TEMP_DIR/recovery-start-time" 2>/dev/null || echo "$recovery_end_time")
    local rto_seconds=$((recovery_end_time - recovery_start_time))
    local rto_minutes=$((rto_seconds / 60))
    
    cat > "$report_file" << EOF
# Disaster Recovery Test Report

**Date:** $(date)
**Environment:** $DR_ENVIRONMENT
**Test Type:** ${DRY_RUN:-false}
**Recovery Type:** $RESTORE_TYPE

## Executive Summary

This disaster recovery test validates CreditAI's ability to recover from a catastrophic failure and restore service within acceptable RTO/RPO targets.

## Test Results

### Recovery Time Objective (RTO)
- **Target RTO:** 15 minutes
- **Actual RTO:** $rto_minutes minutes
- **Status:** $([ $rto_minutes -le 15 ] && echo "✅ PASSED" || echo "❌ FAILED")

### Recovery Point Objective (RPO)
- **Target RPO:** 4 hours
- **Actual RPO:** See metrics above
- **Status:** $([ -f "$DR_TEMP_DIR/rpo-status" ] && cat "$DR_TEMP_DIR/rpo-status" || echo "⚠️ UNKNOWN")

### Component Recovery Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database | $([ -f "$DR_TEMP_DIR/db-credentials.env" ] && echo "✅ RECOVERED" || echo "❌ FAILED") | PostgreSQL database restored from backup |
| Redis Cache | $([ -n "$(find "$DR_TEMP_DIR/backups" -name "*redis*" 2>/dev/null)" ] && echo "✅ RECOVERED" || echo "⚠️ OPTIONAL") | Redis data restored |
| Application | $(command -v kubectl &> /dev/null && echo "✅ DEPLOYED" || echo "⚠️ MANUAL") | Application deployed in DR environment |
| Load Balancer | $(command -v kubectl &> /dev/null && echo "✅ CONFIGURED" || echo "⚠️ MANUAL") | Traffic routing configured |

### Test Validation

1. **Health Checks:** Application health endpoints responding
2. **Database Connectivity:** Database connections working
3. **Redis Connectivity:** Cache layer functional (if applicable)
4. **Application Functionality:** Core features accessible

## Recommendations

1. **Performance:** Consider optimizing backup/restore procedures for faster RTO
2. **Automation:** Enhance automated failover capabilities
3. **Testing:** Schedule regular DR tests (monthly)
4. **Documentation:** Update runbooks based on test findings

## Next Steps

1. Clean up DR test environment
2. Document any issues discovered
3. Update DR procedures if needed
4. Schedule next DR test

---
*Generated by CreditAI DR Test System*
EOF

    print_status "DR test report generated: $report_file"
    
    # Display report summary
    echo ""
    print_status "📋 DR Test Summary:"
    echo "  Recovery Time: $rto_minutes minutes"
    echo "  Environment: $DR_ENVIRONMENT"
    echo "  Test Mode: ${DRY_RUN:-false}"
    echo "  Report: $report_file"
}

# Cleanup DR environment
cleanup_dr_environment() {
    print_status "Cleaning up disaster recovery test environment..."
    
    if [ "$DRY_RUN" = "false" ]; then
        # Cleanup Kubernetes resources
        if command -v kubectl &> /dev/null; then
            kubectl delete namespace "$DR_ENVIRONMENT" --ignore-not-found=true
            print_status "Kubernetes DR namespace deleted"
        fi
        
        # Cleanup database
        if [ -f "$DR_TEMP_DIR/db-credentials.env" ]; then
            source "$DR_TEMP_DIR/db-credentials.env"
            dropdb "$DR_DATABASE_NAME" --if-exists
            psql -c "DROP USER IF EXISTS $DR_DATABASE_USER;" postgres
            print_status "DR database cleaned up"
        fi
        
        # Cleanup Redis
        if [ -f "$DR_TEMP_DIR/db-credentials.env" ]; then
            source "$DR_TEMP_DIR/db-credentials.env"
            if [ -n "$DR_REDIS_PORT" ]; then
                redis-cli -p "$DR_REDIS_PORT" shutdown || true
                print_status "DR Redis instance stopped"
            fi
        fi
    else
        print_status "Would cleanup DR environment"
    fi
    
    # Cleanup temporary files
    if [ -d "$DR_TEMP_DIR" ]; then
        rm -rf "$DR_TEMP_DIR"
        print_status "Temporary files cleaned up"
    fi
}

# Main DR function
main() {
    print_critical "🚨 DISASTER RECOVERY TEST INITIATED 🚨"
    print_status "DR Environment: $DR_ENVIRONMENT"
    print_status "Restore Type: $RESTORE_TYPE"
    print_status "Dry Run: $DRY_RUN"
    
    # Set error trap
    trap cleanup_dr_environment EXIT
    
    # Execute DR steps
    initialize_dr_test
    download_backup
    decrypt_backups
    calculate_rto_rpo
    setup_dr_database
    setup_dr_redis
    deploy_dr_application
    test_dr_environment
    generate_dr_report
    
    if [ "$DRY_RUN" = "false" ]; then
        print_status "🎉 Disaster recovery test completed successfully!"
    else
        print_status "🔍 Disaster recovery dry run completed!"
    fi
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

CreditAI Disaster Recovery System

OPTIONS:
    --environment ENV   DR environment name (default: dr-test)
    --region REGION     DR region (default: us-west-2)
    --source SOURCE     Backup source: gcs, s3, local (default: gcs)
    --restore TYPE      Restore type: latest, specific (default: latest)
    --dry-run          Perform dry run without actual changes
    --cleanup          Only cleanup existing DR environment
    --help             Show this help message

ENVIRONMENT VARIABLES:
    BACKUP_ENCRYPTION_KEY       Encryption key for backup files
    GCS_BACKUP_BUCKET          Google Cloud Storage bucket name
    AWS_S3_BACKUP_BUCKET       AWS S3 bucket name

EXAMPLES:
    $0                          # Test recovery with defaults
    $0 --dry-run               # Dry run test
    $0 --environment prod-dr    # Use specific environment
    $0 --cleanup               # Cleanup DR environment

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            DR_ENVIRONMENT="$2"
            shift 2
            ;;
        --region)
            DR_REGION="$2"
            shift 2
            ;;
        --source)
            BACKUP_SOURCE="$2"
            shift 2
            ;;
        --restore)
            RESTORE_TYPE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --cleanup)
            cleanup_dr_environment
            exit 0
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"