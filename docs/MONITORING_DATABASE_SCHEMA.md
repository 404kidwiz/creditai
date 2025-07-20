# Monitoring Database Schema Documentation

## Overview

This document describes the comprehensive monitoring database schema implemented for the Google Cloud Infrastructure Setup. The schema provides robust tracking of PDF processing metrics, user feedback, system analytics, and error tracking to support reliable monitoring and performance optimization.

## Schema Components

### 1. PDF Processing Metrics Table

**Table**: `pdf_processing_metrics`

Enhanced table for tracking detailed PDF processing operations with Google Cloud services.

#### Key Columns:
- `id`: Unique identifier (UUID)
- `processing_id`: External processing session identifier
- `user_id`: Reference to authenticated user
- `file_name`, `file_size`, `file_type`: File metadata
- `processing_method`: Processing approach used
- `processing_time`: Duration in milliseconds
- `confidence`: Processing confidence score (0.00-1.00)
- `success`: Boolean success indicator
- `extracted_pages`: Number of pages successfully extracted
- `google_cloud_service`: Specific GCP service used ('document_ai', 'vision_api', 'fallback')
- `processor_version`: Version of the processor used
- `file_hash`: SHA-256 hash for deduplication
- `error_type`, `error_message`: Error details when processing fails

#### Indexes:
- User ID, creation date, processing method, success status
- Google Cloud service, file hash, extracted pages
- Confidence score for performance analysis

### 2. User Feedback Table

**Table**: `user_feedback`

Stores user feedback on PDF processing accuracy and performance.

#### Key Columns:
- `id`: Unique identifier (UUID)
- `user_id`: Reference to authenticated user
- `processing_session_id`: Links to specific PDF processing session
- `feedback_type`: Type of feedback ('accuracy', 'performance', 'error', 'suggestion')
- `rating`: Overall rating (1-5)
- `feedback_text`: Free-form feedback text
- `extraction_accuracy_rating`: Specific accuracy rating (1-5)
- `processing_speed_rating`: Specific speed rating (1-5)
- `created_at`, `updated_at`: Timestamps

#### Constraints:
- `feedback_type` must be one of: 'accuracy', 'performance', 'error', 'suggestion'
- `rating` must be between 1 and 5
- `extraction_accuracy_rating` and `processing_speed_rating` must be between 1 and 5

### 3. System Analytics Table

**Table**: `system_analytics`

General system analytics and performance metrics storage.

#### Key Columns:
- `id`: Unique identifier (UUID)
- `metric_name`: Name of the metric being tracked
- `metric_value`: Numeric value of the metric
- `metric_unit`: Unit of measurement ('ms', 'bytes', 'count', 'percentage')
- `tags`: Additional metadata as JSONB
- `component`: System component that generated the metric
- `environment`: Environment ('development', 'staging', 'production')
- `recorded_at`: When the metric was recorded
- `created_at`: When the record was created

#### Use Cases:
- API response times
- Memory usage metrics
- Database query performance
- Custom business metrics

### 4. Error Tracking Table

**Table**: `error_tracking`

Comprehensive error tracking with resolution management.

#### Key Columns:
- `id`: Unique identifier (UUID)
- `error_type`: Category of error
- `error_message`: Error description
- `stack_trace`: Full stack trace for debugging
- `user_id`: User associated with the error (if applicable)
- `request_path`: API endpoint where error occurred
- `user_agent`: Browser/client information
- `ip_address`: Client IP address
- `severity`: Error severity ('info', 'warning', 'error', 'critical')
- `resolved`: Whether the error has been resolved
- `resolved_by`: User who resolved the error
- `resolved_at`: When the error was resolved
- `resolution_notes`: Notes about the resolution

#### Constraints:
- `severity` must be one of: 'info', 'warning', 'error', 'critical'

## Analytics Functions

### 1. Enhanced Processing Metrics

**Function**: `get_enhanced_processing_metrics(timeframe_hours)`

Returns comprehensive processing statistics including:
- Total processed documents
- Success/failure rates
- Average confidence scores
- Processing time statistics
- Service usage breakdown (Document AI vs Vision API vs Fallback)
- Page extraction statistics

### 2. User Feedback Analytics

**Function**: `get_user_feedback_analytics(timeframe_hours)`

Returns user feedback analysis including:
- Total feedback count
- Average ratings (overall, accuracy, speed)
- Feedback breakdown by type
- Trend analysis

### 3. Error Analytics

**Function**: `get_error_analytics(timeframe_hours)`

Returns error analysis including:
- Total error count
- Resolution rates
- Error breakdown by type and severity
- Unresolved error tracking

### 4. System Analytics Summary

**Function**: `get_system_analytics_summary(metric_name_filter, timeframe_hours)`

Returns system performance metrics including:
- Metric aggregations (count, average, min, max)
- Latest values and timestamps
- Trend analysis for specific metrics

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

#### PDF Processing Metrics:
- Users can view their own processing metrics
- Service accounts can insert metrics
- Admins can view all metrics

#### User Feedback:
- Users can view, insert, and update their own feedback
- Admins can view all feedback

#### Error Tracking:
- Admins can view and update all errors
- Service accounts can insert errors
- Users cannot directly access error details

#### System Analytics:
- Admins can view all analytics
- Service accounts can insert analytics
- Regular users cannot access system analytics

### Data Protection

- Sensitive data is properly masked in logs
- IP addresses are stored for security analysis
- User agents are tracked for debugging
- Audit trails are maintained for all operations

## Maintenance and Cleanup

### Automated Cleanup

**Function**: `cleanup_monitoring_data()`

Automatically removes old data to maintain performance:
- PDF processing metrics: 90 days retention
- User feedback: 1 year retention
- Resolved errors: 30 days retention
- System analytics: 90 days retention
- Security audit logs: 90 days retention
- Acknowledged alerts: 30 days retention

### Performance Optimization

- Comprehensive indexing strategy for fast queries
- JSONB indexes for tag-based searches
- Partitioning considerations for high-volume tables
- Regular VACUUM operations for space reclamation

## Usage Examples

### Inserting PDF Processing Metrics

```sql
INSERT INTO pdf_processing_metrics (
    processing_id, user_id, file_name, file_size, file_type,
    processing_method, processing_time, confidence, success,
    extracted_pages, google_cloud_service, processor_version
) VALUES (
    'proc-123', 'user-uuid', 'credit-report.pdf', 1024000, 'application/pdf',
    'document_ai', 5000, 0.85, true,
    3, 'document_ai', 'v1.0'
);
```

### Recording User Feedback

```sql
INSERT INTO user_feedback (
    user_id, processing_session_id, feedback_type, rating,
    feedback_text, extraction_accuracy_rating, processing_speed_rating
) VALUES (
    'user-uuid', 'session-uuid', 'accuracy', 4,
    'Good extraction but missed some account numbers', 4, 5
);
```

### Tracking System Metrics

```sql
INSERT INTO system_analytics (
    metric_name, metric_value, metric_unit, tags, component, environment
) VALUES (
    'api_response_time', 250.5, 'ms', 
    '{"endpoint": "/api/process-pdf", "method": "POST"}',
    'api_server', 'production'
);
```

### Recording Errors

```sql
INSERT INTO error_tracking (
    error_type, error_message, stack_trace, user_id,
    request_path, severity
) VALUES (
    'processing_timeout', 'PDF processing timed out after 30 seconds',
    'Error: Timeout\n  at processDocument()', 'user-uuid',
    '/api/process-pdf', 'error'
);
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Processing Success Rate**: Should be > 95%
2. **Average Processing Time**: Should be < 10 seconds
3. **User Satisfaction**: Average rating should be > 4.0
4. **Error Rate**: Should be < 5%
5. **System Performance**: API response times < 500ms

### Alert Conditions

- Processing success rate drops below 90%
- Average processing time exceeds 15 seconds
- Critical errors occur
- User satisfaction drops below 3.5
- System performance degrades significantly

## Migration and Deployment

### Migration File

The schema is implemented in:
`supabase/migrations/20240123000000_monitoring_database_schema.sql`

### Validation Scripts

- `scripts/validate-sql-syntax.js`: Validates SQL syntax
- `scripts/validate-monitoring-database-schema.js`: Validates schema structure
- `scripts/test-monitoring-schema.js`: Tests functionality with sample data

### Deployment Steps

1. Run the migration: `supabase db push`
2. Validate schema: `node scripts/validate-monitoring-database-schema.js`
3. Test functionality: `node scripts/test-monitoring-schema.js`
4. Monitor initial data collection
5. Set up alerting based on key metrics

## Integration Points

### Application Integration

The monitoring schema integrates with:
- PDF processing pipeline (`src/lib/google-cloud/pdfProcessor.ts`)
- User feedback components (`src/components/analysis/UserFeedbackForm.tsx`)
- Monitoring dashboards (`src/components/monitoring/PDFProcessingMonitorDashboard.tsx`)
- Error tracking systems (`src/lib/security/auditLogger.ts`)

### API Endpoints

- `/api/monitoring/pdf-processing`: Processing metrics collection
- `/api/feedback/pdf-processing`: User feedback submission
- Admin monitoring endpoints for analytics and error tracking

This comprehensive monitoring database schema provides the foundation for reliable system monitoring, user feedback collection, and performance optimization in the Google Cloud infrastructure setup.