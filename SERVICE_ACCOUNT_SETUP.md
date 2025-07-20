# Google Cloud Service Account Setup Guide

This guide covers the complete setup and management of Google Cloud service accounts for the Credit Report Processor application.

## Overview

The service account provides secure authentication for the application to access Google Cloud services including Document AI, Vision API, Cloud Storage, Monitoring, and Logging.

## Prerequisites

1. **Google Cloud CLI installed and authenticated**
   ```bash
   gcloud --version
   gcloud auth login
   ```

2. **Google Cloud project with billing enabled**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Required APIs enabled** (handled by setup scripts)
   - Document AI API
   - Vision API
   - Cloud Storage API
   - Cloud Monitoring API
   - Cloud Logging API

## Quick Setup

### 1. Run the Setup Script

```bash
node scripts/setup-service-account.js
```

This script will:
- Create a service account with minimal required permissions
- Assign all necessary IAM roles
- Generate and download the service account key
- Update environment variables in `.env.local`
- Validate the setup

### 2. Verify the Setup

```bash
node scripts/test-service-account.js
```

This will run comprehensive tests to ensure:
- Service account authentication works
- All required permissions are assigned
- APIs are accessible
- Environment variables are configured correctly

## Manual Setup (Alternative)

If you prefer to set up the service account manually:

### 1. Create Service Account

```bash
gcloud iam service-accounts create credit-report-processor \
  --display-name="Credit Report Processor Service Account" \
  --description="Service account for PDF processing with Document AI and Vision API"
```

### 2. Assign IAM Roles

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT_EMAIL="credit-report-processor@${PROJECT_ID}.iam.gserviceaccount.com"

# Assign required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/documentai.apiUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/vision.imageAnnotator"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.objectCreator"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/logging.logWriter"
```

### 3. Generate Service Account Key

```bash
gcloud iam service-accounts keys create google-cloud-key.json \
  --iam-account=${SERVICE_ACCOUNT_EMAIL}
```

### 4. Update Environment Variables

Add to your `.env.local` file:

```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL=credit-report-processor@your-project-id.iam.gserviceaccount.com
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
```

## IAM Role Management

### Audit Current Roles

```bash
node scripts/manage-iam-roles.js audit
```

### Assign Missing Roles

```bash
node scripts/manage-iam-roles.js assign
```

### Remove Unnecessary Roles

```bash
node scripts/manage-iam-roles.js cleanup
```

### Generate Role Documentation

```bash
node scripts/manage-iam-roles.js docs
```

### Full Management (Assign + Audit + Docs)

```bash
node scripts/manage-iam-roles.js full
```

## Required IAM Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| `roles/documentai.apiUser` | Document AI access | Process PDF documents, get processor info |
| `roles/vision.imageAnnotator` | Vision API access | OCR fallback, image analysis |
| `roles/storage.objectCreator` | Create temp files | Upload files for processing |
| `roles/storage.objectViewer` | Read temp files | Download processed files |
| `roles/monitoring.metricWriter` | Write metrics | Performance monitoring |
| `roles/logging.logWriter` | Write logs | Error tracking and audit logs |

## Security Best Practices

### 1. Principle of Least Privilege
- Only assign roles that are absolutely necessary
- Regularly audit and remove unused permissions
- Use the IAM management script to maintain minimal permissions

### 2. Key Management
- Store service account keys securely
- Never commit keys to version control
- Add `google-cloud-key.json` to `.gitignore`
- Rotate keys regularly (recommended: every 90 days)

### 3. Environment Variables
- Use environment variables for configuration
- Encrypt sensitive environment files in production
- Consider using Google Cloud Secret Manager for production deployments

### 4. Monitoring and Auditing
- Enable audit logging for service account usage
- Monitor for unusual access patterns
- Set up alerts for permission changes

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: Service account authentication failed
```
**Solution:**
- Verify the service account key file exists and is valid
- Check that `GOOGLE_APPLICATION_CREDENTIALS` points to the correct file
- Ensure the service account has not been deleted or disabled

#### 2. Permission Denied Errors
```
Error: Permission denied for Document AI API
```
**Solution:**
- Run the IAM audit: `node scripts/manage-iam-roles.js audit`
- Assign missing roles: `node scripts/manage-iam-roles.js assign`
- Verify APIs are enabled in the Google Cloud Console

#### 3. Project Configuration Issues
```
Error: No Google Cloud project is set
```
**Solution:**
```bash
gcloud config set project YOUR_PROJECT_ID
gcloud config get-value project
```

#### 4. Billing Issues
```
Error: Billing must be enabled for this project
```
**Solution:**
- Enable billing in the Google Cloud Console
- Verify billing account is linked to the project

### Diagnostic Commands

```bash
# Check current authentication
gcloud auth list

# Verify project configuration
gcloud config list

# Test API access
gcloud ai document-processors list --location=us
gcloud services list --enabled

# Check service account
gcloud iam service-accounts list
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project ID | `my-credit-app-123456` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key | `./google-cloud-key.json` |
| `GOOGLE_CLOUD_CREDENTIALS` | Service account key as JSON string | `{"type":"service_account",...}` |
| `GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL` | Service account email | `credit-report-processor@project.iam.gserviceaccount.com` |

## Production Considerations

### 1. Key Rotation
Set up automated key rotation:
```bash
# Create new key
gcloud iam service-accounts keys create new-key.json \
  --iam-account=SERVICE_ACCOUNT_EMAIL

# Update application configuration
# Delete old key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=SERVICE_ACCOUNT_EMAIL
```

### 2. Secret Management
Consider using Google Cloud Secret Manager:
```bash
# Store service account key in Secret Manager
gcloud secrets create service-account-key --data-file=google-cloud-key.json

# Access from application
gcloud secrets versions access latest --secret=service-account-key
```

### 3. Monitoring
Set up monitoring for:
- Service account usage patterns
- API quota consumption
- Authentication failures
- Permission changes

## Support

If you encounter issues:

1. Run the diagnostic script: `node scripts/test-service-account.js`
2. Check the troubleshooting section above
3. Review Google Cloud Console for any service issues
4. Verify billing and quota limits

For additional help, consult the [Google Cloud IAM documentation](https://cloud.google.com/iam/docs).