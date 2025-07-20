# CreditAI Automated Infrastructure Setup Guide

This guide provides comprehensive instructions for setting up the CreditAI infrastructure using the automated deployment scripts.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup Process](#detailed-setup-process)
4. [Configuration Management](#configuration-management)
5. [Validation and Testing](#validation-and-testing)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

## Prerequisites

### Required Tools

Before starting, ensure you have the following tools installed:

#### 1. Node.js (18.x or higher)
```bash
# Check version
node --version

# Install via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 2. Google Cloud CLI
```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from: https://cloud.google.com/sdk/docs/install

# Verify installation
gcloud --version
```

#### 3. Docker Desktop
```bash
# macOS
brew install --cask docker

# Linux (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Windows
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
```

#### 4. Git
```bash
# Most systems
git --version

# If not installed:
# macOS: brew install git
# Linux: sudo apt-get install git
# Windows: https://git-scm.com/download/win
```

### Optional Tools

#### Supabase CLI (for local development)
```bash
npm install -g supabase
```

### Account Setup

#### 1. Google Cloud Account
1. Create a Google Cloud account at https://cloud.google.com
2. Enable billing for your account
3. Accept terms of service

#### 2. Supabase Account
1. Create a Supabase account at https://supabase.com
2. Note your project URL and API keys

## Quick Start

For users who want to get up and running quickly:

### 1. Clone and Setup
```bash
git clone <your-creditai-repo>
cd creditai
npm install
```

### 2. Run Master Deployment
```bash
# Interactive deployment (recommended for first-time setup)
node scripts/master-infrastructure-deploy.js

# Or automated deployment (for CI/CD)
node scripts/master-infrastructure-deploy.js --skip-confirmation --mode production
```

### 3. Validate Setup
```bash
node scripts/comprehensive-validation-suite.js
```

### 4. Start Development
```bash
npm run dev
```

The master deployment script will guide you through the entire setup process, including:
- Google Cloud project creation
- API enablement
- Service account setup
- Document AI processor creation
- Supabase configuration
- Environment variable setup

## Detailed Setup Process

For users who want to understand each step or run components individually:

### Step 1: Environment Preparation

#### 1.1. Initialize Project
```bash
git clone <your-creditai-repo>
cd creditai
npm install
```

#### 1.2. Google Cloud Authentication
```bash
# Login to Google Cloud
gcloud auth login

# Set up application default credentials
gcloud auth application-default login

# Verify authentication
gcloud auth list
```

#### 1.3. Create Base Environment File
```bash
# Copy template if it exists
cp .env.local.template .env.local

# Or create from scratch
cat > .env.local << EOF
# CreditAI Environment Configuration
NODE_ENV=development

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_LOCATION=us
GOOGLE_AI_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Security Configuration
PII_MASKING_ENABLED=true
PII_ENCRYPTION_ENABLED=true
TEMP_FILE_CLEANUP_ENABLED=true

# Monitoring Configuration
PDF_PROCESSING_MONITORING_ENABLED=true
PDF_PROCESSING_SUCCESS_RATE_THRESHOLD=85
EOF
```

### Step 2: Google Cloud Setup

#### 2.1. Create Project (Manual)
```bash
# Create a new project
gcloud projects create YOUR_PROJECT_ID --name="CreditAI"

# Set as current project
gcloud config set project YOUR_PROJECT_ID

# Enable billing (required for APIs)
# This must be done in the Google Cloud Console
```

#### 2.2. Automated Google Cloud Setup
```bash
# Run complete Google Cloud setup
node scripts/setup-google-cloud-complete.js

# Or run individual components:
node scripts/setup-google-cloud-project.js
node scripts/setup-google-cloud-services.js
node scripts/setup-service-account.js
node scripts/setup-document-ai-processors.js
```

#### 2.3. Manual Service Account Setup (if needed)
```bash
# Create service account
gcloud iam service-accounts create credit-report-processor \
    --display-name="Credit Report Processor"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:credit-report-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/documentai.apiUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:credit-report-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.imageAnnotator"

# Create and download key
gcloud iam service-accounts keys create google-cloud-key.json \
    --iam-account=credit-report-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### Step 3: Supabase Setup

#### 3.1. Local Supabase (Development)
```bash
# Start local Supabase
supabase start

# Get connection details
supabase status

# Run migrations
npm run supabase:push
```

#### 3.2. Cloud Supabase (Production)
```bash
# Configure Supabase connection
node scripts/setup-supabase.js

# Or manually update .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=your-project-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 4: Application Configuration

#### 4.1. Update Environment Variables
```bash
# Edit .env.local with your specific values
nano .env.local

# Required variables:
# GOOGLE_CLOUD_PROJECT_ID=your-project-id
# GOOGLE_AI_API_KEY=your-api-key
# NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 4.2. Install Dependencies
```bash
npm install
```

## Configuration Management

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project ID | ✅ | `creditai-123456` |
| `GOOGLE_AI_API_KEY` | Google AI API key | ✅ | `AIza...` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | ⚠️ | `./google-cloud-key.json` |
| `GOOGLE_CLOUD_CREDENTIALS` | Service account JSON | ⚠️ | `{"type":"service_account",...}` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ | `eyJ...` |

⚠️ Use either `GOOGLE_APPLICATION_CREDENTIALS` OR `GOOGLE_CLOUD_CREDENTIALS`, not both.

### Configuration Validation

```bash
# Validate all configuration
node scripts/comprehensive-validation-suite.js

# Check specific components
node scripts/check-setup.js
```

## Validation and Testing

### Comprehensive Validation

```bash
# Run full validation suite
node scripts/comprehensive-validation-suite.js --verbose

# Validate specific components
node scripts/validate-google-cloud-project.js
node scripts/validate-document-ai-setup.js
```

### Integration Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:integration
npm run test:performance

# Test PDF processing
node scripts/test-pdf-processing.js

# Test with real samples
node scripts/test-with-real-samples.js
```

### Manual Testing

```bash
# Start development server
npm run dev

# Test endpoints:
# http://localhost:3000
# http://localhost:3000/upload
# http://localhost:3000/test-upload
```

## Troubleshooting

### Diagnostic Tools

```bash
# Run comprehensive diagnostics
node scripts/infrastructure-diagnostics.js --verbose

# Diagnose specific issues
node scripts/diagnose-google-cloud-setup.js
node scripts/diagnose-upload-error.js
node scripts/diagnose-pdf-error.js
```

### Common Issues and Solutions

#### Issue: "Google Cloud CLI not found"

**Solution:**
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Or use package manager
# macOS: brew install google-cloud-sdk
# Linux: apt-get install google-cloud-sdk
```

#### Issue: "Authentication failed"

**Solution:**
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify authentication
gcloud auth list
```

#### Issue: "Project billing not enabled"

**Solution:**
1. Go to Google Cloud Console
2. Navigate to Billing
3. Link a billing account to your project

#### Issue: "APIs not enabled"

**Solution:**
```bash
# Enable required APIs
gcloud services enable documentai.googleapis.com
gcloud services enable vision.googleapis.com
gcloud services enable storage.googleapis.com
```

#### Issue: "Supabase connection failed"

**Solution:**
```bash
# Check Supabase status
supabase status

# Restart Supabase
supabase stop
supabase start

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### Issue: "Document AI processor not found"

**Solution:**
```bash
# Create Document AI processor
node scripts/create-document-ai-processor.js

# Or manually in Google Cloud Console:
# 1. Go to Document AI
# 2. Create new processor
# 3. Select "Form Parser" or "OCR Processor"
```

#### Issue: "Permission denied errors"

**Solution:**
```bash
# Fix file permissions
chmod 600 google-cloud-key.json

# Check IAM roles
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Grant necessary roles
node scripts/manage-iam-roles.js
```

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm run dev

# Run setup with verbose output
node scripts/master-infrastructure-deploy.js --verbose

# Check logs
tail -f ~/.config/gcloud/logs/gcloud.log
```

## Advanced Configuration

### Production Deployment

#### 1. Production Environment Setup
```bash
# Set production mode
export NODE_ENV=production

# Run production deployment
node scripts/master-infrastructure-deploy.js --mode production
```

#### 2. Security Hardening
```bash
# Setup credential rotation
node scripts/setup-credential-rotation.js

# Configure monitoring
node scripts/setup-monitoring.js

# Enable audit logging
node scripts/setup-audit-logging.js
```

#### 3. Performance Optimization
```bash
# Optimize database
node scripts/optimize-database-performance.js

# Setup CDN and caching
node scripts/setup-cdn.js
```

### Multi-Environment Setup

#### Development
```bash
cp .env.local.template .env.development
# Configure development-specific settings
node scripts/master-infrastructure-deploy.js --mode development
```

#### Staging
```bash
cp .env.local.template .env.staging
# Configure staging-specific settings
node scripts/master-infrastructure-deploy.js --mode staging
```

#### Production
```bash
cp .env.local.template .env.production
# Configure production-specific settings
node scripts/master-infrastructure-deploy.js --mode production
```

### Custom Configuration

#### Custom Google Cloud Region
```bash
# Set custom region
export GOOGLE_CLOUD_LOCATION=europe-west1
node scripts/setup-google-cloud-complete.js
```

#### Custom Document AI Processors
```bash
# Create custom processors
node scripts/create-document-ai-processor.js --type FORM_PARSER
node scripts/create-document-ai-processor.js --type OCR_PROCESSOR
```

#### Custom Monitoring
```bash
# Setup custom monitoring
node scripts/setup-monitoring.js --provider datadog
node scripts/setup-monitoring.js --provider newrelic
```

## Maintenance and Updates

### Regular Maintenance

```bash
# Update dependencies
npm update

# Update Google Cloud SDK
gcloud components update

# Rotate credentials (monthly)
node scripts/rotate-credentials.js

# Validate configuration
node scripts/comprehensive-validation-suite.js
```

### Backup and Recovery

```bash
# Backup configuration
node scripts/backup-configuration.js

# Create disaster recovery plan
node scripts/setup-disaster-recovery.js

# Test recovery procedures
node scripts/test-recovery.js
```

### Monitoring and Alerting

```bash
# Setup monitoring
node scripts/setup-monitoring.js

# Configure alerts
node scripts/setup-alerts.js

# View health dashboard
npm run monitoring:dashboard
```

## Support and Resources

### Documentation
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### CreditAI Specific
- [API Documentation](./API_DOCUMENTATION.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)

### Getting Help

1. **Check diagnostic reports** generated by the scripts
2. **Run the troubleshooting tools**:
   ```bash
   node scripts/infrastructure-diagnostics.js
   ```
3. **Review logs** in the `logs/` directory
4. **Check GitHub issues** for known problems
5. **Contact support** with diagnostic reports

---

**Next Steps:**
After completing this setup, proceed to:
1. [Testing Guide](../TESTING_GUIDE.md) - Test your installation
2. [Development Guide](./DEVELOPMENT_GUIDE.md) - Start developing
3. [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Deploy to production