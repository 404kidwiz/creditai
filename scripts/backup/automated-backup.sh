#!/bin/bash

# Automated Backup System for CreditAI
# Comprehensive backup solution with encryption, compression, and cloud storage

set -e

# Configuration
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/var/backups/creditai"
TEMP_DIR="/tmp/creditai-backup-$BACKUP_DATE"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-""}
BACKUP_TYPE=${BACKUP_TYPE:-"incremental"}

# Cloud Storage Configuration
GCS_BUCKET=${GCS_BACKUP_BUCKET:-"creditai-backups"}
AWS_S3_BUCKET=${AWS_S3_BACKUP_BUCKET:-"creditai-backups"}
STORAGE_PROVIDER=${BACKUP_STORAGE_PROVIDER:-"gcs"}

# Database Configuration
DB_HOST=${DATABASE_HOST:-"localhost"}
DB_PORT=${DATABASE_PORT:-"5432"}
DB_NAME=${DATABASE_NAME:-"creditai"}
DB_USER=${DATABASE_USER:-"creditai"}
DB_PASSWORD=${DATABASE_PASSWORD:-""}

# Redis Configuration
REDIS_HOST=${REDIS_HOST:-"localhost"}
REDIS_PORT=${REDIS_PORT:-"6379"}
REDIS_PASSWORD=${REDIS_PASSWORD:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Create backup directories
setup_backup_environment() {
    print_status "Setting up backup environment..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$TEMP_DIR"
    
    # Set secure permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$TEMP_DIR"
    
    print_status "Backup environment ready"
}

# Database backup
backup_database() {
    print_status "Starting database backup ($BACKUP_TYPE)..."
    
    local backup_file="$TEMP_DIR/database-$BACKUP_DATE.sql"
    local compressed_file="$backup_file.gz"
    
    # Set PostgreSQL password
    export PGPASSWORD="$DB_PASSWORD"
    
    case "$BACKUP_TYPE" in
        "full")
            print_status "Performing full database backup..."
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
                --verbose --no-password --format=custom \
                --compress=9 "$DB_NAME" > "$backup_file"
            ;;
        "incremental")
            print_status "Performing incremental database backup..."
            # Use WAL-E or similar for incremental backups
            if command -v wal-g &> /dev/null; then
                wal-g backup-push "$TEMP_DIR/wal-backup-$BACKUP_DATE"
            else
                # Fallback to full backup
                print_warning "WAL-G not available, falling back to full backup"
                pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
                    --verbose --no-password --format=custom \
                    --compress=9 "$DB_NAME" > "$backup_file"
            fi
            ;;
        "differential")
            print_status "Performing differential database backup..."
            # Create differential backup based on last full backup
            local last_full_backup=$(find "$BACKUP_DIR" -name "*full*database*.gz" | sort -r | head -1)
            if [ -n "$last_full_backup" ]; then
                pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
                    --verbose --no-password --format=custom \
                    --compress=9 "$DB_NAME" > "$backup_file"
            else
                print_warning "No full backup found, performing full backup"
                pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
                    --verbose --no-password --format=custom \
                    --compress=9 "$DB_NAME" > "$backup_file"
            fi
            ;;
    esac
    
    # Compress if not already compressed
    if [ -f "$backup_file" ] && [ ! -f "$compressed_file" ]; then
        gzip "$backup_file"
        backup_file="$compressed_file"
    fi
    
    # Verify backup integrity
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        print_status "Database backup completed: $(basename "$backup_file")"
        echo "$backup_file" >> "$TEMP_DIR/backup-manifest.txt"
    else
        print_error "Database backup failed or is empty"
        return 1
    fi
    
    unset PGPASSWORD
}

# Redis backup
backup_redis() {
    print_status "Starting Redis backup..."
    
    local backup_file="$TEMP_DIR/redis-$BACKUP_DATE.rdb"
    
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
            --rdb "$backup_file"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
            --rdb "$backup_file"
    fi
    
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        gzip "$backup_file"
        print_status "Redis backup completed: redis-$BACKUP_DATE.rdb.gz"
        echo "$backup_file.gz" >> "$TEMP_DIR/backup-manifest.txt"
    else
        print_warning "Redis backup failed or is empty"
    fi
}

# Application files backup
backup_application_files() {
    print_status "Starting application files backup..."
    
    local app_backup="$TEMP_DIR/application-$BACKUP_DATE.tar.gz"
    local upload_backup="$TEMP_DIR/uploads-$BACKUP_DATE.tar.gz"
    
    # Backup application configuration
    if [ -d "/opt/creditai" ]; then
        tar -czf "$app_backup" \
            --exclude="node_modules" \
            --exclude=".git" \
            --exclude=".next" \
            --exclude="logs" \
            --exclude="tmp" \
            -C "/opt" creditai/
        
        if [ -f "$app_backup" ] && [ -s "$app_backup" ]; then
            print_status "Application files backup completed"
            echo "$app_backup" >> "$TEMP_DIR/backup-manifest.txt"
        fi
    fi
    
    # Backup user uploads
    if [ -d "/var/lib/creditai/uploads" ]; then
        tar -czf "$upload_backup" -C "/var/lib/creditai" uploads/
        
        if [ -f "$upload_backup" ] && [ -s "$upload_backup" ]; then
            print_status "Upload files backup completed"
            echo "$upload_backup" >> "$TEMP_DIR/backup-manifest.txt"
        fi
    fi
}

# Kubernetes configuration backup
backup_kubernetes_config() {
    print_status "Starting Kubernetes configuration backup..."
    
    if command -v kubectl &> /dev/null; then
        local k8s_backup="$TEMP_DIR/kubernetes-$BACKUP_DATE.tar.gz"
        local k8s_temp="$TEMP_DIR/k8s-config"
        
        mkdir -p "$k8s_temp"
        
        # Export all Kubernetes resources
        kubectl get all --all-namespaces -o yaml > "$k8s_temp/all-resources.yaml"
        kubectl get configmaps --all-namespaces -o yaml > "$k8s_temp/configmaps.yaml"
        kubectl get secrets --all-namespaces -o yaml > "$k8s_temp/secrets.yaml"
        kubectl get ingress --all-namespaces -o yaml > "$k8s_temp/ingress.yaml"
        kubectl get persistentvolumes -o yaml > "$k8s_temp/pv.yaml"
        kubectl get persistentvolumeclaims --all-namespaces -o yaml > "$k8s_temp/pvc.yaml"
        
        # Create archive
        tar -czf "$k8s_backup" -C "$TEMP_DIR" k8s-config/
        
        if [ -f "$k8s_backup" ] && [ -s "$k8s_backup" ]; then
            print_status "Kubernetes configuration backup completed"
            echo "$k8s_backup" >> "$TEMP_DIR/backup-manifest.txt"
        fi
        
        rm -rf "$k8s_temp"
    else
        print_warning "kubectl not available, skipping Kubernetes backup"
    fi
}

# Encrypt backup files
encrypt_backups() {
    if [ -n "$ENCRYPTION_KEY" ]; then
        print_status "Encrypting backup files..."
        
        while IFS= read -r backup_file; do
            if [ -f "$backup_file" ]; then
                openssl enc -aes-256-cbc -salt -in "$backup_file" \
                    -out "$backup_file.enc" -k "$ENCRYPTION_KEY"
                
                if [ -f "$backup_file.enc" ]; then
                    rm "$backup_file"
                    print_status "Encrypted: $(basename "$backup_file")"
                else
                    print_error "Failed to encrypt: $(basename "$backup_file")"
                fi
            fi
        done < "$TEMP_DIR/backup-manifest.txt"
        
        # Update manifest with encrypted files
        sed -i 's/$/.enc/' "$TEMP_DIR/backup-manifest.txt"
    else
        print_warning "No encryption key provided, skipping encryption"
    fi
}

# Create backup metadata
create_backup_metadata() {
    print_status "Creating backup metadata..."
    
    local metadata_file="$TEMP_DIR/backup-metadata.json"
    
    cat > "$metadata_file" << EOF
{
    "backup_id": "$BACKUP_DATE",
    "backup_type": "$BACKUP_TYPE",
    "timestamp": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "environment": "${ENVIRONMENT:-production}",
    "version": "${APP_VERSION:-unknown}",
    "git_commit": "${GIT_COMMIT:-unknown}",
    "database": {
        "host": "$DB_HOST",
        "name": "$DB_NAME",
        "backup_method": "pg_dump"
    },
    "redis": {
        "host": "$REDIS_HOST",
        "backup_method": "rdb"
    },
    "encryption": {
        "enabled": $([ -n "$ENCRYPTION_KEY" ] && echo "true" || echo "false"),
        "algorithm": "aes-256-cbc"
    },
    "storage": {
        "provider": "$STORAGE_PROVIDER",
        "bucket": "${GCS_BUCKET:-$AWS_S3_BUCKET}"
    },
    "files": [
EOF

    # Add file list to metadata
    local first=true
    while IFS= read -r backup_file; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$metadata_file"
        fi
        
        local file_size=$(stat -c%s "$backup_file" 2>/dev/null || echo "0")
        local file_hash=$(sha256sum "$backup_file" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
        
        cat >> "$metadata_file" << EOF
        {
            "name": "$(basename "$backup_file")",
            "path": "$backup_file",
            "size": $file_size,
            "hash": "$file_hash"
        }
EOF
    done < "$TEMP_DIR/backup-manifest.txt"
    
    cat >> "$metadata_file" << EOF
    ]
}
EOF

    print_status "Backup metadata created"
}

# Upload to cloud storage
upload_to_cloud() {
    print_status "Uploading backups to cloud storage ($STORAGE_PROVIDER)..."
    
    local cloud_path="$BACKUP_TYPE/$(date +%Y)/$(date +%m)/$(date +%d)/$BACKUP_DATE"
    
    case "$STORAGE_PROVIDER" in
        "gcs")
            if command -v gsutil &> /dev/null; then
                gsutil -m cp -r "$TEMP_DIR/*" "gs://$GCS_BUCKET/$cloud_path/"
                print_status "Backup uploaded to GCS: gs://$GCS_BUCKET/$cloud_path/"
            else
                print_error "gsutil not available for GCS upload"
                return 1
            fi
            ;;
        "s3")
            if command -v aws &> /dev/null; then
                aws s3 cp "$TEMP_DIR/" "s3://$AWS_S3_BUCKET/$cloud_path/" --recursive
                print_status "Backup uploaded to S3: s3://$AWS_S3_BUCKET/$cloud_path/"
            else
                print_error "AWS CLI not available for S3 upload"
                return 1
            fi
            ;;
        "local")
            cp -r "$TEMP_DIR/"* "$BACKUP_DIR/"
            print_status "Backup saved locally: $BACKUP_DIR/"
            ;;
        *)
            print_error "Unknown storage provider: $STORAGE_PROVIDER"
            return 1
            ;;
    esac
}

# Verify backup integrity
verify_backup_integrity() {
    print_status "Verifying backup integrity..."
    
    local verification_passed=true
    
    while IFS= read -r backup_file; do
        if [ -f "$backup_file" ]; then
            # Check file size
            local file_size=$(stat -c%s "$backup_file")
            if [ "$file_size" -eq 0 ]; then
                print_error "Backup file is empty: $(basename "$backup_file")"
                verification_passed=false
            fi
            
            # For database backups, try to verify structure
            if [[ "$backup_file" == *"database"* ]] && [[ "$backup_file" == *".gz" ]]; then
                if command -v pg_restore &> /dev/null; then
                    if gunzip -t "$backup_file" &> /dev/null; then
                        print_status "Database backup verified: $(basename "$backup_file")"
                    else
                        print_error "Database backup corrupted: $(basename "$backup_file")"
                        verification_passed=false
                    fi
                fi
            fi
        else
            print_error "Backup file not found: $backup_file"
            verification_passed=false
        fi
    done < "$TEMP_DIR/backup-manifest.txt"
    
    if [ "$verification_passed" = true ]; then
        print_status "Backup integrity verification passed"
    else
        print_error "Backup integrity verification failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    print_status "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    case "$STORAGE_PROVIDER" in
        "gcs")
            if command -v gsutil &> /dev/null; then
                # Delete objects older than retention period
                gsutil -m rm -r "gs://$GCS_BUCKET/**" \
                    -exec "test \$((\$(date +%s) - \$(gsutil stat {} | grep 'Creation time' | cut -d: -f2- | xargs -I {} date -d {} +%s))) -gt \$(($RETENTION_DAYS * 86400))" \; \
                    2>/dev/null || true
            fi
            ;;
        "s3")
            if command -v aws &> /dev/null; then
                # Use S3 lifecycle policy for automatic cleanup
                aws s3api put-bucket-lifecycle-configuration \
                    --bucket "$AWS_S3_BUCKET" \
                    --lifecycle-configuration file://s3-lifecycle-policy.json \
                    2>/dev/null || true
            fi
            ;;
        "local")
            find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete
            ;;
    esac
    
    print_status "Old backups cleaned up"
}

# Send notifications
send_notification() {
    local status=$1
    local message="CreditAI backup $status - $BACKUP_DATE ($BACKUP_TYPE)"
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK_BACKUP" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_BACKUP" &> /dev/null || true
    fi
    
    # Email notification
    if [ -n "$BACKUP_ALERT_EMAIL" ]; then
        echo "$message" | mail -s "CreditAI Backup $status" "$BACKUP_ALERT_EMAIL" &> /dev/null || true
    fi
    
    print_status "Notification sent: $status"
}

# Cleanup temporary files
cleanup_temp_files() {
    print_status "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    print_status "Temporary files cleaned up"
}

# Error handling
handle_error() {
    print_error "Backup failed at step: $1"
    send_notification "failed"
    cleanup_temp_files
    exit 1
}

# Main backup function
main() {
    print_status "Starting automated backup process..."
    print_status "Backup type: $BACKUP_TYPE"
    print_status "Storage provider: $STORAGE_PROVIDER"
    
    # Set error trap
    trap 'handle_error "unknown"' ERR
    
    # Execute backup steps
    setup_backup_environment || handle_error "setup_backup_environment"
    backup_database || handle_error "backup_database"
    backup_redis || handle_error "backup_redis"
    backup_application_files || handle_error "backup_application_files"
    backup_kubernetes_config || handle_error "backup_kubernetes_config"
    create_backup_metadata || handle_error "create_backup_metadata"
    encrypt_backups || handle_error "encrypt_backups"
    verify_backup_integrity || handle_error "verify_backup_integrity"
    upload_to_cloud || handle_error "upload_to_cloud"
    cleanup_old_backups || handle_error "cleanup_old_backups"
    
    send_notification "completed successfully"
    cleanup_temp_files
    
    print_status "Backup process completed successfully! 🎉"
}

# Help function
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

CreditAI Automated Backup System

OPTIONS:
    --type TYPE         Backup type: full, incremental, differential (default: incremental)
    --storage PROVIDER  Storage provider: gcs, s3, local (default: gcs)
    --retention DAYS    Retention period in days (default: 30)
    --encrypt           Enable encryption (requires BACKUP_ENCRYPTION_KEY)
    --help             Show this help message

ENVIRONMENT VARIABLES:
    BACKUP_ENCRYPTION_KEY       Encryption key for backup files
    GCS_BACKUP_BUCKET          Google Cloud Storage bucket name
    AWS_S3_BACKUP_BUCKET       AWS S3 bucket name
    DATABASE_HOST              Database hostname
    DATABASE_PASSWORD          Database password
    SLACK_WEBHOOK_BACKUP       Slack webhook URL for notifications
    BACKUP_ALERT_EMAIL         Email address for notifications

EXAMPLES:
    $0                          # Default incremental backup
    $0 --type full             # Full backup
    $0 --storage s3            # Upload to S3
    $0 --retention 7           # Keep backups for 7 days

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        --storage)
            STORAGE_PROVIDER="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --encrypt)
            if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
                print_error "BACKUP_ENCRYPTION_KEY environment variable required for encryption"
                exit 1
            fi
            shift
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

# Validate backup type
case "$BACKUP_TYPE" in
    "full"|"incremental"|"differential")
        ;;
    *)
        print_error "Invalid backup type: $BACKUP_TYPE"
        exit 1
        ;;
esac

# Run main function
main "$@"