#!/bin/bash

# =============================================
# CreditAI Application Security Deployment Script
# Deploys security configurations for production environment
# =============================================

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
BACKUP_DIR="$PROJECT_ROOT/security-backups/$(date +%Y%m%d_%H%M%S)"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root (shouldn't be)
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $node_version -lt 18 ]]; then
        error "Node.js version 18 or higher is required"
    fi
    
    # Check if we're in the correct directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "Not in a valid CreditAI project directory"
    fi
    
    # Check if .env.local exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error ".env.local file not found. Copy from .env.example and configure."
    fi
    
    log "Environment validation passed"
}

# Generate secure encryption keys
generate_encryption_keys() {
    log "Generating encryption keys..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate master encryption key (256-bit)
    local encryption_key=$(openssl rand -base64 32)
    
    # Generate secondary encryption key for rotation
    local secondary_key=$(openssl rand -base64 32)
    
    # Generate JWT secret
    local jwt_secret=$(openssl rand -base64 64)
    
    # Generate hash salt
    local hash_salt=$(openssl rand -base64 32)
    
    # Generate API key salt
    local api_salt=$(openssl rand -base64 32)
    
    # Backup existing .env.local if it exists
    if [[ -f "$ENV_FILE" ]]; then
        cp "$ENV_FILE" "$BACKUP_DIR/.env.local.backup"
        info "Backed up existing .env.local to $BACKUP_DIR"
    fi
    
    # Update environment file with new keys
    {
        echo "# Security Keys - Generated $(date)"
        echo "ENCRYPTION_KEY=$encryption_key"
        echo "SECONDARY_ENCRYPTION_KEY=$secondary_key"
        echo "JWT_SECRET=$jwt_secret"
        echo "NEXTAUTH_SECRET=$jwt_secret"
        echo "HASH_SALT=$hash_salt"
        echo "API_KEY_SALT=$api_salt"
        echo "LAST_KEY_ROTATION_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo ""
    } >> "$ENV_FILE.new"
    
    # Append existing non-security configs
    if [[ -f "$ENV_FILE" ]]; then
        grep -v -E '^(ENCRYPTION_KEY|SECONDARY_ENCRYPTION_KEY|JWT_SECRET|NEXTAUTH_SECRET|HASH_SALT|API_KEY_SALT|LAST_KEY_ROTATION_DATE)=' "$ENV_FILE" >> "$ENV_FILE.new" || true
    fi
    
    mv "$ENV_FILE.new" "$ENV_FILE"
    
    # Set secure permissions
    chmod 600 "$ENV_FILE"
    
    # Store keys securely (for backup)
    {
        echo "CreditAI Security Keys - $(date)"
        echo "======================================"
        echo "ENCRYPTION_KEY=$encryption_key"
        echo "SECONDARY_ENCRYPTION_KEY=$secondary_key"
        echo "JWT_SECRET=$jwt_secret"
        echo "HASH_SALT=$hash_salt"
        echo "API_KEY_SALT=$api_salt"
        echo "Generated on: $(date)"
        echo "Server: $(hostname)"
    } > "$BACKUP_DIR/encryption_keys.txt"
    
    chmod 600 "$BACKUP_DIR/encryption_keys.txt"
    
    log "Encryption keys generated and configured"
    warn "IMPORTANT: Store the keys in $BACKUP_DIR/encryption_keys.txt in a secure location!"
}

# Configure SSL/TLS
configure_ssl() {
    log "Configuring SSL/TLS settings..."
    
    # Check if running in production
    if grep -q "NODE_ENV=production" "$ENV_FILE"; then
        # Add SSL configuration to environment
        if ! grep -q "SSL_ENABLED" "$ENV_FILE"; then
            {
                echo ""
                echo "# SSL/TLS Configuration"
                echo "SSL_ENABLED=true"
                echo "FORCE_HTTPS=true"
                echo "HSTS_MAX_AGE=31536000"
                echo "SSL_CERT_PATH=/etc/ssl/certs/creditai.crt"
                echo "SSL_KEY_PATH=/etc/ssl/private/creditai.key"
            } >> "$ENV_FILE"
        fi
        
        log "SSL configuration added to environment"
        warn "Configure SSL certificates before starting the application"
    else
        info "Development environment detected - SSL configuration skipped"
    fi
}

# Setup secure headers
configure_security_headers() {
    log "Configuring security headers..."
    
    # Create security headers configuration
    cat > "$PROJECT_ROOT/security-headers.js" << 'EOF'
/**
 * Security Headers Configuration for CreditAI
 * Implements security best practices for web applications
 */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.stripe.com *.google.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: *.stripe.com; connect-src 'self' *.supabase.co *.stripe.com *.google.com; frame-src 'self' *.stripe.com; object-src 'none';"
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  }
]

module.exports = securityHeaders
EOF
    
    log "Security headers configuration created"
}

# Configure rate limiting
configure_rate_limiting() {
    log "Configuring rate limiting..."
    
    # Add rate limiting configuration to environment
    if ! grep -q "RATE_LIMIT_WINDOW" "$ENV_FILE"; then
        {
            echo ""
            echo "# Rate Limiting Configuration"
            echo "RATE_LIMIT_WINDOW=60000"
            echo "RATE_LIMIT_MAX_REQUESTS=100"
            echo "RATE_LIMIT_AUTH_WINDOW=300000"
            echo "RATE_LIMIT_AUTH_MAX_REQUESTS=10"
            echo "RATE_LIMIT_UPLOAD_WINDOW=3600000"
            echo "RATE_LIMIT_UPLOAD_MAX_REQUESTS=20"
        } >> "$ENV_FILE"
    fi
    
    log "Rate limiting configuration added"
}

# Setup file upload security
configure_file_security() {
    log "Configuring file upload security..."
    
    # Create upload security configuration
    if ! grep -q "MAX_FILE_SIZE" "$ENV_FILE"; then
        {
            echo ""
            echo "# File Upload Security"
            echo "MAX_FILE_SIZE=10485760"  # 10MB
            echo "ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,doc,docx"
            echo "UPLOAD_SCAN_ENABLED=true"
            echo "QUARANTINE_SUSPICIOUS_FILES=true"
            echo "FILE_ENCRYPTION_ENABLED=true"
        } >> "$ENV_FILE"
    fi
    
    # Create secure upload directory with proper permissions
    local upload_dir="$PROJECT_ROOT/uploads"
    mkdir -p "$upload_dir"
    chmod 755 "$upload_dir"
    
    # Create quarantine directory
    local quarantine_dir="$PROJECT_ROOT/quarantine"
    mkdir -p "$quarantine_dir"
    chmod 700 "$quarantine_dir"
    
    log "File upload security configured"
}

# Setup database security
configure_database_security() {
    log "Configuring database security..."
    
    # Run database security deployment
    if [[ -f "$SCRIPT_DIR/deploy-database-security.sql" ]]; then
        info "Database security script found. Run separately with appropriate database privileges."
        warn "Execute: psql -f $SCRIPT_DIR/deploy-database-security.sql"
    fi
    
    # Add database security configuration to environment
    if ! grep -q "DB_SSL_MODE" "$ENV_FILE"; then
        {
            echo ""
            echo "# Database Security"
            echo "DB_SSL_MODE=require"
            echo "DB_CONNECTION_TIMEOUT=10000"
            echo "DB_STATEMENT_TIMEOUT=30000"
            echo "DB_POOL_MAX=20"
            echo "DB_POOL_MIN=5"
            echo "DB_AUDIT_ENABLED=true"
        } >> "$ENV_FILE"
    fi
    
    log "Database security configuration added"
}

# Setup monitoring and alerting
configure_monitoring() {
    log "Configuring security monitoring..."
    
    # Add monitoring configuration
    if ! grep -q "SECURITY_MONITORING_ENABLED" "$ENV_FILE"; then
        {
            echo ""
            echo "# Security Monitoring"
            echo "SECURITY_MONITORING_ENABLED=true"
            echo "FAILED_LOGIN_THRESHOLD=5"
            echo "SUSPICIOUS_ACTIVITY_THRESHOLD=10"
            echo "ALERT_EMAIL="
            echo "ALERT_WEBHOOK_URL="
            echo "LOG_LEVEL=info"
            echo "AUDIT_LOG_RETENTION_DAYS=365"
        } >> "$ENV_FILE"
    fi
    
    log "Security monitoring configured"
}

# Create security checklist
create_security_checklist() {
    log "Creating deployment security checklist..."
    
    cat > "$BACKUP_DIR/security_checklist.md" << 'EOF'
# CreditAI Security Deployment Checklist

## Pre-Production Security Checklist

### Environment Configuration
- [ ] All encryption keys generated and stored securely
- [ ] SSL/TLS certificates installed and configured
- [ ] Environment variables properly set
- [ ] Database connections secured with SSL
- [ ] File upload directories properly secured

### Authentication & Authorization
- [ ] Strong password policies enforced
- [ ] Two-factor authentication enabled
- [ ] Role-based access control (RBAC) implemented
- [ ] Session timeouts configured
- [ ] JWT secrets properly configured

### Data Protection
- [ ] PII encryption enabled
- [ ] Database encryption at rest configured
- [ ] Secure backup procedures implemented
- [ ] Data retention policies configured
- [ ] Audit logging enabled

### Network Security
- [ ] Security headers configured
- [ ] Content Security Policy (CSP) implemented
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] Firewall rules configured

### Monitoring & Alerting
- [ ] Security monitoring enabled
- [ ] Failed login attempt monitoring
- [ ] Suspicious activity detection
- [ ] Log aggregation configured
- [ ] Alert notifications setup

### Compliance
- [ ] GDPR compliance measures implemented
- [ ] CCPA compliance measures implemented
- [ ] SOC 2 requirements addressed
- [ ] Data processing agreements in place
- [ ] Privacy policy updated

### Testing
- [ ] Security scanning completed
- [ ] Penetration testing performed
- [ ] Vulnerability assessment completed
- [ ] Security code review performed
- [ ] Access control testing completed

### Documentation
- [ ] Security procedures documented
- [ ] Incident response plan created
- [ ] Recovery procedures documented
- [ ] User security guidelines created
- [ ] Admin security procedures documented

### Ongoing Security
- [ ] Regular security updates scheduled
- [ ] Key rotation procedures implemented
- [ ] Security training planned
- [ ] Regular security audits scheduled
- [ ] Incident response team identified

## Post-Deployment
- [ ] Security monitoring dashboards configured
- [ ] Backup procedures tested
- [ ] Incident response procedures tested
- [ ] Regular security reviews scheduled
- [ ] Compliance audits scheduled
EOF
    
    log "Security checklist created at $BACKUP_DIR/security_checklist.md"
}

# Validate security configuration
validate_security() {
    log "Validating security configuration..."
    
    local issues=0
    
    # Check encryption keys
    if ! grep -q "ENCRYPTION_KEY=" "$ENV_FILE"; then
        error "Encryption key not found in environment"
        ((issues++))
    fi
    
    # Check JWT secret
    if ! grep -q "JWT_SECRET=" "$ENV_FILE"; then
        error "JWT secret not found in environment"
        ((issues++))
    fi
    
    # Check file permissions
    local env_perms=$(stat -f "%A" "$ENV_FILE" 2>/dev/null || stat -c "%a" "$ENV_FILE" 2>/dev/null)
    if [[ "$env_perms" != "600" ]]; then
        warn "Environment file permissions should be 600 (currently $env_perms)"
    fi
    
    # Check for sensitive data in version control
    if git rev-parse --git-dir > /dev/null 2>&1; then
        if git ls-files | grep -q "\.env\.local"; then
            error ".env.local should not be in version control"
            ((issues++))
        fi
    fi
    
    if [[ $issues -eq 0 ]]; then
        log "Security validation passed"
    else
        error "$issues security issues found"
    fi
}

# Create deployment summary
create_deployment_summary() {
    log "Creating deployment summary..."
    
    cat > "$BACKUP_DIR/deployment_summary.txt" << EOF
CreditAI Security Deployment Summary
===================================

Deployment Date: $(date)
Server: $(hostname)
User: $(whoami)
Project Root: $PROJECT_ROOT

Security Features Deployed:
- Encryption keys generated and configured
- SSL/TLS configuration prepared
- Security headers configured
- Rate limiting enabled
- File upload security configured
- Database security settings added
- Security monitoring enabled

Generated Files:
- Encryption keys: $BACKUP_DIR/encryption_keys.txt
- Security checklist: $BACKUP_DIR/security_checklist.md
- Deployment summary: $BACKUP_DIR/deployment_summary.txt

Next Steps:
1. Review and complete the security checklist
2. Configure SSL certificates for production
3. Set up database roles and permissions
4. Test all security configurations
5. Configure monitoring and alerting
6. Perform security testing

Important Notes:
- Store encryption keys securely and separately from the application
- Regularly rotate encryption keys (recommended: every 90 days)
- Monitor security logs for suspicious activity
- Keep security documentation up to date
- Perform regular security audits

Backup Location: $BACKUP_DIR
EOF
    
    log "Deployment summary created"
}

# Main deployment function
main() {
    log "Starting CreditAI Application Security Deployment..."
    
    check_user
    validate_environment
    generate_encryption_keys
    configure_ssl
    configure_security_headers
    configure_rate_limiting
    configure_file_security
    configure_database_security
    configure_monitoring
    create_security_checklist
    validate_security
    create_deployment_summary
    
    log "Application security deployment completed successfully!"
    info "Review the security checklist at: $BACKUP_DIR/security_checklist.md"
    info "Deployment summary available at: $BACKUP_DIR/deployment_summary.txt"
    warn "IMPORTANT: Secure the encryption keys stored at: $BACKUP_DIR/encryption_keys.txt"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi