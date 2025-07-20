#!/bin/bash

# =============================================
# Enhanced Services Production Deployment
# Credit Analysis and EOSCAR System
# =============================================

set -e

# Configuration
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
LOG_DIR="/var/log/credit-analysis"
SERVICE_DIR="/opt/credit-analysis"
BACKUP_DIR="/var/backups/credit-analysis"
NGINX_CONF_DIR="/etc/nginx/sites-available"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/deployment.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "[ERROR] $1" >> "$LOG_DIR/deployment.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_DIR/deployment.log"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$LOG_DIR/deployment.log"
}

# =============================================
# 1. PRE-DEPLOYMENT CHECKS
# =============================================

check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
    
    # Check required directories
    for dir in "$LOG_DIR" "$SERVICE_DIR" "$BACKUP_DIR"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        fi
    done
    
    # Check required services
    local required_services=("postgresql" "redis-server" "nginx" "node")
    for service in "${required_services[@]}"; do
        if ! command -v "$service" &> /dev/null && ! systemctl is-active --quiet "$service"; then
            error "Required service not found or not running: $service"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=("DATABASE_URL" "REDIS_URL" "GOOGLE_AI_API_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    log "Prerequisites check completed successfully"
}

# =============================================
# 2. DATABASE DEPLOYMENT
# =============================================

deploy_database() {
    log "Deploying enhanced database schema..."
    
    # Create backup before deployment
    local backup_file="$BACKUP_DIR/pre_deployment_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump "$DATABASE_URL" > "$backup_file"
    log "Database backup created: $backup_file"
    
    # Run database migrations
    if [[ -f "scripts/deploy-production-database.sql" ]]; then
        psql "$DATABASE_URL" -f scripts/deploy-production-database.sql
        log "Production database schema deployed"
    else
        error "Database deployment script not found"
        exit 1
    fi
    
    # Run data migration
    if [[ -f "scripts/migrate-to-production.sql" ]]; then
        psql "$DATABASE_URL" -f scripts/migrate-to-production.sql
        log "Data migration completed"
    else
        warning "Data migration script not found, skipping"
    fi
    
    # Optimize database performance
    if [[ -f "scripts/optimize-database-performance.sql" ]]; then
        psql "$DATABASE_URL" -f scripts/optimize-database-performance.sql
        log "Database performance optimization applied"
    else
        warning "Database optimization script not found, skipping"
    fi
    
    log "Database deployment completed"
}

# =============================================
# 3. APPLICATION DEPLOYMENT
# =============================================

deploy_application() {
    log "Deploying enhanced application services..."
    
    # Stop existing services
    systemctl stop credit-analysis || true
    
    # Create application directory structure
    mkdir -p "$SERVICE_DIR"/{app,logs,config,temp}
    
    # Copy application files
    cp -r . "$SERVICE_DIR/app/"
    chown -R www-data:www-data "$SERVICE_DIR"
    
    # Install dependencies
    cd "$SERVICE_DIR/app"
    npm ci --production
    npm run build
    
    # Create systemd service file
    cat > /etc/systemd/system/credit-analysis.service << EOF
[Unit]
Description=Credit Analysis and EOSCAR System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$SERVICE_DIR/app
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/etc/credit-analysis/environment

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$SERVICE_DIR $LOG_DIR

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    # Create environment file
    mkdir -p /etc/credit-analysis
    cat > /etc/credit-analysis/environment << EOF
DATABASE_URL=$DATABASE_URL
REDIS_URL=$REDIS_URL
GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
LOG_LEVEL=info
MAX_WORKERS=4
CACHE_TTL=3600
EOF

    chmod 600 /etc/credit-analysis/environment
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable credit-analysis
    systemctl start credit-analysis
    
    # Wait for service to start
    sleep 10
    
    if systemctl is-active --quiet credit-analysis; then
        log "Application service started successfully"
    else
        error "Application service failed to start"
        systemctl status credit-analysis
        exit 1
    fi
}

# =============================================
# 4. NGINX CONFIGURATION
# =============================================

configure_nginx() {
    log "Configuring Nginx reverse proxy..."
    
    # Create Nginx configuration
    cat > "$NGINX_CONF_DIR/credit-analysis" << 'EOF'
# Credit Analysis and EOSCAR System - Nginx Configuration

upstream credit_analysis_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (update with your certificates)
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';";
    
    # Logging
    access_log /var/log/nginx/credit-analysis.access.log;
    error_log /var/log/nginx/credit-analysis.error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files
    location /_next/static/ {
        alias /opt/credit-analysis/app/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /static/ {
        alias /opt/credit-analysis/app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://credit_analysis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # File upload endpoints with special rate limiting
    location /api/upload {
        limit_req zone=upload burst=5 nodelay;
        
        client_max_body_size 50M;
        
        proxy_pass http://credit_analysis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for file processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Main application
    location / {
        proxy_pass http://credit_analysis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://credit_analysis_backend/health;
        proxy_set_header Host $host;
    }
}
EOF

    # Enable site
    ln -sf "$NGINX_CONF_DIR/credit-analysis" /etc/nginx/sites-enabled/
    
    # Test configuration
    if nginx -t; then
        systemctl reload nginx
        log "Nginx configuration applied successfully"
    else
        error "Nginx configuration test failed"
        exit 1
    fi
}

# =============================================
# 5. MONITORING AND LOGGING SETUP
# =============================================

setup_monitoring() {
    log "Setting up monitoring and logging..."
    
    # Create log rotation configuration
    cat > /etc/logrotate.d/credit-analysis << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload credit-analysis
    endscript
}

/var/log/nginx/credit-analysis.*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF

    # Create monitoring script
    cat > /usr/local/bin/credit-analysis-monitor.sh << 'EOF'
#!/bin/bash

# Credit Analysis System Monitor
LOG_FILE="/var/log/credit-analysis/monitor.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check application health
check_app_health() {
    if ! systemctl is-active --quiet credit-analysis; then
        log "ERROR: Credit Analysis service is not running"
        echo "Credit Analysis service is down" | mail -s "Service Alert: Application Down" "$ALERT_EMAIL" 2>/dev/null || true
        return 1
    fi
    
    # Check HTTP health endpoint
    if ! curl -f -s http://localhost:3000/health > /dev/null; then
        log "ERROR: Application health check failed"
        echo "Credit Analysis application health check failed" | mail -s "Service Alert: Health Check Failed" "$ALERT_EMAIL" 2>/dev/null || true
        return 1
    fi
    
    return 0
}

# Check database connectivity
check_database() {
    if ! pg_isready -q; then
        log "ERROR: Database is not accessible"
        echo "Database connectivity issue detected" | mail -s "Service Alert: Database Down" "$ALERT_EMAIL" 2>/dev/null || true
        return 1
    fi
    
    return 0
}

# Check Redis connectivity
check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        log "ERROR: Redis is not accessible"
        echo "Redis connectivity issue detected" | mail -s "Service Alert: Redis Down" "$ALERT_EMAIL" 2>/dev/null || true
        return 1
    fi
    
    return 0
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ "$usage" -gt 85 ]]; then
        log "WARNING: Disk usage is high: ${usage}%"
        echo "Disk usage is high: ${usage}%" | mail -s "Service Alert: High Disk Usage" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Check memory usage
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ "$usage" -gt 90 ]]; then
        log "WARNING: Memory usage is high: ${usage}%"
        echo "Memory usage is high: ${usage}%" | mail -s "Service Alert: High Memory Usage" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Main monitoring function
main() {
    log "Starting system health check..."
    
    local errors=0
    
    check_app_health || ((errors++))
    check_database || ((errors++))
    check_redis || ((errors++))
    check_disk_space
    check_memory
    
    if [[ $errors -eq 0 ]]; then
        log "All health checks passed"
    else
        log "Health check completed with $errors errors"
    fi
}

main "$@"
EOF

    chmod +x /usr/local/bin/credit-analysis-monitor.sh
    
    # Add monitoring to cron
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/credit-analysis-monitor.sh") | crontab -
    
    log "Monitoring and logging setup completed"
}

# =============================================
# 6. SECURITY CONFIGURATION
# =============================================

configure_security() {
    log "Configuring security settings..."
    
    # Configure firewall
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Secure file permissions
    chmod 600 /etc/credit-analysis/environment
    chown root:root /etc/credit-analysis/environment
    
    # Configure fail2ban for additional security
    if command -v fail2ban-server &> /dev/null; then
        cat > /etc/fail2ban/jail.d/credit-analysis.conf << EOF
[nginx-req-limit]
enabled = true
filter = nginx-req-limit
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/credit-analysis.error.log
findtime = 600
bantime = 7200
maxretry = 10
EOF

        systemctl restart fail2ban
        log "Fail2ban configured for additional security"
    fi
    
    log "Security configuration completed"
}

# =============================================
# 7. EXTERNAL INTEGRATIONS SETUP
# =============================================

setup_integrations() {
    log "Setting up external integrations..."
    
    # CFPB Integration setup
    if [[ -n "$CFPB_API_KEY" ]]; then
        log "CFPB integration configured"
    else
        warning "CFPB API key not provided, regulatory features will be limited"
    fi
    
    # Bureau integration setup (placeholder)
    log "Bureau integration endpoints configured"
    
    # Email service setup
    if [[ -n "$SMTP_HOST" ]]; then
        log "Email service configured"
    else
        warning "SMTP not configured, email notifications will be disabled"
    fi
    
    log "External integrations setup completed"
}

# =============================================
# 8. DEPLOYMENT VALIDATION
# =============================================

validate_deployment() {
    log "Validating deployment..."
    
    local validation_errors=0
    
    # Check service status
    if ! systemctl is-active --quiet credit-analysis; then
        error "Credit Analysis service is not running"
        ((validation_errors++))
    fi
    
    if ! systemctl is-active --quiet nginx; then
        error "Nginx service is not running"
        ((validation_errors++))
    fi
    
    # Check HTTP endpoints
    local endpoints=(
        "http://localhost:3000/health"
        "http://localhost:3000/api/health"
        "http://localhost/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if ! curl -f -s "$endpoint" > /dev/null; then
            error "Endpoint check failed: $endpoint"
            ((validation_errors++))
        fi
    done
    
    # Check database connectivity
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Database connectivity check failed"
        ((validation_errors++))
    fi
    
    # Check Redis connectivity
    if ! redis-cli ping > /dev/null 2>&1; then
        error "Redis connectivity check failed"
        ((validation_errors++))
    fi
    
    # Run application-specific health checks
    if curl -f -s http://localhost:3000/api/system/validate > /dev/null; then
        log "Application validation checks passed"
    else
        warning "Application validation checks failed or not available"
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log "Deployment validation completed successfully"
        return 0
    else
        error "Deployment validation failed with $validation_errors errors"
        return 1
    fi
}

# =============================================
# 9. POST-DEPLOYMENT TASKS
# =============================================

post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    # Warm up caches
    curl -s http://localhost:3000/api/warmup > /dev/null || true
    
    # Initialize system data
    curl -s -X POST http://localhost:3000/api/system/initialize > /dev/null || true
    
    # Create initial admin user if needed
    if [[ -n "$ADMIN_EMAIL" ]]; then
        curl -s -X POST http://localhost:3000/api/admin/initialize \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$ADMIN_EMAIL\"}" > /dev/null || true
    fi
    
    # Send deployment notification
    if [[ -n "$DEPLOYMENT_WEBHOOK" ]]; then
        curl -s -X POST "$DEPLOYMENT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Credit Analysis system deployed successfully to $DEPLOYMENT_ENV\"}" > /dev/null || true
    fi
    
    log "Post-deployment tasks completed"
}

# =============================================
# MAIN DEPLOYMENT FUNCTION
# =============================================

main() {
    log "Starting enhanced services deployment for $DEPLOYMENT_ENV environment..."
    
    # Run deployment steps
    check_prerequisites
    deploy_database
    deploy_application
    configure_nginx
    setup_monitoring
    configure_security
    setup_integrations
    
    # Validate deployment
    if validate_deployment; then
        post_deployment_tasks
        log "🎉 Enhanced services deployment completed successfully!"
        
        info "Deployment Summary:"
        info "- Environment: $DEPLOYMENT_ENV"
        info "- Application: https://your-domain.com"
        info "- Health Check: https://your-domain.com/health"
        info "- Logs: $LOG_DIR"
        info "- Service: systemctl status credit-analysis"
        
    else
        error "Deployment validation failed. Please check the logs and fix issues."
        exit 1
    fi
}

# =============================================
# SCRIPT EXECUTION
# =============================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            DEPLOYMENT_ENV="$2"
            shift 2
            ;;
        --skip-db)
            SKIP_DATABASE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV        Deployment environment (default: production)"
            echo "  --skip-db        Skip database deployment"
            echo "  --dry-run        Show what would be done without executing"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run deployment
if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN MODE - No changes will be made"
    log "Would deploy to environment: $DEPLOYMENT_ENV"
    log "Would run all deployment steps..."
else
    main
fi