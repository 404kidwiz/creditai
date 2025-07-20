# CreditAI Monitoring System

A comprehensive monitoring, alerting, and observability platform for the CreditAI application.

## 🏗️ Architecture Overview

The monitoring system provides 100% system visibility through multiple integrated components:

- **OpenTelemetry**: Distributed tracing and metrics collection
- **Prometheus**: Metrics storage and alerting rules
- **Grafana**: Visualization dashboards and real-time monitoring
- **AlertManager**: Intelligent alerting with multiple notification channels
- **ELK Stack**: Centralized logging (Elasticsearch, Logstash, Kibana)
- **Jaeger**: Distributed tracing visualization
- **Custom Health Checks**: Application-specific health monitoring

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Monitoring Infrastructure

```bash
npm run setup-monitoring
```

### 3. Start Monitoring Stack

```bash
npm run start-monitoring
```

### 4. Start Application

```bash
npm run dev
```

## 📊 Monitoring Components

### OpenTelemetry Integration

- **Distributed Tracing**: Track requests across services
- **Automatic Instrumentation**: HTTP, database, and AI API calls
- **Custom Spans**: Business logic tracing
- **Context Propagation**: Correlate logs and traces

```typescript
import { withSpan } from '@/lib/monitoring/opentelemetry';

const result = await withSpan('credit-analysis', async () => {
  return analyzeCreditReport(data);
});
```

### Prometheus Metrics

- **HTTP Metrics**: Request rate, latency, error rate
- **Business Metrics**: Credit reports analyzed, dispute letters generated
- **System Metrics**: Memory, CPU, database performance
- **AI Model Metrics**: Token usage, response times, error rates

```typescript
import { recordBusinessMetrics } from '@/lib/monitoring/prometheus/metrics';

recordBusinessMetrics('credit_report', { 
  status: 'success', 
  provider: 'experian' 
});
```

### Health Monitoring

- **Database Connectivity**: Connection pool status
- **AI Model Availability**: Model health and performance
- **External APIs**: Third-party service status
- **System Resources**: Memory, CPU, disk usage
- **Environment Variables**: Required configuration validation

```bash
curl http://localhost:3000/api/system/health?detailed=true
```

### Alerting System

- **Intelligent Rules**: Configurable thresholds and conditions
- **Multiple Channels**: Email, Slack, webhooks, PagerDuty
- **Alert Grouping**: Reduce noise with smart aggregation
- **Cooldown Periods**: Prevent alert spam

## 🔧 Configuration

### Environment Variables

```bash
# OpenTelemetry
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=creditai-app

# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Alerting
ALERTS_ENABLED=true
ALERT_EVALUATION_INTERVAL=30
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-slack-webhook

# Health Checks
HEALTH_CHECKS_ENABLED=true
HEALTH_CHECK_INTERVAL=60

# Logging
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
```

### Alert Rules

Default alert rules are configured for:

- **High Error Rate**: >5% for 5 minutes
- **High Response Time**: >2 seconds for 5 minutes
- **Low Availability**: <99% for 10 minutes
- **High Memory Usage**: >90% for 5 minutes
- **Database Issues**: Connection failures or slow queries
- **AI Model Failures**: >10% error rate for 5 minutes
- **Payment Processing**: >2% error rate

## 📈 Dashboards

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (admin/admin123)

**System Overview Dashboard** includes:
- System status indicators
- Request rate and response time
- Error rate trends
- Memory and CPU usage
- AI model performance
- Database query performance
- Business metrics
- Active alerts

### Custom Metrics Dashboard

Monitor business-specific metrics:
- Credit reports processed per hour
- Dispute letters generated
- User registration trends
- Subscription revenue
- Success rates by feature

## 🚨 Alerting

### Alert Severity Levels

- **Critical**: Service unavailable, data corruption
- **Error**: Feature failures, high error rates
- **Warning**: Performance degradation, resource limits
- **Info**: Operational notifications

### Notification Channels

#### Slack Integration
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### Email Alerts
```bash
SMTP_SERVER=smtp.gmail.com:587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL=alerts@yourcompany.com
```

#### Webhook Integration
```bash
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
```

## 📝 Logging

### Structured Logging

All logs are structured JSON with consistent fields:

```json
{
  "timestamp": "2024-01-20T10:30:00.123Z",
  "level": "info",
  "message": "Credit report analyzed",
  "service": "creditai",
  "component": "ai-analyzer",
  "userId": "user_123",
  "requestId": "req_456",
  "duration": 2500,
  "metadata": {
    "reportId": "report_789",
    "provider": "experian",
    "confidence": 0.95
  }
}
```

### Log Levels

- **ERROR**: Application errors, exceptions
- **WARN**: Performance issues, deprecations
- **INFO**: Business events, user actions
- **DEBUG**: Detailed operational information
- **TRACE**: Very detailed debugging

### Centralized Logging (ELK Stack)

- **Elasticsearch**: Log storage and search
- **Logstash**: Log processing and enrichment
- **Kibana**: Log visualization and analysis

Access Kibana at `http://localhost:5601`

## 🔍 Observability

### Distributed Tracing

View request traces in Jaeger: `http://localhost:16686`

- End-to-end request tracing
- Performance bottleneck identification
- Service dependency mapping
- Error correlation across services

### Performance Monitoring

Track performance metrics:
- API endpoint latency
- Database query performance
- AI model response times
- Client-side performance

## 🛠️ Usage Examples

### Request Monitoring Middleware

```typescript
import { withRequestMonitoring } from '@/middleware/monitoring';

export const GET = withRequestMonitoring(async (req, context) => {
  // Your API logic here
  return NextResponse.json({ data });
});
```

### Database Monitoring

```typescript
import { withDatabaseMonitoring } from '@/middleware/monitoring';

const users = await withDatabaseMonitoring(
  'SELECT',
  'users',
  () => supabase.from('users').select('*')
);
```

### AI API Monitoring

```typescript
import { withAiMonitoring } from '@/middleware/monitoring';

const analysis = await withAiMonitoring(
  'google',
  'gemini-pro',
  () => model.generateContent(prompt)
);
```

### Business Event Tracking

```typescript
import { recordBusinessEvent } from '@/middleware/monitoring';

recordBusinessEvent('credit_report_analyzed', {
  reportId: 'report_123',
  provider: 'experian',
  status: 'success',
  confidence: 0.95,
  processingTime: 2500
}, userId);
```

### Security Event Monitoring

```typescript
import { recordSecurityEvent } from '@/middleware/monitoring';

recordSecurityEvent(
  'failed_login_attempt',
  'medium',
  { 
    email: 'user@example.com',
    attemptCount: 3 
  },
  userId,
  clientIp
);
```

## 📊 API Endpoints

### Health Check
```bash
GET /api/system/health
GET /api/system/health?check=database&detailed=true
```

### Metrics (Prometheus format)
```bash
GET /api/monitoring/metrics
```

### Dashboard Data
```bash
GET /api/monitoring/dashboard
```

### Alerts
```bash
GET /api/monitoring/alerts?state=active
POST /api/monitoring/alerts
```

## 🐳 Docker Services

The monitoring stack includes:

- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001`
- **AlertManager**: `http://localhost:9093`
- **Jaeger**: `http://localhost:16686`
- **Elasticsearch**: `http://localhost:9200`
- **Kibana**: `http://localhost:5601`

### Management Commands

```bash
# Start monitoring stack
npm run start-monitoring

# Stop monitoring stack
npm run stop-monitoring

# View logs
npm run monitoring-logs

# Check status
npm run monitoring-status
```

## 🔧 Troubleshooting

### Common Issues

1. **Services not starting**
   - Check Docker is running
   - Verify port availability
   - Check configuration files

2. **Metrics not appearing**
   - Verify Prometheus scrape configuration
   - Check application metrics endpoint
   - Validate metric names and labels

3. **Alerts not firing**
   - Check alert rule syntax
   - Verify metric data availability
   - Review alert evaluation logs

4. **High memory usage**
   - Adjust retention periods
   - Configure log rotation
   - Monitor metric cardinality

### Debug Commands

```bash
# Check application health
curl http://localhost:3000/api/system/health

# View Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test alert webhook
curl -X POST http://localhost:3000/api/monitoring/alerts \
  -H "Content-Type: application/json" \
  -d '{"metric": "test_metric", "value": 1}'

# View container logs
docker logs creditai-prometheus
docker logs creditai-grafana
```

## 📈 Performance

### Monitoring Overhead

- **CPU Impact**: <2% additional CPU usage
- **Memory Impact**: ~100MB for monitoring components
- **Network Impact**: ~1KB/request for telemetry data
- **Storage Impact**: Configurable retention (default: 15 days)

### Optimization

- Metric sampling for high-volume endpoints
- Log level configuration per environment
- Selective instrumentation for performance-critical paths
- Efficient metric aggregation

## 🔐 Security

### Data Privacy

- No sensitive data in metrics labels
- PII scrubbing in logs
- Secure credential storage
- Network isolation for monitoring stack

### Access Control

- Dashboard authentication
- API endpoint protection
- Role-based access control
- Audit logging

## 📚 Best Practices

1. **Metric Naming**: Use consistent naming conventions
2. **Label Cardinality**: Avoid high-cardinality labels
3. **Alert Fatigue**: Configure appropriate thresholds
4. **Log Sampling**: Sample high-volume debug logs
5. **Dashboard Design**: Focus on actionable metrics
6. **Incident Response**: Document alert runbooks

## 🤝 Contributing

When adding new monitoring:

1. Add relevant metrics to Prometheus
2. Create appropriate health checks
3. Configure alert rules if needed
4. Update dashboard visualizations
5. Document new monitoring points

## 📞 Support

For monitoring system support:

1. Check health endpoints first
2. Review Grafana dashboards
3. Examine application logs
4. Consult alert history
5. Use diagnostic scripts

---

*This monitoring system provides comprehensive observability for the CreditAI platform, ensuring reliable service delivery and rapid incident response.*