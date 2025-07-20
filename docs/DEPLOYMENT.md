# Enhanced Credit Analysis System - Production Deployment Guide

## Overview

This guide covers the complete deployment of the Enhanced Credit Analysis and EOSCAR system to production environment.

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04 LTS or newer
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 100GB SSD
- **CPU**: 4+ cores recommended
- **Network**: Stable internet connection with static IP

### Required Software

- **Node.js**: Version 18.x or newer
- **PostgreSQL**: Version 14.x or newer
- **Redis**: Version 6.x or newer
- **Nginx**: Version 1.18 or newer
- **SSL Certificate**: Valid SSL certificate for HTTPS

### Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/credit_analysis
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# AI Models
GOOGLE_AI_API_KEY=your-google-ai-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# External Services
CFPB_API_KEY=your-cfpb-key
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Monitoring
ALERT_EMAIL=admin@your-domain.com
DEPLOYMENT_WEBHOOK=https://hooks.slack.com/your-webhook

# Application
NODE_ENV=production
PORT=3000
APP_VERSION=1.0.0
```

## Deployment Steps

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git build-essential

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Create database user and database
sudo -u postgres createuser --interactive --pwprompt credit_analysis
sudo -u postgres createdb -O credit_analysis credit_analysis

# Configure PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: shared_buffers = 256MB, effective_cache_size = 1GB

sudo systemctl restart postgresql
```

### 3. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/credit-analysis.git
cd credit-analysis

# Install dependencies
npm ci --production

# Build application
npm run build

# Run database migrations
npm run db:migrate

# Deploy using the deployment script
sudo ./scripts/deploy-enhanced-services.sh --env production
```

### 4. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Update Nginx configuration with SSL
sudo nano /etc/nginx/sites-available/credit-analysis
# Update SSL certificate paths in the configuration
```

### 5. Monitoring Setup

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Configure log rotation
sudo cp /etc/logrotate.d/credit-analysis /etc/logrotate.d/

# Set up monitoring cron job
sudo crontab -e
# Add: */5 * * * * /usr/local/bin/credit-analysis-monitor.sh
```

## Service Management

### Systemd Service

The application runs as a systemd service:

```bash
# Check service status
sudo systemctl status credit-analysis

# Start/stop/restart service
sudo systemctl start credit-analysis
sudo systemctl stop credit-analysis
sudo systemctl restart credit-analysis

# View logs
sudo journalctl -u credit-analysis -f
```

### Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

## Health Checks and Monitoring

### Health Check Endpoints

- **Application Health**: `https://your-domain.com/health`
- **API Health**: `https://your-domain.com/api/health`
- **System Validation**: `https://your-domain.com/api/system/validate`

### Monitoring Commands

```bash
# Check application health
curl -f https://your-domain.com/health

# View application logs
tail -f /var/log/credit-analysis/application.log

# Monitor system resources
htop

# Check database performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis
redis-cli info
```

### Log Locations

- **Application Logs**: `/var/log/credit-analysis/`
- **Nginx Logs**: `/var/log/nginx/credit-analysis.*.log`
- **System Logs**: `/var/log/syslog`
- **Database Logs**: `/var/log/postgresql/`

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump credit_analysis > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql credit_analysis < backup_file.sql
```

### Application Backup

```bash
# Backup application files
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/credit-analysis/

# Backup configuration
cp -r /etc/credit-analysis/ /backup/config/
```

### Automated Backups

The deployment script sets up automated backups:

- **Daily**: Database and application files
- **Weekly**: Complete system backup
- **Monthly**: Archive backup to external storage

## Security Configuration

### Firewall Setup

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### SSL/TLS Configuration

- **TLS Version**: 1.2 and 1.3 only
- **Cipher Suites**: Strong ciphers only
- **HSTS**: Enabled with 1-year max-age
- **Certificate**: Auto-renewal with Certbot

### Security Headers

The Nginx configuration includes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`

## Performance Optimization

### Database Optimization

```sql
-- Run these queries to optimize database performance
ANALYZE;
REINDEX DATABASE credit_analysis;
VACUUM ANALYZE;
```

### Application Optimization

- **Caching**: Redis caching for AI model results
- **CDN**: Static assets served via CDN
- **Compression**: Gzip compression enabled
- **Connection Pooling**: Database connection pooling

### Monitoring Performance

```bash
# Check database performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Monitor application performance
curl -s https://your-domain.com/api/metrics | jq .

# Check system resources
free -h
df -h
iostat -x 1
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   # Check logs
   sudo journalctl -u credit-analysis -n 50
   
   # Check configuration
   sudo systemctl status credit-analysis
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   psql -h localhost -U credit_analysis -d credit_analysis
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **High Memory Usage**
   ```bash
   # Check memory usage
   free -h
   
   # Restart application
   sudo systemctl restart credit-analysis
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew
   ```

### Debug Commands

```bash
# Application debug mode
NODE_ENV=development npm start

# Database query debugging
sudo -u postgres psql -c "SET log_statement = 'all';"

# Network debugging
sudo netstat -tulpn | grep :3000
sudo ss -tulpn | grep :3000
```

## Maintenance

### Regular Maintenance Tasks

**Daily**:
- Check system health
- Review error logs
- Monitor disk space

**Weekly**:
- Update system packages
- Review performance metrics
- Check backup integrity

**Monthly**:
- Security updates
- Certificate renewal check
- Performance optimization review

### Update Procedure

```bash
# 1. Backup current system
sudo ./scripts/backup-system.sh

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci --production

# 4. Run migrations
npm run db:migrate

# 5. Build application
npm run build

# 6. Restart services
sudo systemctl restart credit-analysis
sudo systemctl reload nginx

# 7. Validate deployment
curl -f https://your-domain.com/health
```

## Support and Contacts

### Emergency Contacts

- **System Administrator**: admin@your-domain.com
- **Database Administrator**: dba@your-domain.com
- **On-Call Support**: +1-XXX-XXX-XXXX

### Documentation

- **API Documentation**: `https://your-domain.com/api/docs`
- **User Guide**: `docs/USER_GUIDE.md`
- **Development Guide**: `docs/DEVELOPMENT.md`

### Monitoring Dashboards

- **System Health**: `https://your-domain.com/admin/health`
- **Performance Metrics**: `https://your-domain.com/admin/metrics`
- **Error Tracking**: `https://your-domain.com/admin/errors`

---

**Last Updated**: $(date)
**Version**: 1.0.0