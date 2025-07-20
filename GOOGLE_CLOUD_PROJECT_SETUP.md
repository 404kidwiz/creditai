# Google Cloud Project Setup Guide

This guide provides automated scripts for setting up a complete Google Cloud infrastructure for PDF processing with Document AI and Vision API.

## Overview

The setup process includes:
- Google Cloud project creation with billing
- API enablement (Document AI, Vision API, Storage, Monitoring, Logging)
- Regional configuration and quota setup
- Comprehensive validation and diagnostic tools

## Prerequisites

Before running the setup scripts, ensure you have:

1. **Google Cloud CLI installed**
   ```bash
   # Install Google Cloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Authentication with Google Cloud**
   ```bash
   gcloud auth login
   ```

3. **Node.js installed** (version 14 or higher)

## Quick Start

### Option 1: Complete Automated Setup (Recommended)

Run the complete setup process:
```bash
node scripts/setup-google-cloud-complete.js
```

This script will:
- Guide you through project creation
- Enable all required APIs
- Configure billing and regional settings
- Validate the complete setup
- Generate configuration files

### Option 2: Step-by-Step Setup

#### Step 1: Create Google Cloud Project
```bash
node scripts/setup-google-cloud-project.js
```

#### Step 2: Validate Setup
```bash
node scripts/validate-google-cloud-project.js
```

#### Step 3: Diagnose Issues (if needed)
```bash
node scripts/diagnose-google-cloud-setup.js
```

## Script Details

### 1. setup-google-cloud-project.js
**Purpose**: Creates and configures a Google Cloud project with all required services.

**Features**:
- Interactive project creation or selection
- Billing account configuration
- API enablement for all required services
- Regional settings configuration
- Configuration file generation

**Usage**:
```bash
node scripts/setup-google-cloud-project.js
```

### 2. validate-google-cloud-project.js
**Purpose**: Validates that the Google Cloud project is properly configured.

**Features**:
- Project accessibility verification
- Billing status validation
- API enablement checks
- Permission validation
- Detailed validation report generation

**Usage**:
```bash
# Validate current project
node scripts/validate-google-cloud-project.js

# Validate specific project
node scripts/validate-google-cloud-project.js YOUR_PROJECT_ID
```

### 3. setup-google-cloud-complete.js
**Purpose**: Orchestrates the complete setup process with validation.

**Features**:
- Prerequisites checking
- Complete project setup
- Service propagation waiting
- Validation and reporting
- Next steps generation

**Usage**:
```bash
node scripts/setup-google-cloud-complete.js
```

### 4. diagnose-google-cloud-setup.js
**Purpose**: Diagnoses common setup issues and provides specific recommendations.

**Features**:
- Comprehensive system checks
- Issue categorization (critical vs warnings)
- Specific fix recommendations
- Detailed diagnostic reporting

**Usage**:
```bash
node scripts/diagnose-google-cloud-setup.js
```

## Required Google Cloud APIs

The setup process enables these APIs:
- `documentai.googleapis.com` - Document AI for PDF processing
- `vision.googleapis.com` - Vision API for OCR fallback
- `storage.googleapis.com` - Cloud Storage for temporary files
- `monitoring.googleapis.com` - Cloud Monitoring for metrics
- `logging.googleapis.com` - Cloud Logging for error tracking
- `cloudbilling.googleapis.com` - Billing API for cost management
- `cloudresourcemanager.googleapis.com` - Resource Manager API

## Configuration Files Generated

After successful setup, these files will be created:

### google-cloud-config.json
Contains project configuration details:
```json
{
  "projectId": "your-project-id",
  "region": "us-central1",
  "zone": "us-central1-a",
  "billingAccountId": "billing-account-id",
  "enabledAPIs": [...],
  "setupDate": "2024-01-01T00:00:00.000Z"
}
```

### .env.google-cloud.template
Environment variables template:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_DOCUMENT_AI_LOCATION=us
GOOGLE_CLOUD_VISION_API_ENABLED=true
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
GOOGLE_CLOUD_MONITORING_ENABLED=true
GOOGLE_CLOUD_LOGGING_ENABLED=true
```

## Validation Reports

### google-cloud-validation-report.json
Detailed validation results:
```json
{
  "projectId": "your-project-id",
  "validationDate": "2024-01-01T00:00:00.000Z",
  "results": {
    "project": true,
    "billing": true,
    "apis": {...},
    "authentication": true,
    "permissions": true,
    "overall": true
  }
}
```

### google-cloud-diagnostic-report.json
Diagnostic findings and recommendations:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "criticalIssues": 0,
    "warnings": 2
  },
  "issues": [],
  "warnings": [...]
}
```

## Common Issues and Solutions

### 1. Authentication Issues
**Problem**: "Not authenticated" error
**Solution**: 
```bash
gcloud auth login
gcloud auth application-default login
```

### 2. Project Access Issues
**Problem**: Cannot access project
**Solution**:
```bash
gcloud config set project YOUR_PROJECT_ID
gcloud projects describe YOUR_PROJECT_ID
```

### 3. Billing Issues
**Problem**: Billing not enabled
**Solution**: Enable billing in Google Cloud Console or during setup

### 4. API Enablement Issues
**Problem**: APIs not enabled
**Solution**:
```bash
gcloud services enable documentai.googleapis.com vision.googleapis.com
```

### 5. Permission Issues
**Problem**: Insufficient permissions
**Solution**: Ensure your account has Editor role or specific service roles

## Next Steps After Setup

1. **Create Service Account**:
   ```bash
   node scripts/setup-service-account.js
   ```

2. **Set up Document AI Processors**:
   ```bash
   node scripts/create-document-ai-processor.js
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.google-cloud.template .env.local
   # Edit .env.local with your specific values
   ```

4. **Test Integration**:
   ```bash
   node scripts/test-google-cloud.js
   ```

## Monitoring and Maintenance

### Regular Validation
Run validation periodically to ensure everything is working:
```bash
node scripts/validate-google-cloud-project.js
```

### Diagnostic Checks
If issues arise, run diagnostics:
```bash
node scripts/diagnose-google-cloud-setup.js
```

### Quota Monitoring
Monitor API usage and quotas in Google Cloud Console:
- Navigate to APIs & Services > Quotas
- Set up alerts for quota usage

## Security Best Practices

1. **Least Privilege**: Use minimal required permissions
2. **Key Rotation**: Regularly rotate service account keys
3. **Monitoring**: Enable audit logging and monitoring
4. **Access Control**: Restrict project access to necessary users

## Support and Troubleshooting

### Getting Help
1. Check the diagnostic report for specific issues
2. Review Google Cloud documentation
3. Verify billing and quotas in Google Cloud Console
4. Ensure all prerequisites are met

### Useful Commands
```bash
# Check current configuration
gcloud config list

# List enabled services
gcloud services list --enabled

# Check billing status
gcloud billing projects describe PROJECT_ID

# Test permissions
gcloud projects test-iam-permissions PROJECT_ID --permissions="PERMISSION_LIST"
```

## Resources

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Vision API Documentation](https://cloud.google.com/vision/docs)
- [Google Cloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)