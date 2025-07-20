# Design Document

## Overview

This design establishes a complete Google Cloud infrastructure with Document AI and Vision API services, comprehensive environment configuration, and a robust monitoring database system. The infrastructure will provide reliable PDF processing capabilities with proper security, monitoring, and automated deployment procedures.

## Architecture

### High-Level Infrastructure Architecture

```
Google Cloud Project
├── Document AI Service (Primary PDF Processing)
├── Vision API Service (Fallback OCR)
├── Service Accounts & IAM (Authentication)
├── Cloud Storage (Temporary File Storage)
└── Cloud Monitoring (Service Health)

Application Environment
├── Environment Variables (.env.local)
├── Service Account Keys (google-cloud-key.json)
├── Configuration Validation
└── Automated Setup Scripts

Database Infrastructure
├── Monitoring Tables (PDF Processing Metrics)
├── Feedback Tables (User Feedback & System Performance)
├── Analytics Tables (Usage Statistics & Error Tracking)
└── Security Tables (Audit Logs & Access Control)
```

### Component Integration Flow

```
Setup Scripts → Google Cloud Project → Service Configuration → Credential Setup → Database Setup → Validation → Production Ready
```

## Components and Interfaces

### 1. Google Cloud Project Setup

**Purpose**: Create and configure a complete Google Cloud project with all required services

**Services to Enable**:
- Document AI API (documentai.googleapis.com)
- Cloud Vision API (vision.googleapis.com)
- Cloud Storage API (storage.googleapis.com)
- Cloud Monitoring API (monitoring.googleapis.com)
- Cloud Logging API (logging.googleapis.com)

**Project Configuration**:
- Billing account setup and verification
- API quotas and rate limits configuration
- Regional settings for optimal performance
- Security policies and access controls

### 2. Document AI Configuration

**Purpose**: Set up Document AI processors for credit report processing

**Processor Types**:
- **Form Parser**: For structured credit report forms
- **OCR Processor**: For text extraction from scanned documents
- **Layout Parser**: For complex multi-column credit reports

**Configuration Requirements**:
```typescript
interface DocumentAIConfig {
  projectId: string
  location: string // us or eu
  processorId: string
  processorVersion: string
  maxFileSize: number // 20MB limit
  supportedMimeTypes: string[] // PDF, PNG, JPEG, TIFF
}
```

### 3. Vision API Configuration

**Purpose**: Configure Vision API as fallback for OCR processing

**API Features to Enable**:
- Text Detection (DOCUMENT_TEXT_DETECTION)
- Image Properties (for quality assessment)
- Safe Search (for content filtering)

**Configuration Settings**:
```typescript
interface VisionAPIConfig {
  projectId: string
  maxImageSize: number // 20MB limit
  supportedFormats: string[]
  confidenceThreshold: number // 0.8
  languageHints: string[] // ['en']
}
```

### 4. Service Account and IAM Setup

**Purpose**: Create secure service accounts with minimal required permissions

**Service Account Roles**:
- `roles/documentai.apiUser` - Document AI access
- `roles/vision.imageAnnotator` - Vision API access
- `roles/storage.objectCreator` - Temporary file storage
- `roles/monitoring.metricWriter` - Metrics reporting
- `roles/logging.logWriter` - Error logging

**Security Configuration**:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### 5. Environment Configuration

**Purpose**: Configure all required environment variables for Google Cloud services

**Required Environment Variables**:
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
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json

# Gemini AI Configuration
GOOGLE_AI_API_KEY=your-gemini-api-key

# Monitoring Configuration
GOOGLE_CLOUD_MONITORING_ENABLED=true
GOOGLE_CLOUD_LOGGING_ENABLED=true
```

## Data Models

### Monitoring Database Schema

#### PDF Processing Metrics Table
```sql
CREATE TABLE pdf_processing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  processing_method VARCHAR(50) NOT NULL, -- 'document_ai', 'vision_api', 'fallback'
  file_size_bytes INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  success BOOLEAN NOT NULL,
  error_message TEXT,
  extracted_pages INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_processing_metrics_user_id (user_id),
  INDEX idx_processing_metrics_method (processing_method),
  INDEX idx_processing_metrics_created_at (created_at)
);
```

#### User Feedback Table
```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  processing_session_id UUID REFERENCES pdf_processing_metrics(id),
  feedback_type VARCHAR(20) NOT NULL, -- 'accuracy', 'performance', 'error', 'suggestion'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  extraction_accuracy_rating INTEGER CHECK (extraction_accuracy_rating >= 1 AND extraction_accuracy_rating <= 5),
  processing_speed_rating INTEGER CHECK (processing_speed_rating >= 1 AND processing_speed_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_user_feedback_user_id (user_id),
  INDEX idx_user_feedback_type (feedback_type),
  INDEX idx_user_feedback_created_at (created_at)
);
```

#### System Analytics Table
```sql
CREATE TABLE system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit VARCHAR(20), -- 'ms', 'bytes', 'count', 'percentage'
  tags JSONB, -- Additional metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_system_analytics_metric_name (metric_name),
  INDEX idx_system_analytics_recorded_at (recorded_at),
  INDEX idx_system_analytics_tags USING GIN (tags)
);
```

#### Error Tracking Table
```sql
CREATE TABLE error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id),
  request_path VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  severity VARCHAR(20) DEFAULT 'error', -- 'info', 'warning', 'error', 'critical'
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_error_tracking_type (error_type),
  INDEX idx_error_tracking_severity (severity),
  INDEX idx_error_tracking_created_at (created_at),
  INDEX idx_error_tracking_resolved (resolved)
);
```

## Error Handling

### Google Cloud Service Failures

**Document AI Failures**:
- Service unavailable → Fallback to Vision API
- Quota exceeded → Rate limiting with retry logic
- Invalid document → Clear error message with format requirements
- Processing timeout → Async processing with status updates

**Vision API Failures**:
- Service unavailable → Fallback to client-side OCR
- Image quality issues → Pre-processing and enhancement
- Text detection failures → Manual review workflow

**Authentication Failures**:
- Invalid credentials → Clear setup instructions
- Expired tokens → Automatic token refresh
- Permission denied → Service account role verification

### Database Failures

**Connection Issues**:
- Connection pool exhaustion → Queue management
- Database unavailable → Graceful degradation
- Query timeouts → Optimized queries and indexes

**Data Integrity**:
- Constraint violations → Validation before insert
- Duplicate entries → Upsert operations
- Schema changes → Migration scripts

## Testing Strategy

### Infrastructure Testing
- Google Cloud service connectivity tests
- Authentication and authorization validation
- API quota and rate limit testing
- Service account permission verification

### Database Testing
- Schema validation and migration testing
- Performance testing with large datasets
- Backup and recovery procedure testing
- Data integrity and constraint testing

### Integration Testing
- End-to-end PDF processing pipeline
- Monitoring data collection and storage
- Error handling and fallback mechanisms
- Multi-environment deployment testing

## Security Considerations

### Credential Management
- Service account keys stored securely
- Environment variable encryption
- Credential rotation procedures
- Access logging and monitoring

### Data Protection
- Encryption in transit (HTTPS/TLS)
- Encryption at rest (database and storage)
- PII masking and anonymization
- Secure data deletion procedures

### Access Control
- Least privilege principle
- Role-based access control (RBAC)
- API rate limiting and throttling
- Audit logging for all operations

## Deployment Strategy

### Phase 1: Google Cloud Setup
- Create Google Cloud project
- Enable required APIs and services
- Set up Document AI processors
- Configure service accounts and IAM

### Phase 2: Environment Configuration
- Generate and configure service account keys
- Set up environment variables
- Test authentication and connectivity
- Validate all service integrations

### Phase 3: Database Setup
- Create monitoring and feedback tables
- Set up indexes and constraints
- Configure backup procedures
- Test data collection and retrieval

### Phase 4: Automation and Validation
- Create setup and deployment scripts
- Implement validation and diagnostic tools
- Set up monitoring and alerting
- Document troubleshooting procedures

### Phase 5: Production Deployment
- Deploy to production environment
- Monitor service health and performance
- Collect initial usage metrics
- Iterate based on feedback and monitoring data