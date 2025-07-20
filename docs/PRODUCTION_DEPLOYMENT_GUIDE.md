# Real PDF Analysis Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Real PDF Analysis system to production. It covers Google Cloud service configuration, environment setup, validation testing, and monitoring.

## Prerequisites

### Google Cloud Setup

1. **Google Cloud Project**
   - Create a new Google Cloud project or use an existing one
   - Enable billing for the project
   - Note your Project ID: `your-project-id`

2. **Required APIs**
   - Document AI API
   - Vision API
   - Storage API
   - AI Platform API

3. **Service Account**
   - Create a service account with the following roles:
     - Document AI Editor
     - Vision AI User
     - Storage Object Admin
   - Download the service account key JSON file

### Environment Requirements

- Node.js 18.x or newer
- PostgreSQL 14.x or newer
- Redis (optional, for caching)
- At least 4GB RAM and 2 CPU cores

## Deployment Steps

### 1. Configure Environment Variables

Create a `.env.production` file with the following variables:

```
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_AI_API_KEY=your-api-key
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
GOOGLE_CLOUD_STORAGE_BUCKET=your-project-id-credit-reports
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

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/credit_analysis

# Application Configuration
NODE_ENV=production
```

### 2. Run Deployment Script

The deployment script automates the entire deployment process:

```bash
# Run with default settings
./scripts/deploy-real-pdf-analysis.sh

# Run with custom environment
./scripts/deploy-real-pdf-analysis.sh --env staging

# Skip Google Cloud setup (if already configured)
./scripts/deploy-real-pdf-analysis.sh --skip-gcloud

# Skip root user check (for development)
./scripts/deploy-real-pdf-analysis.sh --skip-root-check

# Dry run (show what would be done without executing)
./scripts/deploy-real-pdf-analysis.sh --dry-run
```

### 3. Validate Deployment

After deployment, validate the system with real credit report samples:

```bash
# Run validation script
node scripts/production-deployment-validator.js

# Run with custom API URL
API_BASE_URL=https://your-domain.com node scripts/production-deployment-validator.js
```

The validation script will:
- Check system health (API, database, Google Cloud services)
- Process sample credit reports
- Validate extraction accuracy
- Generate a comprehensive validation report

### 4. Monitor Production Usage

1. **Access Monitoring Dashboard**
   - Navigate to `/admin/monitoring/pdf-processing` in your application
   - Review processing success rates, confidence scores, and error rates

2. **Set Up Alerts**
   - Configure email alerts for critical metrics:
     - Success rate below 85%
     - Average confidence below 60%
     - Processing time above 10 seconds
     - Error rate above 15%

3. **Review Logs**
   - Check application logs: `/var/log/credit-analysis/pdf_processing_*.log`
   - Check audit logs for security events

## Troubleshooting

### Common Issues

1. **Google Cloud Authentication Failures**
   - Verify service account credentials are correctly configured
   - Check that required APIs are enabled
   - Ensure service account has proper permissions

2. **PDF Processing Failures**
   - Check Document AI processor configuration
   - Verify PDF file format compatibility
   - Check for timeout issues with large files

3. **Low Extraction Accuracy**
   - Review confidence scores for specific report types
   - Consider training Document AI processor with more samples
   - Adjust confidence thresholds in environment variables

### Validation Errors

If validation fails, check the detailed report in `test-results/production-validation-report-*.json` for specific issues:

- **System Health Issues**: Check service connectivity and configuration
- **Low Accuracy**: Review extraction results for specific data types
- **Processing Errors**: Check for timeouts or service failures

## Collecting User Feedback

The system includes a user feedback collection mechanism:

1. **Feedback Form**
   - Displayed after PDF processing completion
   - Collects ratings for overall experience, accuracy, and speed
   - Allows for additional comments

2. **Feedback Analysis**
   - Access feedback metrics in the monitoring dashboard
   - Review trends in accuracy ratings over time
   - Use insights to prioritize improvements

## Iterative Improvements

Based on production usage and feedback:

1. **Monitor Extraction Accuracy**
   - Track confidence scores by report type
   - Identify patterns in low-confidence extractions

2. **Optimize Processing Performance**
   - Monitor processing times for different file sizes
   - Adjust timeout settings as needed

3. **Enhance Fallback Mechanisms**
   - Review fallback usage statistics
   - Improve secondary extraction methods

4. **Security Enhancements**
   - Regularly review audit logs
   - Update PII masking patterns as needed

## Support and Maintenance

### Regular Maintenance Tasks

- **Daily**: Review monitoring dashboard and error logs
- **Weekly**: Analyze user feedback and extraction accuracy
- **Monthly**: Perform comprehensive validation testing

### Support Contacts

- **Technical Issues**: tech-support@example.com
- **Google Cloud Support**: cloud-support@example.com
- **Security Concerns**: security@example.com

---

**Last Updated**: July 18, 2025
**Version**: 1.0