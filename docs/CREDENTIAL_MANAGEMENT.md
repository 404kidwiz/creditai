# Google Cloud Credential Management

This document provides comprehensive guidance for managing Google Cloud service account credentials securely, including installation, validation, rotation, and security best practices.

## Overview

The credential management system provides:

- **Secure Storage**: Encrypted credential storage with metadata tracking
- **Validation**: Comprehensive authentication and service access testing
- **Rotation**: Automated and manual credential rotation procedures
- **Security**: Best practices implementation and audit logging
- **Monitoring**: Credential health and rotation schedule tracking

## Quick Start

### 1. Install Credentials

```bash
# Install credentials from service account JSON file
node scripts/manage-credentials.js install ./path/to/service-account.json

# Validate installation
node scripts/manage-credentials.js validate
```

### 2. Check Status

```bash
# View credential status and rotation schedule
node scripts/manage-credentials.js status
```

### 3. Test Services

```bash
# Test specific Google Cloud service
node scripts/manage-credentials.js test document-ai
node scripts/manage-credentials.js test vision-api
```

## Credential Management Commands

### Installation

Install new service account credentials:

```bash
node scripts/manage-credentials.js install <path-to-json-file>
```

**Example:**
```bash
node scripts/manage-credentials.js install ./google-cloud-key.json
```

**What it does:**
- Validates credential format and required fields
- Encrypts and stores credentials securely
- Creates metadata for tracking and rotation
- Tests all Google Cloud service connections
- Provides setup recommendations

### Validation

Validate current credentials and service access:

```bash
node scripts/manage-credentials.js validate
```

**Validation checks:**
- ✅ Basic authentication and project access
- ✅ Document AI service and processor access
- ✅ Vision API service access
- ✅ Cloud Storage bucket access
- ✅ Service account permissions
- ✅ Credential format and integrity

### Status Monitoring

Check credential status and rotation schedule:

```bash
node scripts/manage-credentials.js status
```

**Status information:**
- Credential file existence and metadata
- Key ID and environment configuration
- Creation date and last usage
- Rotation schedule and requirements
- Security recommendations

### Service Testing

Test individual Google Cloud services:

```bash
node scripts/manage-credentials.js test <service-name>
```

**Available services:**
- `authentication` - Basic auth and project access
- `document-ai` - Document AI processors and permissions
- `vision-api` - Vision API access and features
- `cloud-storage` - Storage bucket access
- `permissions` - Service account role validation

### Credential Rotation

Rotate to new service account credentials:

```bash
node scripts/manage-credentials.js rotate <path-to-new-json-file>
```

**Rotation process:**
1. Creates backup of current credentials
2. Validates new credential format and permissions
3. Tests new credential functionality
4. Stores new credentials securely
5. Updates metadata and rotation schedule
6. Cleans up old backups

### Backup and Recovery

Create manual backup of current credentials:

```bash
node scripts/manage-credentials.js backup
```

**⚠️ Security Warning:** Backup files contain sensitive data. Store securely and delete after use.

### Cleanup

Remove all credential files (requires confirmation):

```bash
node scripts/manage-credentials.js cleanup --confirm
```

## Security Best Practices

### 1. Credential Storage

**✅ Do:**
- Use encrypted storage for all credentials
- Store credentials outside version control
- Use environment-specific credential files
- Implement proper file permissions (600)

**❌ Don't:**
- Store credentials in plain text
- Commit credentials to version control
- Share credential files via insecure channels
- Use production credentials in development

### 2. Access Control

**Service Account Permissions (Principle of Least Privilege):**

```json
{
  "required_roles": [
    "roles/documentai.apiUser",
    "roles/vision.imageAnnotator", 
    "roles/storage.objectCreator",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter"
  ]
}
```

**Environment Separation:**
- Development: Limited scope, test data only
- Staging: Production-like, restricted access
- Production: Full access, audit logging enabled

### 3. Rotation Schedule

**Recommended rotation intervals:**
- **Development**: 180 days
- **Staging**: 90 days  
- **Production**: 60 days
- **High-security**: 30 days

**Automated rotation triggers:**
- Scheduled intervals
- Security incidents
- Personnel changes
- Compliance requirements

### 4. Monitoring and Auditing

**Audit logging includes:**
- Credential installation and rotation events
- Authentication attempts and failures
- Service access patterns and anomalies
- Permission changes and escalations

**Monitoring alerts:**
- Rotation overdue warnings
- Authentication failures
- Unusual access patterns
- Service availability issues

## Environment Configuration

### Required Environment Variables

```bash
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Document AI Configuration  
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_DOCUMENT_AI_LOCATION=us

# Vision API Configuration
GOOGLE_CLOUD_VISION_API_ENABLED=true

# Service Account Authentication
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json

# Credential Encryption (auto-generated if not provided)
CREDENTIAL_ENCRYPTION_KEY=your-encryption-key

# Monitoring Configuration
GOOGLE_CLOUD_MONITORING_ENABLED=true
GOOGLE_CLOUD_LOGGING_ENABLED=true
```

### Environment-Specific Setup

**Development (.env.local):**
```bash
NODE_ENV=development
GOOGLE_CLOUD_PROJECT_ID=your-dev-project
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key-dev.json
```

**Production (.env.production):**
```bash
NODE_ENV=production
GOOGLE_CLOUD_PROJECT_ID=your-prod-project
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key-prod.json
CREDENTIAL_ENCRYPTION_KEY=your-secure-encryption-key
```

## Troubleshooting

### Common Issues

**1. Authentication Failures**
```bash
# Check credential format and project ID
node scripts/manage-credentials.js validate

# Test specific authentication
node scripts/manage-credentials.js test authentication
```

**2. Service Access Denied**
```bash
# Verify service account permissions
node scripts/manage-credentials.js test permissions

# Check API enablement in Google Cloud Console
```

**3. Rotation Failures**
```bash
# Check rotation status
node scripts/manage-credentials.js status

# Validate new credentials before rotation
node scripts/manage-credentials.js install <new-credentials> --dry-run
```

**4. Missing Environment Variables**
```bash
# Validate environment configuration
node scripts/validate-google-cloud-env.js
```

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Credentials file not found` | Missing credential file | Run install command |
| `Invalid credential type` | Wrong JSON format | Use service account JSON |
| `API not enabled` | Service not activated | Enable API in Cloud Console |
| `Permission denied` | Insufficient IAM roles | Update service account permissions |
| `Rotation overdue` | Credentials too old | Perform credential rotation |

## Integration with Application

### Programmatic Usage

```typescript
import { CredentialManager } from '../src/lib/security/credentialManager';
import { CredentialValidator } from '../src/lib/security/credentialValidator';

// Load credentials
const manager = CredentialManager.getInstance();
const credentials = await manager.loadCredentials();

// Validate services
const validator = new CredentialValidator();
const report = await validator.validateCredentials();

if (!report.overall) {
  console.error('Credential validation failed:', report.recommendations);
}
```

### Automated Health Checks

```typescript
// Add to application startup
async function validateGoogleCloudSetup() {
  const validator = new CredentialValidator();
  const report = await validator.validateCredentials();
  
  if (!report.overall) {
    throw new Error('Google Cloud setup validation failed');
  }
  
  console.log('✅ Google Cloud services validated successfully');
}
```

### Rotation Monitoring

```typescript
// Add to scheduled tasks
import { CredentialRotation } from '../src/lib/security/credentialRotation';

async function checkCredentialRotation() {
  const rotation = new CredentialRotation();
  const report = await rotation.generateRotationReport();
  
  if (report.currentStatus === 'overdue') {
    // Send alert to administrators
    console.warn('⚠️ Credential rotation overdue');
  }
}
```

## Security Compliance

### OWASP Guidelines

- **A02:2021 – Cryptographic Failures**: Encrypted credential storage
- **A05:2021 – Security Misconfiguration**: Proper IAM and API configuration  
- **A07:2021 – Identification and Authentication Failures**: Strong authentication validation
- **A09:2021 – Security Logging and Monitoring Failures**: Comprehensive audit logging

### SOC 2 Compliance

- **Security**: Encrypted storage and access controls
- **Availability**: Service health monitoring and alerting
- **Processing Integrity**: Validation and testing procedures
- **Confidentiality**: Secure credential handling and rotation
- **Privacy**: PII protection and data minimization

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review credential status and rotation schedule
- Check service health and validation reports
- Monitor audit logs for anomalies

**Monthly:**
- Update service account permissions as needed
- Review and update rotation policies
- Test backup and recovery procedures

**Quarterly:**
- Perform security audit and compliance review
- Update documentation and procedures
- Review and optimize monitoring and alerting

### Getting Help

**Documentation:**
- [Google Cloud IAM Best Practices](https://cloud.google.com/iam/docs/using-iam-securely)
- [Service Account Key Management](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)

**Support Channels:**
- Internal documentation and runbooks
- Google Cloud Support (for service issues)
- Security team (for compliance questions)

**Emergency Procedures:**
- Credential compromise: Immediate rotation and audit
- Service outage: Fallback procedures and escalation
- Security incident: Follow incident response plan