# CreditAI Production Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying CreditAI to production, including pre-deployment validation, deployment execution, post-deployment verification, and emergency procedures.

## Table of Contents

1. [Pre-Deployment Preparation](#pre-deployment-preparation)
2. [Environment Setup](#environment-setup)
3. [Deployment Execution](#deployment-execution)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Emergency Protocols](#emergency-protocols)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Team Communication](#team-communication)

## Pre-Deployment Preparation

### 1. Code and Build Validation

#### 1.1 Source Code Verification
```bash
# Verify all code is committed and pushed
git status
git log --oneline -10

# Ensure we're on the correct release branch
git branch --show-current
git tag --list | tail -5
```

#### 1.2 Build and Test Validation
```bash
# Run comprehensive test suite
npm run test:all
npm run test:integration
npm run test:security
npm run test:performance

# Build production artifacts
npm run build
npm run build:analyze

# Validate build output
ls -la .next/
```

#### 1.3 Dependency Security Audit
```bash
# Security audit
npm audit --audit-level high
npm run security:scan

# Check for known vulnerabilities
npm run security:vulnerability-scan
```

### 2. Infrastructure Readiness

#### 2.1 Server Infrastructure
- [ ] Production servers provisioned and configured
- [ ] Load balancers configured and tested
- [ ] SSL certificates installed and validated
- [ ] DNS records configured and propagated
- [ ] CDN configuration verified

#### 2.2 Database Infrastructure
- [ ] Production database cluster configured
- [ ] Read replicas set up and synchronized
- [ ] Backup systems configured and tested
- [ ] Connection pooling configured
- [ ] Database migrations tested in staging

#### 2.3 Third-Party Services
- [ ] Stripe production keys configured
- [ ] Google Cloud services configured
- [ ] Email service configured and tested
- [ ] Monitoring services configured
- [ ] Error tracking (Sentry) configured

### 3. Configuration Management

#### 3.1 Environment Variables
```bash
# Validate all required environment variables
node scripts/validate-production-env.js

# Check environment variable security
node scripts/security/validate-secrets.js
```

#### 3.2 Configuration Files
- [ ] `next.config.js` production settings verified
- [ ] Docker configurations validated
- [ ] Kubernetes manifests reviewed
- [ ] Nginx configurations tested

## Environment Setup

### 1. Production Environment Configuration

#### 1.1 Server Setup
```bash
# Connect to production server
ssh creditai-prod-01

# Verify system resources
free -h
df -h
htop

# Check service status
systemctl status nginx
systemctl status docker
systemctl status postgresql
```

#### 1.2 Docker Environment
```bash
# Pull latest production images
docker pull creditai:latest
docker pull postgres:15-alpine
docker pull nginx:alpine

# Verify image integrity
docker images --digests
```

#### 1.3 Database Setup
```bash
# Connect to production database
psql -h prod-db.creditai.com -U creditai_prod -d creditai_prod

# Run final migration check
npm run db:migration:status
npm run db:migration:validate
```

### 2. Secrets and Configuration Deployment

#### 2.1 Secrets Management
```bash
# Deploy secrets using secure method
kubectl apply -f k8s/production/secrets.yaml
# OR
docker secret create supabase_key /secure/supabase_key.txt
```

#### 2.2 Configuration Deployment
```bash
# Deploy configuration maps
kubectl apply -f k8s/production/configmap.yaml

# Verify configuration
kubectl get configmap creditai-config -o yaml
```

## Deployment Execution

### 1. Blue-Green Deployment Process

#### 1.1 Prepare Green Environment
```bash
# Deploy to green environment
kubectl apply -f k8s/production/deployment-green.yaml

# Wait for pods to be ready
kubectl rollout status deployment/creditai-green

# Verify green environment health
kubectl get pods -l app=creditai,version=green
kubectl logs -l app=creditai,version=green --tail=100
```

#### 1.2 Health Check Validation
```bash
# Run comprehensive health checks on green environment
node scripts/production-health-check.js --environment=green

# Test critical user journeys
node scripts/test-critical-paths.js --environment=green
```

#### 1.3 Switch Traffic to Green
```bash
# Update service selector to point to green
kubectl patch service creditai-service -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic routing
curl -I https://app.creditai.com/api/health
```

#### 1.4 Verify Production Traffic
```bash
# Monitor application metrics
kubectl top pods -l app=creditai,version=green

# Check application logs
kubectl logs -l app=creditai,version=green -f
```

### 2. Database Migration Execution

#### 2.1 Pre-Migration Backup
```bash
# Create full database backup
pg_dump -h prod-db.creditai.com -U creditai_prod -d creditai_prod \
  --format=custom --verbose --file=backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump

# Verify backup integrity
pg_restore --list backup_pre_migration_*.dump | head -20
```

#### 2.2 Migration Execution
```bash
# Run database migrations
npm run db:migrate:production

# Verify migration status
npm run db:migration:status

# Run data validation
npm run db:validate:production
```

### 3. Application Deployment

#### 3.1 Container Deployment
```bash
# Build and tag production image
docker build -t creditai:$(git rev-parse HEAD) .
docker tag creditai:$(git rev-parse HEAD) creditai:latest

# Push to production registry
docker push gcr.io/creditai-prod/creditai:$(git rev-parse HEAD)
docker push gcr.io/creditai-prod/creditai:latest
```

#### 3.2 Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/production/namespace.yaml
kubectl apply -f k8s/production/configmap.yaml
kubectl apply -f k8s/production/deployment.yaml
kubectl apply -f k8s/production/service.yaml
kubectl apply -f k8s/production/ingress.yaml
kubectl apply -f k8s/production/hpa.yaml

# Verify deployment
kubectl rollout status deployment/creditai
kubectl get pods -l app=creditai
```

## Post-Deployment Verification

### 1. Application Health Verification

#### 1.1 Health Check Endpoints
```bash
# Test all health check endpoints
curl -f https://app.creditai.com/api/health
curl -f https://app.creditai.com/api/system/health/database
curl -f https://app.creditai.com/api/system/health/redis
curl -f https://app.creditai.com/api/system/health/supabase
curl -f https://app.creditai.com/api/system/health/google-cloud
```

#### 1.2 Critical Path Testing
```bash
# Run critical user journey tests
node scripts/test-critical-paths.js --environment=production

# Test key functionality
node scripts/test-pdf-processing.js --environment=production
node scripts/test-stripe-integration.js --environment=production
```

### 2. Performance Verification

#### 2.1 Load Testing
```bash
# Run production load tests
npm run test:load:production

# Monitor performance metrics
node scripts/performance-monitor.js --duration=300
```

#### 2.2 Resource Utilization
```bash
# Check system resources
kubectl top nodes
kubectl top pods

# Verify autoscaling
kubectl get hpa
kubectl describe hpa creditai-hpa
```

### 3. Security Verification

#### 3.1 Security Headers
```bash
# Test security headers
curl -I https://app.creditai.com | grep -E "(X-|Strict-|Content-Security)"

# Run security scan
node scripts/security/production-security-scan.js
```

#### 3.2 SSL/TLS Verification
```bash
# Test SSL configuration
openssl s_client -connect app.creditai.com:443 -servername app.creditai.com

# Verify certificate
curl -vI https://app.creditai.com 2>&1 | grep -E "(subject|issuer|expire)"
```

### 4. Integration Testing

#### 4.1 Third-Party Integrations
```bash
# Test all third-party integrations
node scripts/validate-third-party-integrations.js --environment=production

# Verify API endpoints
curl -f https://app.creditai.com/api/stripe/health
curl -f https://app.creditai.com/api/google-cloud/health
```

#### 4.2 Data Flow Validation
```bash
# Test complete data flow
node scripts/data-flow-integrity-validation.js --environment=production

# Verify database connectivity
node scripts/test-database-operations.js --environment=production
```

## Rollback Procedures

### 1. Application Rollback

#### 1.1 Quick Rollback (Blue-Green)
```bash
# Switch traffic back to blue environment
kubectl patch service creditai-service -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify rollback
curl -I https://app.creditai.com/api/health

# Monitor application health
kubectl logs -l app=creditai,version=blue --tail=100
```

#### 1.2 Kubernetes Rollback
```bash
# Check rollout history
kubectl rollout history deployment/creditai

# Rollback to previous version
kubectl rollout undo deployment/creditai

# Verify rollback status
kubectl rollout status deployment/creditai
```

### 2. Database Rollback

#### 2.1 Migration Rollback
```bash
# Check migration status
npm run db:migration:status

# Rollback specific migration
npm run db:migration:rollback --steps=1

# Verify database state
npm run db:validate:production
```

#### 2.2 Database Restore
```bash
# If full restore needed
pg_restore -h prod-db.creditai.com -U creditai_prod -d creditai_prod \
  --verbose --clean --if-exists backup_pre_migration_*.dump

# Verify data integrity
npm run db:integrity:check
```

## Emergency Protocols

### 1. Incident Response

#### 1.1 Immediate Actions
1. **Alert Team**: Notify on-call team via Slack/PagerDuty
2. **Assess Impact**: Determine scope and severity
3. **Incident Commander**: Assign incident commander
4. **Status Page**: Update status page if customer-facing

#### 1.2 Communication Template
```
🚨 PRODUCTION INCIDENT - [SEVERITY]

Time: [TIMESTAMP]
Issue: [BRIEF DESCRIPTION]
Impact: [CUSTOMER IMPACT]
Status: [INVESTIGATING/IDENTIFIED/FIXING/RESOLVED]
ETA: [ESTIMATED RESOLUTION TIME]

Incident Commander: @[NAME]
Updates: Will update every 15 minutes
```

### 2. Emergency Contacts

#### 2.1 On-Call Rotation
- **Primary**: [Name] - [Phone] - [Email]
- **Secondary**: [Name] - [Phone] - [Email]
- **Escalation**: [Manager] - [Phone] - [Email]

#### 2.2 External Contacts
- **Infrastructure Provider**: [Support Number]
- **Database Provider**: [Support Number]
- **CDN Provider**: [Support Number]

### 3. Service Degradation Procedures

#### 3.1 Rate Limiting
```bash
# Implement emergency rate limiting
kubectl apply -f k8s/emergency/rate-limiting.yaml

# Monitor effectiveness
kubectl logs -l app=nginx-ingress --tail=100
```

#### 3.2 Feature Flags
```bash
# Disable non-critical features
curl -X POST https://app.creditai.com/api/feature-flags/emergency-disable \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"features": ["pdf-processing", "dispute-generation"]}'
```

## Monitoring and Alerting

### 1. Production Monitoring Setup

#### 1.1 Application Metrics
- Response time monitoring
- Error rate monitoring
- Throughput monitoring
- Database performance metrics

#### 1.2 Infrastructure Metrics
- CPU and memory utilization
- Disk space and I/O
- Network traffic
- Container health

#### 1.3 Business Metrics
- User registration rate
- PDF processing success rate
- Payment processing metrics
- Customer satisfaction scores

### 2. Alert Configuration

#### 2.1 Critical Alerts (Page immediately)
- Application downtime
- Database connectivity issues
- High error rates (>5%)
- Payment processing failures

#### 2.2 Warning Alerts (Slack notification)
- High response times (>2s)
- Resource utilization >80%
- Failed background jobs
- Third-party service degradation

## Team Communication

### 1. Deployment Communication

#### 1.1 Pre-Deployment Notification
```
📢 PRODUCTION DEPLOYMENT SCHEDULED

Date: [DATE]
Time: [TIME] (Expected duration: [DURATION])
Release: [VERSION/TAG]
Changes: [BRIEF SUMMARY]

Deployment Lead: @[NAME]
Expected Impact: [NONE/MINIMAL/BRIEF DOWNTIME]
```

#### 1.2 Deployment Progress Updates
- **Started**: Deployment process initiated
- **Database Migration**: Database changes in progress
- **Application Update**: Application deployment in progress
- **Verification**: Post-deployment checks in progress
- **Complete**: Deployment successfully completed

### 2. Post-Deployment Report

#### 2.1 Success Report Template
```
✅ PRODUCTION DEPLOYMENT COMPLETE

Release: [VERSION]
Duration: [ACTUAL TIME]
Issues: [NONE/MINOR/RESOLVED]

Key Metrics:
- Deployment Time: [TIME]
- Downtime: [DURATION]
- Error Rate: [PERCENTAGE]
- Performance Impact: [DESCRIPTION]

Next Steps:
- [ ] Monitor for 24 hours
- [ ] Customer communication if needed
- [ ] Retrospective scheduled
```

## Appendix

### A. Useful Commands Reference

#### A.1 Kubernetes Commands
```bash
# Get pod status
kubectl get pods -l app=creditai

# Check logs
kubectl logs -l app=creditai --tail=100 -f

# Scale deployment
kubectl scale deployment creditai --replicas=5

# Port forward for debugging
kubectl port-forward svc/creditai-service 8080:80
```

#### A.2 Docker Commands
```bash
# Check running containers
docker ps

# View logs
docker logs creditai-container --tail=100 -f

# Execute commands in container
docker exec -it creditai-container /bin/sh
```

#### A.3 Database Commands
```bash
# Connect to database
psql -h prod-db.creditai.com -U creditai_prod -d creditai_prod

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('creditai_prod'));
```

### B. Troubleshooting Guide

#### B.1 Common Issues
1. **Pod CrashLoopBackOff**: Check application logs and resource limits
2. **Database Connection Issues**: Verify connection strings and network connectivity
3. **High Memory Usage**: Check for memory leaks and optimize queries
4. **Slow Response Times**: Analyze database queries and enable caching

#### B.2 Debug Commands
```bash
# Application debugging
kubectl describe pod [POD_NAME]
kubectl logs [POD_NAME] --previous

# Network debugging
kubectl exec -it [POD_NAME] -- wget -qO- http://service-name/health
kubectl exec -it [POD_NAME] -- nslookup service-name

# Resource debugging
kubectl top pod [POD_NAME]
kubectl describe hpa creditai-hpa
```

### C. Rollback Decision Matrix

| Severity | Impact | Rollback Decision |
|----------|--------|-------------------|
| Critical | System Down | Immediate rollback |
| High | Major features broken | Rollback within 15 minutes |
| Medium | Minor features affected | Fix forward or rollback |
| Low | Cosmetic issues | Fix forward |

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review**: $(date -d "+3 months")

**Approved by**: [Engineering Manager]  
**Reviewed by**: [DevOps Lead, Security Lead, Product Manager]