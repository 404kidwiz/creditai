# CreditAI Automation Suite

A comprehensive automation suite for infrastructure deployment, validation, and maintenance of the CreditAI platform.

## 🚀 Quick Start

### One-Command Setup
```bash
# Complete interactive setup
npm run setup

# Quick automated setup for development
npm run setup:quick

# Or use the CLI directly
npm run creditai
```

### Available Commands
```bash
# Setup and Deployment
npm run setup                 # Complete infrastructure setup
npm run setup:quick          # Quick development setup

# Validation and Testing
npm run validate             # Full infrastructure validation
npm run validate:quick       # Quick health check

# Diagnostics and Troubleshooting
npm run diagnose            # Comprehensive diagnostics

# CLI Interface
npm run creditai            # Interactive CLI menu
npm run creditai help       # Show all commands
```

## 📁 Automation Scripts Overview

### Core Infrastructure Scripts

#### 1. Master Infrastructure Deployment (`scripts/master-infrastructure-deploy.js`)
**Purpose**: Orchestrates complete infrastructure deployment

**Features**:
- Dependency-aware component ordering
- Rollback capability on failures
- Multi-environment support (development/staging/production)
- Interactive confirmation prompts
- Comprehensive error handling and reporting

**Usage**:
```bash
node scripts/master-infrastructure-deploy.js
node scripts/master-infrastructure-deploy.js --mode production --skip-confirmation
```

**Deployment Steps**:
1. Prerequisites check
2. Environment setup
3. Google Cloud project configuration
4. Google Cloud services enablement
5. Service account creation and IAM setup
6. Document AI processors creation
7. Storage services configuration
8. Supabase setup
9. Infrastructure validation
10. Integration testing

#### 2. Comprehensive Validation Suite (`scripts/comprehensive-validation-suite.js`)
**Purpose**: Validates all infrastructure components

**Features**:
- Multi-category validation (environment, Google Cloud, Supabase, integrations, security, performance)
- Detailed reporting with recommendations
- Configurable validation levels
- JSON reports for CI/CD integration

**Usage**:
```bash
node scripts/comprehensive-validation-suite.js
node scripts/comprehensive-validation-suite.js --verbose --stop-on-failure
```

**Validation Categories**:
- **Environment**: Configuration variables, file permissions
- **Google Cloud**: Project access, APIs, authentication, services
- **Supabase**: Connection, database schema, storage, authentication
- **Integrations**: PDF processing, AI analysis pipelines
- **Security**: Credential management, PII protection
- **Performance**: Service response times, configuration optimization

#### 3. Infrastructure Diagnostics (`scripts/infrastructure-diagnostics.js`)
**Purpose**: Troubleshoots common configuration issues

**Features**:
- System information gathering
- Network connectivity testing
- Service-specific diagnostics
- Common issue detection and resolution suggestions
- Detailed diagnostic reports

**Usage**:
```bash
node scripts/infrastructure-diagnostics.js
node scripts/infrastructure-diagnostics.js --verbose
```

**Diagnostic Categories**:
- System information (OS, Node.js, memory, CPU)
- Environment variables validation
- Dependencies check
- Google Cloud CLI and authentication
- Supabase connectivity
- Network connectivity tests
- Common configuration issues

#### 4. Unified CLI Interface (`scripts/creditai-cli.js`)
**Purpose**: Provides a unified command-line interface for all operations

**Features**:
- Interactive menu system
- Command aliases and shortcuts
- Context-aware help system
- Environment management utilities
- Service lifecycle management (start/stop/restart)

**Usage**:
```bash
node scripts/creditai-cli.js                    # Interactive mode
node scripts/creditai-cli.js setup             # Direct command
node scripts/creditai-cli.js help              # Show help
```

## 🔧 Configuration Management

### Environment Variables

The automation suite manages these critical environment variables:

#### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project ID | `creditai-123456` |
| `GOOGLE_AI_API_KEY` | Google AI API key | `AIza...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |

#### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLOUD_LOCATION` | Google Cloud region | `us` |
| `PDF_PROCESSING_TIMEOUT` | PDF processing timeout | `300000` |
| `PII_MASKING_ENABLED` | Enable PII masking | `true` |

### Configuration Templates

Generate environment templates:
```bash
npm run creditai env-generate
```

Check current configuration:
```bash
npm run creditai env-check
```

## 🏗️ Infrastructure Components

### Google Cloud Services
- **Document AI**: PDF processing and OCR
- **Vision API**: Image analysis and text extraction
- **Cloud Storage**: File storage and management
- **Cloud Monitoring**: Performance and health monitoring
- **Cloud Logging**: Centralized logging

### Supabase Services
- **Database**: PostgreSQL with real-time subscriptions
- **Authentication**: User management and security
- **Storage**: File upload and management
- **Edge Functions**: Serverless compute

### Application Services
- **Next.js**: Web application framework
- **React**: Frontend UI components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling framework

## 🔄 Deployment Workflows

### Development Environment
```bash
# 1. Initial setup
npm run setup:quick

# 2. Validate configuration
npm run validate:quick

# 3. Start development
npm run creditai start
```

### Staging Environment
```bash
# 1. Complete setup with validation
npm run setup -- --mode staging

# 2. Full validation
npm run validate

# 3. Run integration tests
npm run test:integration
```

### Production Environment
```bash
# 1. Production deployment
npm run setup -- --mode production --skip-confirmation

# 2. Comprehensive validation
npm run validate

# 3. Performance testing
npm run test:performance

# 4. Health monitoring setup
npm run creditai diagnose
```

## 🔍 Monitoring and Maintenance

### Health Checks
```bash
# Quick health check
npm run validate:quick

# Comprehensive validation
npm run validate

# System diagnostics
npm run diagnose
```

### Troubleshooting
```bash
# General diagnostics
npm run creditai diagnose

# Google Cloud specific
npm run creditai diagnose-google-cloud

# Supabase specific
npm run creditai diagnose-supabase
```

### Maintenance Tasks
```bash
# Update dependencies
npm run creditai update

# Backup configuration
npm run creditai backup

# Restore from backup
npm run creditai restore <backup-directory>
```

## 📊 Reports and Logging

### Generated Reports
- **Deployment Reports**: `deployment-success-report.json` / `deployment-failure-report.json`
- **Validation Reports**: `comprehensive-validation-report.json`
- **Diagnostic Reports**: `infrastructure-diagnostic-report.json`

### Log Files
- **Deployment Logs**: Detailed step-by-step execution logs
- **Validation Logs**: Component validation results
- **Diagnostic Logs**: System health and configuration analysis

## 🚨 Error Handling and Recovery

### Rollback Capabilities
The master deployment script includes automatic rollback functionality:
- Tracks completed deployment steps
- Maintains rollback procedures for each component
- Automatic rollback on critical failures
- Manual rollback triggers

### Common Issues and Solutions

#### Google Cloud Authentication Issues
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify authentication
npm run creditai diagnose-google-cloud
```

#### Supabase Connection Issues
```bash
# Check configuration
npm run creditai env-check

# Test connection
npm run creditai diagnose-supabase

# Restart services
npm run creditai restart
```

#### Permission Issues
```bash
# Fix file permissions
chmod 600 google-cloud-key.json

# Check IAM roles
npm run creditai diagnose
```

## 🔗 Integration with CI/CD

### GitHub Actions Example
```yaml
name: Infrastructure Deployment
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run setup -- --skip-confirmation --mode production
      - run: npm run validate
```

### Docker Integration
```dockerfile
# Add to Dockerfile for containerized deployments
COPY scripts/ ./scripts/
RUN npm run setup:quick
RUN npm run validate
```

## 📚 Additional Resources

### Documentation
- [Automated Setup Guide](docs/AUTOMATED_SETUP_GUIDE.md) - Detailed setup instructions
- [Testing Guide](TESTING_GUIDE.md) - Comprehensive testing procedures
- [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md) - Production deployment best practices

### Support Scripts
- `scripts/check-setup.js` - Quick setup verification
- `scripts/quick-google-cloud-test.js` - Fast Google Cloud connectivity test
- `scripts/run-comprehensive-tests.js` - Full test suite execution

### CLI Commands Reference
```bash
# Setup Commands
creditai setup                   # Complete setup
creditai setup-quick            # Quick development setup

# Validation Commands  
creditai validate               # Full validation
creditai validate-quick         # Quick health check
creditai test                   # Infrastructure tests
creditai test-pdf              # PDF processing tests

# Diagnostic Commands
creditai diagnose              # Comprehensive diagnostics
creditai diagnose-google-cloud # Google Cloud diagnostics
creditai diagnose-supabase     # Supabase diagnostics

# Environment Management
creditai env-check             # Check environment variables
creditai env-generate          # Generate environment template
creditai start                 # Start local services
creditai stop                  # Stop local services
creditai restart               # Restart services

# Maintenance Commands
creditai update                # Update dependencies
creditai backup                # Backup configuration
creditai restore <dir>         # Restore from backup

# Information Commands
creditai info                  # System information
creditai help                  # Show help
```

## 🎯 Best Practices

### Development Workflow
1. **Initial Setup**: Use `npm run setup:quick` for development environment
2. **Regular Validation**: Run `npm run validate:quick` before major changes
3. **Troubleshooting**: Use `npm run diagnose` when encountering issues
4. **Testing**: Run comprehensive tests before deployment

### Production Deployment
1. **Staging First**: Always deploy to staging environment first
2. **Full Validation**: Run complete validation suite
3. **Backup**: Create configuration backups before deployment
4. **Monitoring**: Set up health monitoring and alerting

### Maintenance
1. **Regular Updates**: Update dependencies monthly
2. **Health Checks**: Run diagnostics weekly
3. **Backup Rotation**: Maintain multiple backup copies
4. **Documentation**: Keep deployment documentation updated

---

## 🆘 Getting Help

1. **CLI Help**: `npm run creditai help`
2. **Diagnostic Reports**: Check generated JSON reports
3. **Logs**: Review deployment and validation logs
4. **Documentation**: Refer to detailed guides in `docs/` directory
5. **Issues**: Check existing GitHub issues or create new ones

For immediate assistance, run the diagnostic tool:
```bash
npm run diagnose
```

This will generate a comprehensive report with specific recommendations for resolving any detected issues.