#!/bin/bash

# =============================================
# Backup and Recovery Setup Script
# Enhanced Credit Analysis and EOSCAR System
# =============================================

set -e

# Configuration
BACKUP_DIR="/var/backups/credit-analysis"
LOG_DIR="/var/log/credit-analysis"
RETENTION_DAYS=30
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/backup-setup.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "[ERROR] $1" >> "$LOG_DIR/backup-setup.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_DIR/backup-setup.log"
}

# =============================================
# 1. SETUP DIRECTORIES AND PERMISSIONS
# =============================================

setup_directories() {
    log "Setting up backup directories..."
    
    # Create backup directories
    sudo mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,archive}
    sudo mkdir -p "$LOG_DIR"
    
    # Set permissions
    sudo chown -R postgres:postgres "$BACKUP_DIR"
    sudo chmod -R 750 "$BACKUP_DIR"
    
    # Create log file
    sudo touch "$LOG_DIR/backup.log"
    sudo touch "$LOG_DIR/recovery.log"
    sudo chown postgres:postgres "$LOG_DIR"/*.log
    sudo chmod 640 "$LOG_DIR"/*.log
    
    log "Directories created successfully"
}

# =============================================
# 2. CREATE BACKUP SCRIPTS
# =============================================

create_backup_scripts() {
    log "Creating backup scripts..."
    
    # Daily backup script
    cat > /tmp/daily-backup.sh << 'EOF'
#!/bin/bash

# Daily backup script for Credit Analysis System
set -e

BACKUP_DIR="/var/backups/credit-analysis/daily"
LOG_FILE="/var/log/credit-analysis/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Database connection parameters
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting daily backup..."

# Create full database backup
BACKUP_FILE="$BACKUP_DIR/credit_analysis_daily_$DATE.sql"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --if-exists --create \
    --format=custom --compress=9 \
    --file="$BACKUP_FILE.backup"

# Create readable SQL backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --if-exists --create \
    --format=plain \
    --file="$BACKUP_FILE"

# Compress SQL backup
gzip "$BACKUP_FILE"

# Create schema-only backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --schema-only --verbose \
    --file="$BACKUP_DIR/schema_only_$DATE.sql"

# Backup critical tables separately
CRITICAL_TABLES=("profiles" "credit_reports" "enhanced_disputes" "creditor_database")
for table in "${CRITICAL_TABLES[@]}"; do
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --table="$table" --data-only --inserts \
        --file="$BACKUP_DIR/${table}_data_$DATE.sql"
done

# Verify backup integrity
if pg_restore --list "$BACKUP_FILE.backup" > /dev/null 2>&1; then
    log "Backup verification successful"
else
    log "ERROR: Backup verification failed"
    exit 1
fi

# Clean up old backups
find "$BACKUP_DIR" -name "*.sql*" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +$RETENTION_DAYS -delete

# Log backup size
BACKUP_SIZE=$(du -sh "$BACKUP_FILE.backup" | cut -f1)
log "Daily backup completed successfully. Size: $BACKUP_SIZE"

# Update database with backup info
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
INSERT INTO system_logs (log_type, message, metadata, created_at) 
VALUES ('maintenance', 'Daily backup completed', 
        jsonb_build_object('backup_file', '$BACKUP_FILE.backup', 'size', '$BACKUP_SIZE'), NOW());"

EOF

    # Weekly backup script
    cat > /tmp/weekly-backup.sh << 'EOF'
#!/bin/bash

# Weekly backup script for Credit Analysis System
set -e

BACKUP_DIR="/var/backups/credit-analysis/weekly"
LOG_FILE="/var/log/credit-analysis/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_WEEKS=4

# Database connection parameters
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting weekly backup..."

# Create comprehensive backup with all data
BACKUP_FILE="$BACKUP_DIR/credit_analysis_weekly_$DATE"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --if-exists --create \
    --format=directory --compress=9 --jobs=4 \
    --file="$BACKUP_FILE"

# Create tar archive
tar -czf "$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR" "$(basename "$BACKUP_FILE")"
rm -rf "$BACKUP_FILE"

# Export analytics data separately
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
COPY (
    SELECT * FROM dispute_analytics 
    WHERE created_at >= NOW() - INTERVAL '1 week'
) TO '$BACKUP_DIR/weekly_analytics_$DATE.csv' WITH CSV HEADER;"

# Clean up old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$((RETENTION_WEEKS * 7)) -delete
find "$BACKUP_DIR" -name "*.csv" -mtime +$((RETENTION_WEEKS * 7)) -delete

BACKUP_SIZE=$(du -sh "$BACKUP_FILE.tar.gz" | cut -f1)
log "Weekly backup completed successfully. Size: $BACKUP_SIZE"

EOF

    # Recovery script
    cat > /tmp/recovery.sh << 'EOF'
#!/bin/bash

# Recovery script for Credit Analysis System
set -e

LOG_FILE="/var/log/credit-analysis/recovery.log"
BACKUP_DIR="/var/backups/credit-analysis"

# Database connection parameters
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

usage() {
    echo "Usage: $0 [OPTIONS] BACKUP_FILE"
    echo "Options:"
    echo "  -t, --type TYPE     Backup type (daily|weekly|custom)"
    echo "  -d, --date DATE     Backup date (YYYYMMDD)"
    echo "  --dry-run          Show what would be restored without executing"
    echo "  --schema-only      Restore schema only"
    echo "  --data-only        Restore data only"
    echo "  -h, --help         Show this help message"
    exit 1
}

# Parse command line arguments
BACKUP_TYPE=""
BACKUP_DATE=""
DRY_RUN=false
SCHEMA_ONLY=false
DATA_ONLY=false
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        -d|--date)
            BACKUP_DATE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

if [[ -z "$BACKUP_FILE" && -z "$BACKUP_TYPE" ]]; then
    echo "Error: Must specify either backup file or backup type"
    usage
fi

# Find backup file if type and date specified
if [[ -n "$BACKUP_TYPE" && -n "$BACKUP_DATE" ]]; then
    case "$BACKUP_TYPE" in
        daily)
            BACKUP_FILE=$(find "$BACKUP_DIR/daily" -name "*$BACKUP_DATE*.backup" | head -1)
            ;;
        weekly)
            BACKUP_FILE=$(find "$BACKUP_DIR/weekly" -name "*$BACKUP_DATE*.tar.gz" | head -1)
            ;;
    esac
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Starting recovery from: $BACKUP_FILE"

# Confirm recovery
if [[ "$DRY_RUN" == false ]]; then
    echo "WARNING: This will restore the database and may overwrite existing data."
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Recovery cancelled"
        exit 0
    fi
fi

# Perform recovery based on file type
if [[ "$BACKUP_FILE" == *.backup ]]; then
    # Custom format backup
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would restore from custom format backup"
        pg_restore --list "$BACKUP_FILE"
    else
        if [[ "$SCHEMA_ONLY" == true ]]; then
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --schema-only --verbose --clean --if-exists "$BACKUP_FILE"
        elif [[ "$DATA_ONLY" == true ]]; then
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --data-only --verbose "$BACKUP_FILE"
        else
            pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --verbose --clean --if-exists --create "$BACKUP_FILE"
        fi
    fi
elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    # Compressed SQL backup
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would restore from compressed SQL backup"
    else
        gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    fi
elif [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    # Directory format backup
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    EXTRACTED_DIR=$(find "$TEMP_DIR" -type d -name "credit_analysis_*" | head -1)
    
    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would restore from directory format backup"
        pg_restore --list "$EXTRACTED_DIR"
    else
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --verbose --clean --if-exists --create --jobs=4 "$EXTRACTED_DIR"
    fi
    
    rm -rf "$TEMP_DIR"
fi

if [[ "$DRY_RUN" == false ]]; then
    log "Recovery completed successfully"
    
    # Log recovery in database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    INSERT INTO system_logs (log_type, message, metadata, created_at) 
    VALUES ('maintenance', 'Database recovery completed', 
            jsonb_build_object('backup_file', '$BACKUP_FILE', 'recovery_time', NOW()), NOW());"
fi

EOF

    # Install scripts
    sudo mv /tmp/daily-backup.sh /usr/local/bin/
    sudo mv /tmp/weekly-backup.sh /usr/local/bin/
    sudo mv /tmp/recovery.sh /usr/local/bin/
    
    sudo chmod +x /usr/local/bin/daily-backup.sh
    sudo chmod +x /usr/local/bin/weekly-backup.sh
    sudo chmod +x /usr/local/bin/recovery.sh
    
    log "Backup scripts created successfully"
}

# =============================================
# 3. SETUP CRON JOBS
# =============================================

setup_cron_jobs() {
    log "Setting up cron jobs..."
    
    # Create cron jobs for postgres user
    sudo -u postgres crontab -l > /tmp/postgres_cron 2>/dev/null || true
    
    # Add backup jobs if they don't exist
    if ! grep -q "daily-backup.sh" /tmp/postgres_cron; then
        echo "0 2 * * * /usr/local/bin/daily-backup.sh >> /var/log/credit-analysis/backup.log 2>&1" >> /tmp/postgres_cron
    fi
    
    if ! grep -q "weekly-backup.sh" /tmp/postgres_cron; then
        echo "0 3 * * 0 /usr/local/bin/weekly-backup.sh >> /var/log/credit-analysis/backup.log 2>&1" >> /tmp/postgres_cron
    fi
    
    # Install cron jobs
    sudo -u postgres crontab /tmp/postgres_cron
    rm /tmp/postgres_cron
    
    log "Cron jobs configured successfully"
}

# =============================================
# 4. SETUP MONITORING
# =============================================

setup_monitoring() {
    log "Setting up backup monitoring..."
    
    # Create monitoring script
    cat > /tmp/backup-monitor.sh << 'EOF'
#!/bin/bash

# Backup monitoring script
LOG_FILE="/var/log/credit-analysis/backup-monitor.log"
BACKUP_DIR="/var/backups/credit-analysis"
ALERT_EMAIL="${BACKUP_ALERT_EMAIL:-admin@example.com}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if daily backup exists and is recent
LATEST_DAILY=$(find "$BACKUP_DIR/daily" -name "*.backup" -mtime -1 | head -1)
if [[ -z "$LATEST_DAILY" ]]; then
    log "WARNING: No recent daily backup found"
    echo "No recent daily backup found for Credit Analysis System" | \
        mail -s "Backup Alert: Missing Daily Backup" "$ALERT_EMAIL" 2>/dev/null || true
fi

# Check backup sizes
if [[ -n "$LATEST_DAILY" ]]; then
    BACKUP_SIZE=$(stat -f%z "$LATEST_DAILY" 2>/dev/null || stat -c%s "$LATEST_DAILY" 2>/dev/null)
    MIN_SIZE=$((10 * 1024 * 1024))  # 10MB minimum
    
    if [[ "$BACKUP_SIZE" -lt "$MIN_SIZE" ]]; then
        log "WARNING: Backup size too small: $BACKUP_SIZE bytes"
        echo "Daily backup size is suspiciously small: $BACKUP_SIZE bytes" | \
            mail -s "Backup Alert: Small Backup Size" "$ALERT_EMAIL" 2>/dev/null || true
    fi
fi

# Check disk space
DISK_USAGE=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ "$DISK_USAGE" -gt 85 ]]; then
    log "WARNING: Backup disk usage high: ${DISK_USAGE}%"
    echo "Backup disk usage is high: ${DISK_USAGE}%" | \
        mail -s "Backup Alert: High Disk Usage" "$ALERT_EMAIL" 2>/dev/null || true
fi

log "Backup monitoring completed"

EOF

    sudo mv /tmp/backup-monitor.sh /usr/local/bin/
    sudo chmod +x /usr/local/bin/backup-monitor.sh
    
    # Add monitoring to cron
    sudo -u postgres crontab -l > /tmp/postgres_cron 2>/dev/null || true
    if ! grep -q "backup-monitor.sh" /tmp/postgres_cron; then
        echo "0 6 * * * /usr/local/bin/backup-monitor.sh" >> /tmp/postgres_cron
        sudo -u postgres crontab /tmp/postgres_cron
    fi
    rm /tmp/postgres_cron
    
    log "Backup monitoring configured successfully"
}

# =============================================
# 5. CREATE RECOVERY DOCUMENTATION
# =============================================

create_documentation() {
    log "Creating recovery documentation..."
    
    cat > "$BACKUP_DIR/RECOVERY_GUIDE.md" << 'EOF'
# Credit Analysis System - Recovery Guide

## Quick Recovery Commands

### Restore from Latest Daily Backup
```bash
# Find latest backup
LATEST=$(find /var/backups/credit-analysis/daily -name "*.backup" -mtime -1 | head -1)

# Restore (with confirmation)
/usr/local/bin/recovery.sh "$LATEST"
```

### Restore from Specific Date
```bash
# Restore daily backup from specific date
/usr/local/bin/recovery.sh --type daily --date 20240115

# Restore weekly backup
/usr/local/bin/recovery.sh --type weekly --date 20240115
```

### Schema-Only Recovery
```bash
/usr/local/bin/recovery.sh --schema-only /path/to/backup.backup
```

### Data-Only Recovery
```bash
/usr/local/bin/recovery.sh --data-only /path/to/backup.backup
```

## Recovery Scenarios

### 1. Complete Database Loss
1. Restore from latest weekly backup
2. Apply daily backups since weekly backup
3. Verify data integrity

### 2. Corrupted Tables
1. Use schema-only restore to recreate tables
2. Use data-only restore from clean backup
3. Run data validation queries

### 3. Accidental Data Deletion
1. Identify backup before deletion
2. Restore specific tables if possible
3. Use point-in-time recovery if available

## Backup Locations
- Daily: `/var/backups/credit-analysis/daily/`
- Weekly: `/var/backups/credit-analysis/weekly/`
- Monthly: `/var/backups/credit-analysis/monthly/`

## Monitoring
- Backup logs: `/var/log/credit-analysis/backup.log`
- Recovery logs: `/var/log/credit-analysis/recovery.log`
- Monitor script: `/usr/local/bin/backup-monitor.sh`

## Emergency Contacts
- Database Admin: [Your contact info]
- System Admin: [Your contact info]
- On-call: [Your contact info]

EOF

    log "Recovery documentation created"
}

# =============================================
# 6. TEST BACKUP SYSTEM
# =============================================

test_backup_system() {
    log "Testing backup system..."
    
    # Test daily backup script
    if /usr/local/bin/daily-backup.sh; then
        log "Daily backup test successful"
    else
        error "Daily backup test failed"
        return 1
    fi
    
    # Test recovery script (dry run)
    LATEST_BACKUP=$(find "$BACKUP_DIR/daily" -name "*.backup" -mtime -1 | head -1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        if /usr/local/bin/recovery.sh --dry-run "$LATEST_BACKUP"; then
            log "Recovery test successful"
        else
            error "Recovery test failed"
            return 1
        fi
    else
        warning "No backup found for recovery test"
    fi
    
    log "Backup system tests completed"
}

# =============================================
# MAIN EXECUTION
# =============================================

main() {
    log "Starting backup and recovery setup..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
    
    # Check if PostgreSQL is installed
    if ! command -v pg_dump &> /dev/null; then
        error "PostgreSQL client tools not found"
        exit 1
    fi
    
    # Setup components
    setup_directories
    create_backup_scripts
    setup_cron_jobs
    setup_monitoring
    create_documentation
    
    # Test the system
    if test_backup_system; then
        log "Backup and recovery setup completed successfully!"
        log "Documentation available at: $BACKUP_DIR/RECOVERY_GUIDE.md"
    else
        error "Backup system setup completed with errors"
        exit 1
    fi
}

# Run main function
main "$@"