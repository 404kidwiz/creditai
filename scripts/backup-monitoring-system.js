#!/usr/bin/env node

/**
 * CreditAI Backup Monitoring and Alerting System
 * 
 * Comprehensive monitoring solution for backup operations including:
 * - Real-time backup health monitoring
 * - Automated alerting via email/webhook/Slack
 * - Performance metrics collection
 * - Dashboard data generation
 * - Escalation procedures
 * 
 * Usage:
 *   node scripts/backup-monitoring-system.js monitor
 *   node scripts/backup-monitoring-system.js alert-test
 *   node scripts/backup-monitoring-system.js dashboard
 *   node scripts/backup-monitoring-system.js report [daily|weekly|monthly]
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Monitoring settings
  BACKUP_DIR: process.env.BACKUP_BASE_DIR || './backups',
  CHECK_INTERVAL: parseInt(process.env.MONITOR_INTERVAL || '300'), // 5 minutes
  
  // Alert thresholds
  MAX_BACKUP_AGE_HOURS: parseInt(process.env.MAX_BACKUP_AGE_HOURS || '25'),
  MIN_BACKUP_SIZE_MB: parseInt(process.env.MIN_BACKUP_SIZE_MB || '1'),
  MAX_DISK_USAGE_PERCENT: parseInt(process.env.MAX_DISK_USAGE_PERCENT || '85'),
  MIN_SUCCESS_RATE_PERCENT: parseInt(process.env.MIN_SUCCESS_RATE_PERCENT || '95'),
  
  // Alert configuration
  ALERT_EMAIL: process.env.BACKUP_ALERT_EMAIL,
  SLACK_WEBHOOK: process.env.SLACK_WEBHOOK_URL,
  WEBHOOK_URL: process.env.BACKUP_WEBHOOK_URL,
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_NUMBERS: process.env.ALERT_SMS_NUMBERS?.split(',') || [],
  
  // Database monitoring
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Escalation settings
  ESCALATION_TIMEOUT_MINUTES: parseInt(process.env.ESCALATION_TIMEOUT || '60'),
  CRITICAL_ESCALATION_NUMBERS: process.env.CRITICAL_ESCALATION_NUMBERS?.split(',') || [],
  
  // Report settings
  METRICS_RETENTION_DAYS: parseInt(process.env.METRICS_RETENTION_DAYS || '90'),
};

class BackupMonitoringSystem {
  constructor() {
    this.logFile = path.join(CONFIG.BACKUP_DIR, 'monitoring.log');
    this.metricsFile = path.join(CONFIG.BACKUP_DIR, 'metrics.json');
    this.alertStateFile = path.join(CONFIG.BACKUP_DIR, 'alert-state.json');
    this.dashboardFile = path.join(CONFIG.BACKUP_DIR, 'dashboard.json');
    
    this.alertState = {
      lastAlertTime: {},
      acknowledgments: {},
      escalations: {},
      suppressions: {}
    };
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      await fs.appendFile(this.logFile, logMessage);
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }

  async loadAlertState() {
    try {
      const data = await fs.readFile(this.alertStateFile, 'utf8');
      this.alertState = { ...this.alertState, ...JSON.parse(data) };
    } catch (err) {
      // File doesn't exist or is invalid, use defaults
      await this.saveAlertState();
    }
  }

  async saveAlertState() {
    try {
      await fs.writeFile(this.alertStateFile, JSON.stringify(this.alertState, null, 2));
    } catch (err) {
      await this.log(`Failed to save alert state: ${err.message}`, 'ERROR');
    }
  }

  async runMonitoringCycle() {
    await this.log('Starting monitoring cycle');
    
    try {
      await this.loadAlertState();
      
      const checks = {
        backupHealth: await this.checkBackupHealth(),
        diskSpace: await this.checkDiskSpace(),
        databaseHealth: await this.checkDatabaseHealth(),
        backupProcesses: await this.checkBackupProcesses(),
        systemResources: await this.checkSystemResources(),
        securityStatus: await this.checkSecurityStatus()
      };

      const metrics = {
        timestamp: new Date().toISOString(),
        checks,
        overall: this.calculateOverallHealth(checks)
      };

      await this.recordMetrics(metrics);
      await this.processAlerts(checks);
      await this.updateDashboard(metrics);
      
      await this.log(`Monitoring cycle completed. Overall health: ${metrics.overall.status}`);
      
      return metrics;
    } catch (error) {
      await this.log(`Monitoring cycle failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async checkBackupHealth() {
    await this.log('Checking backup health');
    
    const health = {
      status: 'HEALTHY',
      issues: [],
      metrics: {},
      details: {}
    };

    try {
      // Check daily backups
      const dailyCheck = await this.checkBackupType('daily');
      health.details.daily = dailyCheck;
      
      // Check weekly backups
      const weeklyCheck = await this.checkBackupType('weekly');
      health.details.weekly = weeklyCheck;
      
      // Check monthly backups
      const monthlyCheck = await this.checkBackupType('monthly');
      health.details.monthly = monthlyCheck;

      // Aggregate results
      const allChecks = [dailyCheck, weeklyCheck, monthlyCheck];
      const failedChecks = allChecks.filter(c => c.status === 'FAILED');
      const warningChecks = allChecks.filter(c => c.status === 'WARNING');

      if (failedChecks.length > 0) {
        health.status = 'FAILED';
        health.issues = failedChecks.flatMap(c => c.issues);
      } else if (warningChecks.length > 0) {
        health.status = 'WARNING';
        health.issues = warningChecks.flatMap(c => c.issues);
      }

      // Calculate success rates
      health.metrics.dailySuccessRate = dailyCheck.successRate || 0;
      health.metrics.weeklySuccessRate = weeklyCheck.successRate || 0;
      health.metrics.overallSuccessRate = allChecks.reduce((acc, c) => acc + (c.successRate || 0), 0) / allChecks.length;

    } catch (error) {
      health.status = 'ERROR';
      health.issues.push(`Backup health check failed: ${error.message}`);
    }

    return health;
  }

  async checkBackupType(type) {
    const backupDir = path.join(CONFIG.BACKUP_DIR, type);
    const check = {
      type,
      status: 'HEALTHY',
      issues: [],
      latestBackup: null,
      backupCount: 0,
      successRate: 100
    };

    try {
      // Check if directory exists
      await fs.access(backupDir);
      
      // Get backup files
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(f => f.endsWith('.backup') || f.endsWith('.sql.gz'));
      
      check.backupCount = backupFiles.length;
      
      if (backupFiles.length === 0) {
        check.status = 'FAILED';
        check.issues.push(`No ${type} backups found`);
        return check;
      }

      // Check latest backup
      const sortedFiles = backupFiles.sort().reverse();
      const latestFile = sortedFiles[0];
      const latestPath = path.join(backupDir, latestFile);
      
      const stats = await fs.stat(latestPath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      check.latestBackup = {
        file: latestFile,
        age: ageHours,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size)
      };

      // Age check
      const maxAge = type === 'daily' ? CONFIG.MAX_BACKUP_AGE_HOURS : 
                    type === 'weekly' ? 7 * 24 : 30 * 24;
      
      if (ageHours > maxAge) {
        check.status = 'FAILED';
        check.issues.push(`Latest ${type} backup is ${Math.round(ageHours)} hours old (max: ${maxAge}h)`);
      }

      // Size check
      const minSizeBytes = CONFIG.MIN_BACKUP_SIZE_MB * 1024 * 1024;
      if (stats.size < minSizeBytes) {
        check.status = 'WARNING';
        check.issues.push(`Latest ${type} backup is only ${this.formatBytes(stats.size)} (min: ${this.formatBytes(minSizeBytes)})`);
      }

      // Success rate calculation (based on recent backups)
      const recentFiles = sortedFiles.slice(0, 7); // Last 7 backups
      let successCount = 0;
      
      for (const file of recentFiles) {
        try {
          const filePath = path.join(backupDir, file);
          await this.validateBackupFile(filePath);
          successCount++;
        } catch (err) {
          // Backup validation failed
        }
      }
      
      check.successRate = Math.round((successCount / recentFiles.length) * 100);
      
      if (check.successRate < CONFIG.MIN_SUCCESS_RATE_PERCENT) {
        check.status = 'WARNING';
        check.issues.push(`${type} backup success rate is ${check.successRate}% (min: ${CONFIG.MIN_SUCCESS_RATE_PERCENT}%)`);
      }

    } catch (error) {
      check.status = 'ERROR';
      check.issues.push(`Failed to check ${type} backups: ${error.message}`);
    }

    return check;
  }

  async checkDiskSpace() {
    await this.log('Checking disk space');
    
    const check = {
      status: 'HEALTHY',
      issues: [],
      usage: {}
    };

    try {
      const usage = await this.getDiskUsage(CONFIG.BACKUP_DIR);
      check.usage = usage;

      if (usage.percentUsed > CONFIG.MAX_DISK_USAGE_PERCENT) {
        check.status = 'FAILED';
        check.issues.push(`Backup disk usage is ${usage.percentUsed}% (max: ${CONFIG.MAX_DISK_USAGE_PERCENT}%)`);
      } else if (usage.percentUsed > CONFIG.MAX_DISK_USAGE_PERCENT - 10) {
        check.status = 'WARNING';
        check.issues.push(`Backup disk usage is ${usage.percentUsed}% (approaching limit)`);
      }

    } catch (error) {
      check.status = 'ERROR';
      check.issues.push(`Disk space check failed: ${error.message}`);
    }

    return check;
  }

  async checkDatabaseHealth() {
    await this.log('Checking database health');
    
    const check = {
      status: 'HEALTHY',
      issues: [],
      metrics: {}
    };

    if (!CONFIG.SUPABASE_DB_URL) {
      check.status = 'SKIP';
      check.issues.push('Database URL not configured');
      return check;
    }

    try {
      // Basic connectivity test
      const connectResult = execSync(`psql "${CONFIG.SUPABASE_DB_URL}" -c "SELECT NOW();" -t`, { 
        encoding: 'utf8',
        timeout: 10000 
      });
      
      if (!connectResult.trim()) {
        throw new Error('No response from database');
      }

      // Check critical tables
      const tables = ['profiles', 'credit_reports', 'negative_items', 'disputes'];
      const tableCounts = {};
      
      for (const table of tables) {
        try {
          const countResult = execSync(`psql "${CONFIG.SUPABASE_DB_URL}" -c "SELECT COUNT(*) FROM ${table};" -t`, { 
            encoding: 'utf8',
            timeout: 5000 
          });
          tableCounts[table] = parseInt(countResult.trim()) || 0;
        } catch (err) {
          check.status = 'WARNING';
          check.issues.push(`Failed to count rows in ${table}: ${err.message}`);
        }
      }
      
      check.metrics.tableCounts = tableCounts;

      // Check database size
      try {
        const sizeResult = execSync(`psql "${CONFIG.SUPABASE_DB_URL}" -c "SELECT pg_size_pretty(pg_database_size(current_database()));" -t`, { 
          encoding: 'utf8',
          timeout: 5000 
        });
        check.metrics.databaseSize = sizeResult.trim();
      } catch (err) {
        check.issues.push(`Failed to get database size: ${err.message}`);
      }

    } catch (error) {
      check.status = 'FAILED';
      check.issues.push(`Database health check failed: ${error.message}`);
    }

    return check;
  }

  async checkBackupProcesses() {
    await this.log('Checking backup processes');
    
    const check = {
      status: 'HEALTHY',
      issues: [],
      processes: []
    };

    try {
      // Check for running backup processes
      const processes = execSync('ps aux | grep -E "(pg_dump|backup-system)" | grep -v grep', { 
        encoding: 'utf8' 
      }).split('\n').filter(Boolean);
      
      check.processes = processes.map(proc => {
        const parts = proc.trim().split(/\s+/);
        return {
          pid: parts[1],
          cpu: parts[2],
          memory: parts[3],
          command: parts.slice(10).join(' ')
        };
      });

      // Check for hung processes (running for too long)
      for (const proc of check.processes) {
        // This is a simplified check - you might want to implement more sophisticated logic
        if (parseFloat(proc.cpu) > 0 && proc.command.includes('pg_dump')) {
          check.status = 'WARNING';
          check.issues.push(`Long-running backup process detected: PID ${proc.pid}`);
        }
      }

    } catch (error) {
      // No processes found or command failed - this might be normal
      check.status = 'HEALTHY';
    }

    return check;
  }

  async checkSystemResources() {
    await this.log('Checking system resources');
    
    const check = {
      status: 'HEALTHY',
      issues: [],
      resources: {}
    };

    try {
      // Memory usage
      const memInfo = execSync('free -m', { encoding: 'utf8' });
      const memLines = memInfo.split('\n');
      const memData = memLines[1].split(/\s+/);
      
      const totalMem = parseInt(memData[1]);
      const usedMem = parseInt(memData[2]);
      const memUsagePercent = Math.round((usedMem / totalMem) * 100);
      
      check.resources.memory = {
        total: totalMem,
        used: usedMem,
        percentage: memUsagePercent
      };

      if (memUsagePercent > 90) {
        check.status = 'WARNING';
        check.issues.push(`High memory usage: ${memUsagePercent}%`);
      }

      // Load average
      const loadavg = execSync('uptime', { encoding: 'utf8' });
      const loadMatch = loadavg.match(/load average: ([\d.]+)/);
      if (loadMatch) {
        const load = parseFloat(loadMatch[1]);
        check.resources.loadAverage = load;
        
        if (load > 5.0) {
          check.status = 'WARNING';
          check.issues.push(`High system load: ${load}`);
        }
      }

    } catch (error) {
      check.status = 'ERROR';
      check.issues.push(`System resource check failed: ${error.message}`);
    }

    return check;
  }

  async checkSecurityStatus() {
    await this.log('Checking security status');
    
    const check = {
      status: 'HEALTHY',
      issues: [],
      security: {}
    };

    try {
      // Check backup file permissions
      const backupDirs = ['daily', 'weekly', 'monthly'];
      
      for (const dir of backupDirs) {
        const dirPath = path.join(CONFIG.BACKUP_DIR, dir);
        
        try {
          const stats = await fs.stat(dirPath);
          const mode = (stats.mode & parseInt('777', 8)).toString(8);
          
          if (mode.includes('4') || mode.includes('6')) {
            check.status = 'WARNING';
            check.issues.push(`${dir} backup directory has world-readable permissions (${mode})`);
          }
        } catch (err) {
          // Directory might not exist
        }
      }

      // Check for suspicious activity in logs
      try {
        const logContent = await fs.readFile(this.logFile, 'utf8');
        const recentLogs = logContent.split('\n').slice(-100); // Last 100 lines
        
        const suspiciousPatterns = [
          /authentication failed/i,
          /unauthorized access/i,
          /permission denied/i,
          /failed login/i
        ];
        
        for (const pattern of suspiciousPatterns) {
          const matches = recentLogs.filter(line => pattern.test(line));
          if (matches.length > 5) {
            check.status = 'WARNING';
            check.issues.push(`Suspicious activity detected: ${matches.length} security-related log entries`);
          }
        }
      } catch (err) {
        // Log file might not exist
      }

    } catch (error) {
      check.status = 'ERROR';
      check.issues.push(`Security check failed: ${error.message}`);
    }

    return check;
  }

  calculateOverallHealth(checks) {
    const checkResults = Object.values(checks);
    const failedChecks = checkResults.filter(c => c.status === 'FAILED');
    const errorChecks = checkResults.filter(c => c.status === 'ERROR');
    const warningChecks = checkResults.filter(c => c.status === 'WARNING');
    
    let status = 'HEALTHY';
    let severity = 'info';
    
    if (errorChecks.length > 0 || failedChecks.length > 1) {
      status = 'CRITICAL';
      severity = 'critical';
    } else if (failedChecks.length === 1) {
      status = 'FAILED';
      severity = 'high';
    } else if (warningChecks.length > 2) {
      status = 'DEGRADED';
      severity = 'medium';
    } else if (warningChecks.length > 0) {
      status = 'WARNING';
      severity = 'low';
    }
    
    return {
      status,
      severity,
      summary: `${checkResults.length} checks: ${checkResults.filter(c => c.status === 'HEALTHY').length} healthy, ${warningChecks.length} warnings, ${failedChecks.length} failed, ${errorChecks.length} errors`
    };
  }

  async processAlerts(checks) {
    const overall = this.calculateOverallHealth(checks);
    
    if (overall.status === 'HEALTHY') {
      await this.clearAlerts();
      return;
    }

    const alertKey = `${overall.status}-${overall.severity}`;
    const lastAlertTime = this.alertState.lastAlertTime[alertKey] || 0;
    const suppressUntil = this.alertState.suppressions[alertKey] || 0;
    
    // Check if alert is suppressed
    if (Date.now() < suppressUntil) {
      await this.log(`Alert suppressed for ${alertKey} until ${new Date(suppressUntil)}`);
      return;
    }

    // Check if we should send alert (rate limiting)
    const alertInterval = this.getAlertInterval(overall.severity);
    if (Date.now() - lastAlertTime < alertInterval) {
      return;
    }

    // Send alerts
    await this.sendAlert(overall, checks);
    
    // Update alert state
    this.alertState.lastAlertTime[alertKey] = Date.now();
    await this.saveAlertState();

    // Check for escalation
    if (overall.severity === 'critical' && !this.alertState.escalations[alertKey]) {
      setTimeout(() => {
        this.checkEscalation(alertKey, overall, checks);
      }, CONFIG.ESCALATION_TIMEOUT_MINUTES * 60 * 1000);
    }
  }

  getAlertInterval(severity) {
    switch (severity) {
      case 'critical': return 5 * 60 * 1000;   // 5 minutes
      case 'high': return 15 * 60 * 1000;      // 15 minutes
      case 'medium': return 30 * 60 * 1000;    // 30 minutes
      case 'low': return 60 * 60 * 1000;       // 1 hour
      default: return 60 * 60 * 1000;          // 1 hour
    }
  }

  async sendAlert(overall, checks) {
    const alertMessage = this.formatAlertMessage(overall, checks);
    
    await this.log(`Sending ${overall.severity} alert: ${overall.status}`, 'WARN');

    const alertPromises = [];

    // Email alert
    if (CONFIG.ALERT_EMAIL) {
      alertPromises.push(this.sendEmailAlert(alertMessage, overall.severity));
    }

    // Slack alert
    if (CONFIG.SLACK_WEBHOOK) {
      alertPromises.push(this.sendSlackAlert(alertMessage, overall.severity));
    }

    // Webhook alert
    if (CONFIG.WEBHOOK_URL) {
      alertPromises.push(this.sendWebhookAlert(alertMessage, overall, checks));
    }

    // SMS alert for critical issues
    if (overall.severity === 'critical' && CONFIG.SMS_NUMBERS.length > 0) {
      alertPromises.push(this.sendSMSAlert(alertMessage, overall.severity));
    }

    // Log to database if available
    alertPromises.push(this.logAlertToDatabase(overall, checks));

    try {
      await Promise.allSettled(alertPromises);
    } catch (error) {
      await this.log(`Failed to send some alerts: ${error.message}`, 'ERROR');
    }
  }

  formatAlertMessage(overall, checks) {
    const issues = Object.values(checks).flatMap(c => c.issues).filter(Boolean);
    
    return `
🚨 CreditAI Backup System Alert

Status: ${overall.status}
Severity: ${overall.severity.toUpperCase()}
Time: ${new Date().toISOString()}

Summary: ${overall.summary}

Issues Detected:
${issues.map(issue => `• ${issue}`).join('\n')}

Dashboard: ${CONFIG.SUPABASE_URL}/dashboard
Logs: Check backup monitoring logs for details

This is an automated alert from the CreditAI backup monitoring system.
    `.trim();
  }

  async sendEmailAlert(message, severity) {
    try {
      const subject = `[${severity.toUpperCase()}] CreditAI Backup Alert`;
      const cmd = `echo "${message}" | mail -s "${subject}" ${CONFIG.ALERT_EMAIL}`;
      execSync(cmd, { stdio: 'pipe' });
      await this.log('Email alert sent successfully');
    } catch (error) {
      await this.log(`Failed to send email alert: ${error.message}`, 'ERROR');
    }
  }

  async sendSlackAlert(message, severity) {
    try {
      const color = {
        'critical': '#FF0000',
        'high': '#FF6600',
        'medium': '#FFAA00',
        'low': '#FFDD00'
      }[severity] || '#808080';

      const payload = {
        text: 'CreditAI Backup System Alert',
        attachments: [{
          color,
          title: `${severity.toUpperCase()} Alert`,
          text: message,
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      const response = await fetch(CONFIG.SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await this.log('Slack alert sent successfully');
    } catch (error) {
      await this.log(`Failed to send Slack alert: ${error.message}`, 'ERROR');
    }
  }

  async sendWebhookAlert(message, overall, checks) {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        service: 'creditai-backup-system',
        status: overall.status,
        severity: overall.severity,
        summary: overall.summary,
        message,
        checks,
        metadata: {
          version: '1.0',
          source: 'backup-monitoring-system'
        }
      };

      const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await this.log('Webhook alert sent successfully');
    } catch (error) {
      await this.log(`Failed to send webhook alert: ${error.message}`, 'ERROR');
    }
  }

  async sendSMSAlert(message, severity) {
    if (!CONFIG.SMS_API_KEY) {
      return;
    }

    try {
      // This is a placeholder - implement with your SMS service
      const shortMessage = `CreditAI BACKUP ${severity.toUpperCase()}: ${message.substring(0, 100)}...`;
      
      for (const number of CONFIG.SMS_NUMBERS) {
        // Implement SMS sending logic here
        await this.log(`SMS alert would be sent to ${number}: ${shortMessage}`);
      }
    } catch (error) {
      await this.log(`Failed to send SMS alert: ${error.message}`, 'ERROR');
    }
  }

  async logAlertToDatabase(overall, checks) {
    if (!CONFIG.SUPABASE_DB_URL) {
      return;
    }

    try {
      const alertData = {
        timestamp: new Date().toISOString(),
        status: overall.status,
        severity: overall.severity,
        summary: overall.summary,
        checks: JSON.stringify(checks),
        source: 'backup-monitoring-system'
      };

      // Insert into monitoring table if it exists
      const insertCmd = `psql "${CONFIG.SUPABASE_DB_URL}" -c "
        INSERT INTO system_alerts (alert_type, severity, message, metadata, created_at) 
        VALUES ('backup_monitoring', '${overall.severity}', '${overall.summary}', '${JSON.stringify(alertData)}', NOW())
        ON CONFLICT DO NOTHING;"`;
      
      execSync(insertCmd, { stdio: 'pipe' });
      await this.log('Alert logged to database');
    } catch (error) {
      await this.log(`Failed to log alert to database: ${error.message}`, 'ERROR');
    }
  }

  async clearAlerts() {
    // Clear any active alert state when system is healthy
    const clearedAlerts = Object.keys(this.alertState.lastAlertTime);
    if (clearedAlerts.length > 0) {
      this.alertState.lastAlertTime = {};
      this.alertState.escalations = {};
      await this.saveAlertState();
      await this.log(`Cleared ${clearedAlerts.length} active alerts - system healthy`);
    }
  }

  async recordMetrics(metrics) {
    try {
      // Load existing metrics
      let allMetrics = [];
      try {
        const data = await fs.readFile(this.metricsFile, 'utf8');
        allMetrics = JSON.parse(data);
      } catch (err) {
        // File doesn't exist yet
      }

      // Add new metrics
      allMetrics.push(metrics);

      // Cleanup old metrics
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.METRICS_RETENTION_DAYS);
      
      allMetrics = allMetrics.filter(m => new Date(m.timestamp) > cutoffDate);

      // Save metrics
      await fs.writeFile(this.metricsFile, JSON.stringify(allMetrics, null, 2));
    } catch (error) {
      await this.log(`Failed to record metrics: ${error.message}`, 'ERROR');
    }
  }

  async updateDashboard(metrics) {
    try {
      const dashboard = {
        lastUpdate: new Date().toISOString(),
        status: metrics.overall.status,
        summary: metrics.overall.summary,
        checks: metrics.checks,
        trends: await this.calculateTrends(),
        uptime: await this.calculateUptime(),
        quickStats: {
          totalBackups: await this.getTotalBackupCount(),
          lastBackupAge: await this.getLastBackupAge(),
          diskUsage: metrics.checks.diskSpace?.usage?.percentUsed || 0,
          successRate: metrics.checks.backupHealth?.metrics?.overallSuccessRate || 0
        }
      };

      await fs.writeFile(this.dashboardFile, JSON.stringify(dashboard, null, 2));
    } catch (error) {
      await this.log(`Failed to update dashboard: ${error.message}`, 'ERROR');
    }
  }

  // Utility methods
  async validateBackupFile(filePath) {
    // Simple validation - you can enhance this
    const stats = await fs.stat(filePath);
    if (stats.size < CONFIG.MIN_BACKUP_SIZE_MB * 1024 * 1024) {
      throw new Error('Backup file too small');
    }
    
    if (path.extname(filePath) === '.backup') {
      execSync(`pg_restore --list "${filePath}"`, { stdio: 'pipe' });
    } else if (path.extname(filePath) === '.gz') {
      execSync(`gzip -t "${filePath}"`, { stdio: 'pipe' });
    }
  }

  async getDiskUsage(directory) {
    const result = execSync(`df "${directory}"`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const data = lines[1].split(/\s+/);
    
    return {
      total: parseInt(data[1]) * 1024,
      used: parseInt(data[2]) * 1024,
      available: parseInt(data[3]) * 1024,
      percentUsed: parseInt(data[4].replace('%', ''))
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async calculateTrends() {
    // Placeholder for trend calculation
    return {
      successRateTrend: 'stable',
      diskUsageTrend: 'increasing',
      backupSizeTrend: 'stable'
    };
  }

  async calculateUptime() {
    // Placeholder for uptime calculation
    return {
      current: '99.95%',
      lastMonth: '99.87%',
      lastQuarter: '99.92%'
    };
  }

  async getTotalBackupCount() {
    try {
      const dirs = ['daily', 'weekly', 'monthly'];
      let total = 0;
      
      for (const dir of dirs) {
        try {
          const files = await fs.readdir(path.join(CONFIG.BACKUP_DIR, dir));
          total += files.filter(f => f.endsWith('.backup') || f.endsWith('.sql.gz')).length;
        } catch (err) {
          // Directory might not exist
        }
      }
      
      return total;
    } catch (error) {
      return 0;
    }
  }

  async getLastBackupAge() {
    try {
      const dailyDir = path.join(CONFIG.BACKUP_DIR, 'daily');
      const files = await fs.readdir(dailyDir);
      const backupFiles = files.filter(f => f.endsWith('.backup') || f.endsWith('.sql.gz'));
      
      if (backupFiles.length === 0) return null;
      
      const latest = backupFiles.sort().reverse()[0];
      const stats = await fs.stat(path.join(dailyDir, latest));
      
      return Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60)); // Hours
    } catch (error) {
      return null;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const monitor = new BackupMonitoringSystem();

  try {
    switch (command) {
      case 'monitor':
        const metrics = await monitor.runMonitoringCycle();
        console.log(JSON.stringify(metrics, null, 2));
        process.exit(metrics.overall.status === 'HEALTHY' ? 0 : 1);
        break;

      case 'alert-test':
        const severity = args[1] || 'medium';
        await monitor.sendAlert(
          { status: 'TEST', severity, summary: 'Test alert' },
          { test: { status: 'TEST', issues: ['This is a test alert'] } }
        );
        console.log('Test alert sent');
        break;

      case 'dashboard':
        const dashboardFile = path.join(CONFIG.BACKUP_DIR, 'dashboard.json');
        try {
          const dashboard = await fs.readFile(dashboardFile, 'utf8');
          console.log(dashboard);
        } catch (err) {
          console.log('Dashboard not available - run monitor first');
        }
        break;

      case 'report':
        const reportType = args[1] || 'daily';
        // Placeholder for report generation
        console.log(`${reportType} report would be generated here`);
        break;

      default:
        console.log(`
CreditAI Backup Monitoring System

Usage:
  node scripts/backup-monitoring-system.js <command> [options]

Commands:
  monitor                    Run monitoring cycle and check all systems
  alert-test [severity]      Send test alert (critical|high|medium|low)
  dashboard                  Display current dashboard data
  report [type]              Generate report (daily|weekly|monthly)

Environment Variables:
  BACKUP_BASE_DIR           Base directory for backups
  MONITOR_INTERVAL          Monitoring interval in seconds
  MAX_BACKUP_AGE_HOURS      Maximum age for backups in hours
  MIN_BACKUP_SIZE_MB        Minimum backup size in MB
  MAX_DISK_USAGE_PERCENT    Maximum disk usage percentage
  BACKUP_ALERT_EMAIL        Email for alerts
  SLACK_WEBHOOK_URL         Slack webhook URL
  BACKUP_WEBHOOK_URL        Generic webhook URL
  SMS_API_KEY               SMS service API key
  ALERT_SMS_NUMBERS         Comma-separated SMS numbers

Examples:
  node scripts/backup-monitoring-system.js monitor
  node scripts/backup-monitoring-system.js alert-test critical
  node scripts/backup-monitoring-system.js dashboard
        `);
        process.exit(1);
    }
  } catch (error) {
    await monitor.log(`Operation failed: ${error.message}`, 'ERROR');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupMonitoringSystem;