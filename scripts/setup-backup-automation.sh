#!/bin/bash

# =============================================
# CreditAI Backup Automation Setup Script
# 
# This script sets up automated backup procedures, cron jobs,
# and monitoring for the CreditAI Supabase database.
# =============================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_BASE_DIR:-$PROJECT_ROOT/backups}"
LOG_DIR="$BACKUP_DIR/logs"
CRON_USER="${BACKUP_CRON_USER:-$(whoami)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# =============================================
# 1. VALIDATE ENVIRONMENT
# =============================================

validate_environment() {
    log "Validating environment..."

    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        error "Node.js is required but not installed"
        exit 1
    fi

    # Check if required environment variables are set
    local required_vars=("NEXT_PUBLIC_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_DB_URL")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            error "  - $var"
        done
        
        info "Please set these variables in your .env.local file or environment:"
        info "  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url"
        info "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
        info "  SUPABASE_DB_URL=your_database_connection_string"
        exit 1
    fi

    # Check if PostgreSQL client tools are available
    if ! command -v pg_dump &> /dev/null; then
        warning "PostgreSQL client tools not found. Some backup features may not work."
        info "Install with: sudo apt-get install postgresql-client (Ubuntu/Debian)"
        info "Or: brew install postgresql (macOS)"
    fi

    log "Environment validation completed"
}

# =============================================
# 2. SETUP DIRECTORIES
# =============================================

setup_directories() {
    log "Setting up backup directories..."

    local dirs=(
        "$BACKUP_DIR"
        "$BACKUP_DIR/daily"
        "$BACKUP_DIR/weekly"
        "$BACKUP_DIR/monthly"
        "$BACKUP_DIR/temp"
        "$BACKUP_DIR/validation"
        "$LOG_DIR"
    )

    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chmod 750 "$dir"
        log "Created directory: $dir"
    done

    # Create log files
    touch "$LOG_DIR/backup.log"
    touch "$LOG_DIR/monitoring.log"
    touch "$LOG_DIR/validation.log"
    
    chmod 640 "$LOG_DIR"/*.log
    
    log "Directories and log files created successfully"
}

# =============================================
# 3. CREATE WRAPPER SCRIPTS
# =============================================

create_wrapper_scripts() {
    log "Creating wrapper scripts..."

    # Daily backup wrapper
    cat > "$BACKUP_DIR/run-daily-backup.sh" << 'EOF'
#!/bin/bash

# Daily Backup Wrapper Script for CreditAI
# This script is executed by cron for daily backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/logs/backup.log"

# Source environment variables if available
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
fi

# Redirect output to log file
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] Starting daily backup process..."

# Run the backup
cd "$PROJECT_ROOT"
if node scripts/supabase-backup-system.js backup daily; then
    echo "[$(date)] Daily backup completed successfully"
    
    # Run monitoring check
    if node scripts/backup-monitoring-system.js monitor; then
        echo "[$(date)] Monitoring check passed"
    else
        echo "[$(date)] Monitoring check detected issues"
    fi
else
    echo "[$(date)] Daily backup failed"
    exit 1
fi

echo "[$(date)] Daily backup process finished"
EOF

    # Weekly backup wrapper
    cat > "$BACKUP_DIR/run-weekly-backup.sh" << 'EOF'
#!/bin/bash

# Weekly Backup Wrapper Script for CreditAI
# This script is executed by cron for weekly backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/logs/backup.log"

# Source environment variables if available
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
fi

# Redirect output to log file
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] Starting weekly backup process..."

# Run the backup
cd "$PROJECT_ROOT"
if node scripts/supabase-backup-system.js backup weekly; then
    echo "[$(date)] Weekly backup completed successfully"
    
    # Run comprehensive validation
    if node scripts/backup-validation-system.js integrity-check "$SCRIPT_DIR/weekly"; then
        echo "[$(date)] Weekly backup validation passed"
    else
        echo "[$(date)] Weekly backup validation failed"
    fi
else
    echo "[$(date)] Weekly backup failed"
    exit 1
fi

echo "[$(date)] Weekly backup process finished"
EOF

    # Monthly backup wrapper
    cat > "$BACKUP_DIR/run-monthly-backup.sh" << 'EOF'
#!/bin/bash

# Monthly Backup Wrapper Script for CreditAI
# This script is executed by cron for monthly backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/logs/backup.log"

# Source environment variables if available
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
fi

# Redirect output to log file
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] Starting monthly backup process..."

# Run the backup
cd "$PROJECT_ROOT"
if node scripts/supabase-backup-system.js backup monthly; then
    echo "[$(date)] Monthly backup completed successfully"
    
    # Run test restore
    LATEST_BACKUP=$(find "$SCRIPT_DIR/monthly" -name "*.backup" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$LATEST_BACKUP" ]]; then
        if node scripts/backup-validation-system.js test-restore "$LATEST_BACKUP"; then
            echo "[$(date)] Monthly backup restore test passed"
        else
            echo "[$(date)] Monthly backup restore test failed"
        fi
    fi
else
    echo "[$(date)] Monthly backup failed"
    exit 1
fi

echo "[$(date)] Monthly backup process finished"
EOF

    # Monitoring wrapper
    cat > "$BACKUP_DIR/run-monitoring.sh" << 'EOF'
#!/bin/bash

# Monitoring Wrapper Script for CreditAI
# This script is executed by cron for monitoring checks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/logs/monitoring.log"

# Source environment variables if available
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
fi

# Redirect output to log file
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] Starting monitoring check..."

# Run monitoring
cd "$PROJECT_ROOT"
if node scripts/backup-monitoring-system.js monitor; then
    echo "[$(date)] Monitoring check completed - system healthy"
else
    echo "[$(date)] Monitoring check detected issues"
fi

echo "[$(date)] Monitoring check finished"
EOF

    # Cleanup wrapper
    cat > "$BACKUP_DIR/run-cleanup.sh" << 'EOF'
#!/bin/bash

# Cleanup Wrapper Script for CreditAI
# This script is executed by cron for periodic cleanup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/logs/backup.log"

# Source environment variables if available
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
fi

# Redirect output to log file
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] Starting cleanup process..."

# Run cleanup for each backup type
cd "$PROJECT_ROOT"
for backup_type in daily weekly monthly; do
    if node scripts/supabase-backup-system.js cleanup "$backup_type"; then
        echo "[$(date)] Cleanup completed for $backup_type backups"
    else
        echo "[$(date)] Cleanup failed for $backup_type backups"
    fi
done

# Clean up old log files (keep 30 days)
find "$SCRIPT_DIR/logs" -name "*.log" -mtime +30 -exec rm {} \;

echo "[$(date)] Cleanup process finished"
EOF

    # Make scripts executable
    chmod +x "$BACKUP_DIR"/run-*.sh

    log "Wrapper scripts created successfully"
}

# =============================================
# 4. SETUP CRON JOBS
# =============================================

setup_cron_jobs() {
    log "Setting up cron jobs for user: $CRON_USER"

    # Create temporary cron file
    local temp_cron=$(mktemp)
    
    # Get existing cron jobs (if any)
    crontab -l > "$temp_cron" 2>/dev/null || true

    # Remove existing CreditAI backup jobs
    sed -i '/# CreditAI Backup/d' "$temp_cron"
    sed -i '/run-.*-backup\.sh/d' "$temp_cron"
    sed -i '/run-monitoring\.sh/d' "$temp_cron"
    sed -i '/run-cleanup\.sh/d' "$temp_cron"

    # Add new cron jobs
    cat >> "$temp_cron" << EOF

# CreditAI Backup System Jobs
# Generated on $(date)

# Daily backup at 2:00 AM
0 2 * * * $BACKUP_DIR/run-daily-backup.sh

# Weekly backup on Sundays at 3:00 AM
0 3 * * 0 $BACKUP_DIR/run-weekly-backup.sh

# Monthly backup on the 1st of each month at 4:00 AM
0 4 1 * * $BACKUP_DIR/run-monthly-backup.sh

# Monitoring checks every 15 minutes
*/15 * * * * $BACKUP_DIR/run-monitoring.sh

# Cleanup old backups daily at 5:00 AM
0 5 * * * $BACKUP_DIR/run-cleanup.sh

EOF

    # Install the cron jobs
    if crontab "$temp_cron"; then
        log "Cron jobs installed successfully"
    else
        error "Failed to install cron jobs"
        rm "$temp_cron"
        exit 1
    fi

    # Clean up
    rm "$temp_cron"

    # Display installed cron jobs
    info "Installed cron jobs:"
    crontab -l | grep -A 10 "CreditAI Backup"
}

# =============================================
# 5. SETUP SYSTEMD SERVICE (OPTIONAL)
# =============================================

setup_systemd_service() {
    if [[ "$EUID" -ne 0 ]]; then
        warning "Skipping systemd service setup (requires root)"
        return
    fi

    log "Setting up systemd service for backup monitoring..."

    # Create systemd service file
    cat > /etc/systemd/system/creditai-backup-monitor.service << EOF
[Unit]
Description=CreditAI Backup Monitoring Service
After=network.target

[Service]
Type=simple
User=$CRON_USER
WorkingDirectory=$PROJECT_ROOT
Environment=NODE_ENV=production
EnvironmentFile=-$PROJECT_ROOT/.env.local
ExecStart=/usr/bin/node $PROJECT_ROOT/scripts/backup-monitoring-system.js monitor
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
EOF

    # Create systemd timer for regular monitoring
    cat > /etc/systemd/system/creditai-backup-monitor.timer << EOF
[Unit]
Description=Run CreditAI Backup Monitoring every 15 minutes
Requires=creditai-backup-monitor.service

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Reload systemd and enable services
    systemctl daemon-reload
    systemctl enable creditai-backup-monitor.timer
    systemctl start creditai-backup-monitor.timer

    log "Systemd service setup completed"
}

# =============================================
# 6. CREATE CONFIGURATION FILE
# =============================================

create_config_file() {
    log "Creating backup configuration file..."

    cat > "$BACKUP_DIR/backup-config.env" << EOF
# CreditAI Backup System Configuration
# Generated on $(date)

# Backup directories
BACKUP_BASE_DIR=$BACKUP_DIR
DAILY_RETENTION=7
WEEKLY_RETENTION=28
MONTHLY_RETENTION=365

# Monitoring settings
MONITOR_INTERVAL=900
MAX_BACKUP_AGE_HOURS=25
MIN_BACKUP_SIZE_MB=1
MAX_DISK_USAGE_PERCENT=85
MIN_SUCCESS_RATE_PERCENT=95

# Alert configuration (customize these)
BACKUP_ALERT_EMAIL=${BACKUP_ALERT_EMAIL:-admin@example.com}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
BACKUP_WEBHOOK_URL=${BACKUP_WEBHOOK_URL:-}
SMS_API_KEY=${SMS_API_KEY:-}
ALERT_SMS_NUMBERS=${ALERT_SMS_NUMBERS:-}

# Escalation settings
ESCALATION_TIMEOUT=60
CRITICAL_ESCALATION_NUMBERS=${CRITICAL_ESCALATION_NUMBERS:-}

# Database settings (from environment)
SUPABASE_DB_URL=$SUPABASE_DB_URL
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

EOF

    chmod 600 "$BACKUP_DIR/backup-config.env"
    
    log "Configuration file created at: $BACKUP_DIR/backup-config.env"
    warning "Please review and customize the configuration file, especially alert settings"
}

# =============================================
# 7. TEST BACKUP SYSTEM
# =============================================

test_backup_system() {
    log "Testing backup system..."

    # Test environment
    info "Testing environment..."
    cd "$PROJECT_ROOT"
    
    if node -e "console.log('Node.js test passed')"; then
        log "Node.js test passed"
    else
        error "Node.js test failed"
        return 1
    fi

    # Test backup script
    info "Testing backup script..."
    if node scripts/supabase-backup-system.js --help > /dev/null; then
        log "Backup script test passed"
    else
        error "Backup script test failed"
        return 1
    fi

    # Test validation script
    info "Testing validation script..."
    if node scripts/backup-validation-system.js --help > /dev/null; then
        log "Validation script test passed"
    else
        error "Validation script test failed"
        return 1
    fi

    # Test monitoring script
    info "Testing monitoring script..."
    if node scripts/backup-monitoring-system.js --help > /dev/null; then
        log "Monitoring script test passed"
    else
        error "Monitoring script test failed"
        return 1
    fi

    # Test wrapper scripts
    info "Testing wrapper scripts..."
    if [[ -x "$BACKUP_DIR/run-daily-backup.sh" ]]; then
        log "Daily backup wrapper is executable"
    else
        error "Daily backup wrapper is not executable"
        return 1
    fi

    log "Backup system tests completed successfully"
}

# =============================================
# 8. GENERATE SETUP REPORT
# =============================================

generate_setup_report() {
    log "Generating setup report..."

    local report_file="$BACKUP_DIR/setup-report.md"

    cat > "$report_file" << EOF
# CreditAI Backup System Setup Report

Generated on: $(date)

## System Information
- User: $(whoami)
- Hostname: $(hostname)
- OS: $(uname -s) $(uname -r)
- Node.js Version: $(node --version)
- Project Root: $PROJECT_ROOT
- Backup Directory: $BACKUP_DIR

## Installed Components

### Scripts
- ✅ Supabase Backup System: \`scripts/supabase-backup-system.js\`
- ✅ Backup Validation System: \`scripts/backup-validation-system.js\`
- ✅ Backup Monitoring System: \`scripts/backup-monitoring-system.js\`

### Wrapper Scripts
- ✅ Daily Backup: \`$BACKUP_DIR/run-daily-backup.sh\`
- ✅ Weekly Backup: \`$BACKUP_DIR/run-weekly-backup.sh\`
- ✅ Monthly Backup: \`$BACKUP_DIR/run-monthly-backup.sh\`
- ✅ Monitoring: \`$BACKUP_DIR/run-monitoring.sh\`
- ✅ Cleanup: \`$BACKUP_DIR/run-cleanup.sh\`

### Directories
- ✅ Daily Backups: \`$BACKUP_DIR/daily/\`
- ✅ Weekly Backups: \`$BACKUP_DIR/weekly/\`
- ✅ Monthly Backups: \`$BACKUP_DIR/monthly/\`
- ✅ Logs: \`$LOG_DIR/\`

### Cron Jobs
\`\`\`
$(crontab -l | grep -A 10 "CreditAI Backup" || echo "No cron jobs found")
\`\`\`

## Configuration
Configuration file: \`$BACKUP_DIR/backup-config.env\`

Key settings to review:
- Alert email address
- Slack webhook URL
- SMS alert numbers
- Retention policies

## Next Steps

1. **Customize Configuration**
   \`\`\`bash
   nano $BACKUP_DIR/backup-config.env
   \`\`\`

2. **Test Manual Backup**
   \`\`\`bash
   cd $PROJECT_ROOT
   node scripts/supabase-backup-system.js backup daily
   \`\`\`

3. **Test Monitoring**
   \`\`\`bash
   cd $PROJECT_ROOT
   node scripts/backup-monitoring-system.js monitor
   \`\`\`

4. **Test Alert System**
   \`\`\`bash
   cd $PROJECT_ROOT
   node scripts/backup-monitoring-system.js alert-test medium
   \`\`\`

5. **Validate Backups**
   \`\`\`bash
   cd $PROJECT_ROOT
   node scripts/backup-validation-system.js integrity-check $BACKUP_DIR
   \`\`\`

## Documentation
- Disaster Recovery Procedures: \`docs/DISASTER_RECOVERY_PROCEDURES.md\`
- Backup System Documentation: \`scripts/supabase-backup-system.js\` (header comments)

## Support
For issues or questions:
1. Check log files in \`$LOG_DIR/\`
2. Review the disaster recovery documentation
3. Test individual components manually
4. Contact the development team

---
Setup completed successfully! 🎉
EOF

    log "Setup report generated: $report_file"
}

# =============================================
# MAIN EXECUTION
# =============================================

main() {
    echo
    echo "========================================"
    echo "CreditAI Backup System Setup"
    echo "========================================"
    echo

    # Check command line arguments
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        cat << EOF
CreditAI Backup System Setup Script

Usage: $0 [options]

Options:
  --help, -h          Show this help message
  --skip-cron         Skip cron job setup
  --skip-systemd      Skip systemd service setup
  --skip-test         Skip system testing
  --force             Force setup even if already configured

Environment Variables:
  BACKUP_BASE_DIR     Base directory for backups (default: ./backups)
  BACKUP_CRON_USER    User for cron jobs (default: current user)
  BACKUP_ALERT_EMAIL  Email for alerts

Examples:
  $0                  # Full setup with defaults
  $0 --skip-cron      # Setup without cron jobs
  $0 --skip-systemd   # Setup without systemd services

EOF
        exit 0
    fi

    # Parse command line arguments
    local skip_cron=false
    local skip_systemd=false
    local skip_test=false
    local force=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-cron)
                skip_cron=true
                shift
                ;;
            --skip-systemd)
                skip_systemd=true
                shift
                ;;
            --skip-test)
                skip_test=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Check if already configured
    if [[ -f "$BACKUP_DIR/setup-report.md" && "$force" != true ]]; then
        warning "Backup system appears to be already configured"
        info "Found existing setup report: $BACKUP_DIR/setup-report.md"
        info "Use --force to override existing configuration"
        exit 1
    fi

    # Run setup steps
    validate_environment
    setup_directories
    create_wrapper_scripts
    create_config_file

    if [[ "$skip_cron" != true ]]; then
        setup_cron_jobs
    else
        warning "Skipped cron job setup"
    fi

    if [[ "$skip_systemd" != true ]]; then
        setup_systemd_service
    else
        info "Skipped systemd service setup"
    fi

    if [[ "$skip_test" != true ]]; then
        test_backup_system
    else
        warning "Skipped system testing"
    fi

    generate_setup_report

    echo
    log "🎉 CreditAI Backup System setup completed successfully!"
    echo
    info "Next steps:"
    info "1. Review configuration: $BACKUP_DIR/backup-config.env"
    info "2. Test manual backup: node scripts/supabase-backup-system.js backup daily"
    info "3. Check setup report: $BACKUP_DIR/setup-report.md"
    echo
    warning "Important: Configure alert settings in the configuration file!"
    echo
}

# Run main function with all arguments
main "$@"