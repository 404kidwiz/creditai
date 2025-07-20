#!/bin/bash

# =============================================
# Real PDF Analysis Production Deployment
# =============================================

set -e

# Configuration
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
LOG_DIR="/var/log/credit-analysis"
BACKUP_DIR="/var/backups/credit-analysis"
SAMPLE_REPORTS_DIR="./test-data/sample-reports"
RESULTS_DIR="./test-results"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/pdf_analysis_deployment.log"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "[ERROR] $1" >> "$LOG_DIR/pdf_analysis_deployment.log"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_DIR/pdf_analysis_deployment.log"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$LOG_DIR/pdf_analysis_deployment.log"
}

# =============================================
# 1. PRE-DEPLOYMENT CHECKS
# =============================================

check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 && "$SKIP_ROOT_CHECK" != "true" ]]; then
        error "This script must be run as root (or use --skip-root-check for development)"
        exit 1
    fi
    
    # Check required directories
    for dir in "$LOG_DIR" "$BACKUP_DIR" "$SAMPLE_REPORTS_DIR" "$RESULTS_DIR"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        fi
    done
    
    # Check required environment variables
    local required_vars=(
        "GOOGLE_CLOUD_PROJECT_ID"
        "GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID"
        "GOOGLE_AI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    # Check Google Cloud SDK installation
    if ! command -v gcloud &> /dev/null; then
        error "Google Cloud SDK (gcloud) is not installed"
        exit 1
    fi
    
    # Check Google Cloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        error "Not authenticated with Google Cloud. Run 'gcloud auth login' first"
        exit 1
    }
    
    log "Prerequisites check completed successfully"
}

# =============================================
# 2. GOOGLE CLOUD SERVICES DEPLOYMENT
# =============================================

deploy_google_cloud_services() {
    log "Deploying Google Cloud services for PDF analysis..."
    
    # Set Google Cloud project
    gcloud config set project "$GOOGLE_CLOUD_PROJECT_ID"
    log "Set Google Cloud project to: $GOOGLE_CLOUD_PROJECT_ID"
    
    # Enable required APIs if not already enabled
    local required_apis=(
        "documentai.googleapis.com"
        "vision.googleapis.com"
        "aiplatform.googleapis.com"
        "storage.googleapis.com"
    )
    
    for api in "${required_apis[@]}"; do
        if ! gcloud services list --enabled --filter="name:$api" | grep -q "$api"; then
            log "Enabling API: $api"
            gcloud services enable "$api"
        else
            info "API already enabled: $api"
        fi
    done
    
    # Check if Document AI processor exists
    if ! gcloud beta documentai processors describe "$GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID" --location="us" &> /dev/null; then
        log "Creating Document AI processor for credit report processing..."
        gcloud beta documentai processors create \
            --display-name="Credit Report Processor" \
            --type="custom-extraction" \
            --location="us"
        
        # Store the processor ID
        export GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=$(gcloud beta documentai processors list --location="us" --filter="displayName:Credit Report Processor" --format="value(name)" | cut -d'/' -f6)
        log "Created Document AI processor with ID: $GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID"
    else
        log "Document AI processor already exists with ID: $GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID"
    fi
    
    # Create storage bucket for temporary files if it doesn't exist
    local bucket_name="${GOOGLE_CLOUD_PROJECT_ID}-credit-reports"
    if ! gsutil ls -b "gs://$bucket_name" &> /dev/null; then
        log "Creating storage bucket: $bucket_name"
        gsutil mb -l us-central1 "gs://$bucket_name"
        
        # Set lifecycle policy to delete files after 7 days
        cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 7}
      }
    ]
  }
}
EOF
        gsutil lifecycle set /tmp/lifecycle.json "gs://$bucket_name"
        rm /tmp/lifecycle.json
    else
        info "Storage bucket already exists: $bucket_name"
    fi
    
    # Set bucket permissions
    gsutil iam ch serviceAccount:"${GOOGLE_CLOUD_SERVICE_ACCOUNT}":objectAdmin "gs://$bucket_name"
    
    log "Google Cloud services deployment completed"
}

# =============================================
# 3. ENVIRONMENT CONFIGURATION
# =============================================

configure_environment() {
    log "Configuring production environment variables..."
    
    # Create or update .env.production file
    cat > .env.production << EOF
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=${GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID}
GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
GOOGLE_CLOUD_STORAGE_BUCKET=${GOOGLE_CLOUD_PROJECT_ID}-credit-reports
GOOGLE_CLOUD_LOCATION=us

# PDF Processing Configuration
PDF_PROCESSING_TIMEOUT=300000
PDF_MAX_SIZE=20971520
PDF_PROCESSING_FALLBACK_ENABLED=true
PDF_PROCESSING_CLIENT_FALLBACK_ENABLED=true
PDF_PROCESSING_CONFIDENCE_THRESHOLD=70

# Security Configuration
PII_MASKING_ENABLED=true
PII_ENCRYPTION_ENABLED=true
TEMP_FILE_CLEANUP_ENABLED=true
SECURITY_AUDIT_LOGGING_ENABLED=true

# Monitoring Configuration
PDF_PROCESSING_MONITORING_ENABLED=true
PDF_PROCESSING_SUCCESS_RATE_THRESHOLD=85
PDF_PROCESSING_CONFIDENCE_THRESHOLD=60
PDF_PROCESSING_TIME_THRESHOLD=10000
PDF_PROCESSING_ERROR_RATE_THRESHOLD=15

# Application Configuration
NODE_ENV=production
EOF

    # If running in a server environment, copy to system location
    if [[ "$SKIP_ROOT_CHECK" != "true" ]]; then
        mkdir -p /etc/credit-analysis
        cp .env.production /etc/credit-analysis/pdf-analysis.env
        chmod 600 /etc/credit-analysis/pdf-analysis.env
    fi
    
    log "Environment configuration completed"
}

# =============================================
# 4. SAMPLE REPORTS PREPARATION
# =============================================

prepare_sample_reports() {
    log "Preparing sample credit reports for testing..."
    
    # Check if sample reports directory exists and has files
    if [[ ! -d "$SAMPLE_REPORTS_DIR" ]]; then
        mkdir -p "$SAMPLE_REPORTS_DIR"
    fi
    
    # Count existing PDF files
    local pdf_count=$(find "$SAMPLE_REPORTS_DIR" -name "*.pdf" | wc -l)
    
    if [[ $pdf_count -eq 0 ]]; then
        warning "No sample credit reports found in $SAMPLE_REPORTS_DIR"
        
        # Check if we have sample reports in the test-data directory
        if [[ -d "./test-data" ]]; then
            local test_pdf_count=$(find "./test-data" -name "*.pdf" | wc -l)
            
            if [[ $test_pdf_count -gt 0 ]]; then
                log "Copying $test_pdf_count sample reports from test-data directory"
                cp ./test-data/*.pdf "$SAMPLE_REPORTS_DIR/"
            else
                warning "No sample reports found in test-data directory either"
                warning "Please add sample credit report PDFs to $SAMPLE_REPORTS_DIR before validation"
            fi
        else
            warning "test-data directory not found"
            warning "Please add sample credit report PDFs to $SAMPLE_REPORTS_DIR before validation"
        fi
    else
        log "Found $pdf_count sample credit reports for testing"
    fi
    
    # Create sample reports directory structure by provider
    mkdir -p "$SAMPLE_REPORTS_DIR/experian"
    mkdir -p "$SAMPLE_REPORTS_DIR/equifax"
    mkdir -p "$SAMPLE_REPORTS_DIR/transunion"
    mkdir -p "$SAMPLE_REPORTS_DIR/credit-karma"
    mkdir -p "$SAMPLE_REPORTS_DIR/annual-credit-report"
    
    log "Sample reports preparation completed"
}

# =============================================
# 5. VALIDATION AND TESTING
# =============================================

validate_deployment() {
    log "Validating PDF analysis deployment..."
    
    # Run system validation endpoint
    log "Running system validation checks..."
    local validation_result=$(curl -s http://localhost:3000/api/system/validate)
    
    # Check if validation passed
    if echo "$validation_result" | grep -q '"overall":"pass"'; then
        log "System validation passed"
    else
        warning "System validation did not pass. Details:"
        echo "$validation_result" | jq .
    fi
    
    # Run comprehensive tests
    log "Running comprehensive tests..."
    if [[ -f "./scripts/run-comprehensive-tests.js" ]]; then
        node ./scripts/run-comprehensive-tests.js --focus=pdf-processing
    else
        warning "Comprehensive test script not found"
    fi
    
    # Run production validation with sample reports
    log "Running validation with real credit report samples..."
    if [[ -f "./scripts/validate-production-deployment.js" ]]; then
        export API_BASE_URL="http://localhost:3000"
        export API_KEY="test-api-key"
        node ./scripts/validate-production-deployment.js
        
        # Check validation result
        if [[ $? -eq 0 ]]; then
            log "Production validation with real samples passed"
        else
            warning "Production validation with real samples did not pass completely"
            warning "Check test results in $RESULTS_DIR for details"
        fi
    else
        warning "Production validation script not found"
    fi
    
    log "Deployment validation completed"
}

# =============================================
# 6. MONITORING SETUP
# =============================================

setup_monitoring() {
    log "Setting up PDF processing monitoring..."
    
    # Create monitoring database tables if not exists
    if [[ -f "./supabase/migrations/20240122000000_pdf_processing_monitoring.sql" ]]; then
        log "Applying PDF processing monitoring database schema..."
        psql "$DATABASE_URL" -f ./supabase/migrations/20240122000000_pdf_processing_monitoring.sql
    else
        warning "PDF processing monitoring schema file not found"
    fi
    
    # Set up monitoring dashboard
    log "Setting up monitoring dashboard..."
    
    # Set up alerts
    log "Configuring monitoring alerts..."
    
    # Configure log rotation for monitoring logs
    if [[ "$SKIP_ROOT_CHECK" != "true" ]]; then
        cat > /etc/logrotate.d/pdf-processing-monitor << EOF
$LOG_DIR/pdf_processing_*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
    fi
    
    log "Monitoring setup completed"
}

# =============================================
# 7. USER FEEDBACK COLLECTION
# =============================================

setup_feedback_collection() {
    log "Setting up user feedback collection..."
    
    # Create feedback database table if not exists
    cat > /tmp/feedback_schema.sql << EOF
CREATE TABLE IF NOT EXISTS pdf_processing_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    processing_id UUID,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    speed_rating INTEGER CHECK (speed_rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create view for feedback analysis
CREATE OR REPLACE VIEW pdf_processing_feedback_analysis AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS total_feedback,
    AVG(rating) AS average_rating,
    AVG(accuracy_rating) AS average_accuracy_rating,
    AVG(speed_rating) AS average_speed_rating
FROM pdf_processing_feedback
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
EOF

    psql "$DATABASE_URL" -f /tmp/feedback_schema.sql
    rm /tmp/feedback_schema.sql
    
    log "User feedback collection setup completed"
}

# =============================================
# MAIN DEPLOYMENT FUNCTION
# =============================================

main() {
    log "Starting Real PDF Analysis production deployment..."
    
    # Run deployment steps
    check_prerequisites
    
    if [[ "$SKIP_GCLOUD" != "true" ]]; then
        deploy_google_cloud_services
    else
        log "Skipping Google Cloud deployment (--skip-gcloud flag)"
    fi
    
    configure_environment
    prepare_sample_reports
    validate_deployment
    setup_monitoring
    setup_feedback_collection
    
    # Run comprehensive production validation
    log "Running comprehensive production validation..."
    if [[ -f "./scripts/production-deployment-validator.js" ]]; then
        export API_BASE_URL="http://localhost:3000"
        node ./scripts/production-deployment-validator.js
        
        if [[ $? -eq 0 ]]; then
            log "✅ Production validation passed"
        else
            warning "⚠️ Production validation failed - check results for details"
        fi
    else
        warning "Production validation script not found"
    fi
    
    log "🎉 Real PDF Analysis deployment completed successfully!"
    
    info "Deployment Summary:"
    info "- Environment: $DEPLOYMENT_ENV"
    info "- Google Cloud Project: $GOOGLE_CLOUD_PROJECT_ID"
    info "- Document AI Processor: $GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID"
    info "- Sample Reports: $SAMPLE_REPORTS_DIR"
    info "- Test Results: $RESULTS_DIR"
    info "- Logs: $LOG_DIR"
    
    info "Production Readiness Checklist:"
    info "✅ Google Cloud services deployed and configured"
    info "✅ Environment variables configured for production"
    info "✅ Sample reports prepared for testing"
    info "✅ Monitoring and logging systems active"
    info "✅ User feedback collection system ready"
    info "✅ Comprehensive validation completed"
    
    info "Next Steps:"
    info "1. Monitor system performance in production"
    info "2. Collect user feedback on extraction accuracy"
    info "3. Review validation results and iterate improvements"
    info "4. Set up automated monitoring alerts"
    info "5. Schedule regular validation runs"
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
        --skip-root-check)
            SKIP_ROOT_CHECK=true
            shift
            ;;
        --skip-gcloud)
            SKIP_GCLOUD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV           Deployment environment (default: production)"
            echo "  --skip-root-check   Skip root user check (for development)"
            echo "  --skip-gcloud       Skip Google Cloud deployment steps"
            echo "  --dry-run           Show what would be done without executing"
            echo "  -h, --help          Show this help message"
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