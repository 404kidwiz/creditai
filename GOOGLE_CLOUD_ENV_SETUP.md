# Google Cloud Environment Setup Guide

This guide covers the comprehensive Google Cloud environment variable configuration system that supports multiple environments and secure credential management.

## Overview

The environment setup system provides:

- **Multi-environment support** (development, staging, production)
- **Secure credential configuration** with multiple storage methods
- **Comprehensive validation** and testing
- **Automated setup workflows**
- **Performance monitoring** and optimization

## Quick Start

### 1. Complete Setup (Recommended)

Run the complete setup script for your environment:

```bash
# Development environment (default)
npm run setup-google-cloud-env-complete

# Production environment
npm run setup-google-cloud-env-complete production

# Automated mode (minimal prompts)
npm run setup-google-cloud-env-complete production -- --automated
```

### 2. Individual Components

You can also run individual setup components:

```bash
# Configure credentials only
npm run configure-google-cloud-credentials

# Setup environment variables only
npm run setup-google-cloud-env

# Validate configuration
npm run validate-google-cloud-env

# Test connectivity
npm run test-google-cloud-env
```

## Environment Configuration

### Supported Environments

| Environment | File | Description | Credential Method |
|-------------|------|-------------|-------------------|
| `development` | `.env.local` | Local development | File-based |
| `staging` | `.env.staging` | Staging environment | File + Environment |
| `production` | `.env.production` | Production environment | Environment variable |

### Required Variables

#### Google Cloud Core Configuration
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_AI_API_KEY=your-gemini-api-key
GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
```

#### Authentication
```bash
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
# OR
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
```

#### Optional Configuration
```bash
GOOGLE_CLOUD_DOCUMENT_AI_LOCATION=us
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_VISION_API_ENABLED=true
GOOGLE_CLOUD_MONITORING_ENABLED=true
GOOGLE_CLOUD_LOGGING_ENABLED=true
```

### Security Configuration

```bash
PII_MASKING_ENABLED=true
PII_ENCRYPTION_ENABLED=true
TEMP_FILE_CLEANUP_ENABLED=true
SECURITY_AUDIT_LOGGING_ENABLED=true
```

### PDF Processing Configuration

```bash
PDF_PROCESSING_TIMEOUT=300000
PDF_MAX_SIZE=20971520
PDF_PROCESSING_FALLBACK_ENABLED=true
PDF_PROCESSING_CLIENT_FALLBACK_ENABLED=true
PDF_PROCESSING_CONFIDENCE_THRESHOLD=70
```

### Monitoring Configuration

```bash
PDF_PROCESSING_MONITORING_ENABLED=true
PDF_PROCESSING_SUCCESS_RATE_THRESHOLD=85
PDF_PROCESSING_ERROR_RATE_THRESHOLD=15
PDF_PROCESSING_TIME_THRESHOLD=10000
```

## Credential Management

### Storage Methods

1. **File-based** (Development)
   - Stores credentials in `google-cloud-key.json`
   - Secure file permissions (600)
   - Automatically added to `.gitignore`

2. **Environment Variable** (Production)
   - Stores credentials in `GOOGLE_CLOUD_CREDENTIALS`
   - JSON string format
   - No file system dependencies

3. **Both** (Staging)
   - Combines both methods for flexibility
   - Fallback support

### Credential Configuration

```bash
# Interactive mode
npm run configure-google-cloud-credentials

# Specify method and environment
npm run configure-google-cloud-credentials -- --method env --environment production

# With validation
npm run configure-google-cloud-credentials -- --validate
```

### Credential Input Methods

1. **Paste JSON directly** - Copy/paste service account JSON
2. **File path** - Provide path to downloaded JSON file
3. **Google Cloud Console** - Step-by-step download instructions

## Validation and Testing

### Environment Validation

```bash
# Validate current environment
npm run validate-google-cloud-env

# Validate specific environment
npm run validate-google-cloud-env production
```

Validation checks:
- ✅ Required variables present
- ✅ Variable format validation
- ✅ Service account credentials
- ✅ Project ID consistency
- ✅ File permissions and security

### Connectivity Testing

```bash
# Quick connectivity test
npm run test-google-cloud-env

# Full test suite with performance tests
npm run test-google-cloud-env -- --full

# Test specific service
npm run test-google-cloud-env -- --service document-ai
```

Test categories:
- 🌐 Google Cloud connectivity
- 🔐 Authentication & authorization
- 📄 Document AI service
- 👁️ Vision API service
- 🤖 Gemini AI service
- 💾 Cloud Storage
- 📊 Monitoring & logging
- ⚡ Performance & reliability

## Environment-Specific Settings

### Development Environment
- Lower confidence thresholds
- Extended timeouts
- Comprehensive logging
- File-based credentials

### Staging Environment
- Moderate performance thresholds
- Both credential methods
- Full monitoring enabled
- Production-like settings

### Production Environment
- High confidence thresholds
- Strict performance limits
- Environment-based credentials
- Maximum security settings

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```bash
# Check credentials
npm run validate-google-cloud-env

# Reconfigure credentials
npm run configure-google-cloud-credentials -- --rotate
```

#### 2. Missing Environment Variables
```bash
# Run complete setup
npm run setup-google-cloud-env-complete

# Or setup variables only
npm run setup-google-cloud-env
```

#### 3. Service Connectivity Issues
```bash
# Test specific service
npm run test-google-cloud-env -- --service document-ai

# Check project permissions
npm run validate-google-cloud-env
```

#### 4. Performance Issues
```bash
# Run performance tests
npm run test-google-cloud-env -- --full

# Check monitoring thresholds
grep "THRESHOLD" .env.local
```

### Diagnostic Commands

```bash
# Complete environment diagnosis
npm run setup-google-cloud-env-complete -- --skip-credentials --skip-testing

# Validate without testing
npm run validate-google-cloud-env

# Test without validation
npm run test-google-cloud-env -- --quick
```

## Security Best Practices

### Credential Security
- ✅ Service account keys have restricted permissions
- ✅ Credentials are excluded from version control
- ✅ File permissions are set to 600 (owner read/write only)
- ✅ Automatic backup creation before changes
- ✅ Credential rotation procedures

### Environment Security
- ✅ PII masking and encryption enabled
- ✅ Temporary file cleanup
- ✅ Security audit logging
- ✅ Access pattern monitoring

### Network Security
- ✅ HTTPS/TLS for all API calls
- ✅ API rate limiting
- ✅ Request timeout configuration
- ✅ Error handling without data leakage

## Advanced Usage

### Automated Deployment

```bash
# Production deployment
npm run setup-google-cloud-env-complete production -- --automated --skip-testing

# Staging with validation only
npm run setup-google-cloud-env-complete staging -- --skip-testing
```

### Custom Configuration

```bash
# Environment-specific processor
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID_STAGING=staging-processor-id
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID_PRODUCTION=production-processor-id

# Environment-specific thresholds
PDF_PROCESSING_CONFIDENCE_THRESHOLD_DEVELOPMENT=60
PDF_PROCESSING_CONFIDENCE_THRESHOLD_PRODUCTION=85
```

### Monitoring Integration

```bash
# Enable comprehensive monitoring
GOOGLE_CLOUD_MONITORING_ENABLED=true
PDF_PROCESSING_MONITORING_ENABLED=true
SECURITY_AUDIT_LOGGING_ENABLED=true

# Custom monitoring thresholds
PDF_PROCESSING_SUCCESS_RATE_THRESHOLD=95
PDF_PROCESSING_ERROR_RATE_THRESHOLD=5
PDF_PROCESSING_TIME_THRESHOLD=5000
```

## File Structure

```
scripts/
├── setup-complete-google-cloud-env.js     # Master setup script
├── setup-google-cloud-env.js              # Environment variable setup
├── configure-google-cloud-credentials.js  # Credential management
├── validate-google-cloud-env.js           # Configuration validation
└── test-google-cloud-env.js              # Connectivity testing

Environment Files:
├── .env.local                             # Development
├── .env.staging                           # Staging
├── .env.production                        # Production
└── google-cloud-key.json                 # Service account credentials
```

## Support

### Getting Help

1. **Run diagnostics**: `npm run validate-google-cloud-env`
2. **Check logs**: Review console output for specific error messages
3. **Test connectivity**: `npm run test-google-cloud-env -- --quick`
4. **Reconfigure**: `npm run setup-google-cloud-env-complete`

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Environment file not found" | Run `npm run setup-google-cloud-env` |
| "Invalid service account format" | Run `npm run configure-google-cloud-credentials` |
| "Authentication failed" | Check service account permissions |
| "Processor not found" | Verify Document AI processor ID |
| "API key invalid" | Check Gemini API key format |

### Performance Optimization

- Monitor processing times with built-in metrics
- Adjust confidence thresholds based on accuracy needs
- Use appropriate timeout values for your use case
- Enable fallback mechanisms for reliability
- Regular credential rotation for security

---

For more detailed information, see the individual script documentation and inline comments.