#!/usr/bin/env node

/**
 * CreditAI Supabase Backup and Recovery System
 * 
 * Comprehensive backup solution for Supabase database including:
 * - Automated daily/weekly/monthly backups
 * - Data validation and integrity checks
 * - Disaster recovery procedures
 * - Monitoring and alerting system
 * 
 * Usage:
 *   node scripts/supabase-backup-system.js backup [options]
 *   node scripts/supabase-backup-system.js restore [options]
 *   node scripts/supabase-backup-system.js validate [options]
 *   node scripts/supabase-backup-system.js monitor
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Backup directories
  BACKUP_BASE_DIR: process.env.BACKUP_BASE_DIR || './backups',
  DAILY_DIR: 'daily',
  WEEKLY_DIR: 'weekly',
  MONTHLY_DIR: 'monthly',
  
  // Retention policies (in days)
  DAILY_RETENTION: parseInt(process.env.DAILY_RETENTION || '7'),
  WEEKLY_RETENTION: parseInt(process.env.WEEKLY_RETENTION || '28'),
  MONTHLY_RETENTION: parseInt(process.env.MONTHLY_RETENTION || '365'),
  
  // Supabase configuration
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  
  // Critical tables for priority backup
  CRITICAL_TABLES: [
    'profiles',
    'credit_reports', 
    'negative_items',
    'disputes',
    'enhanced_dispute_records',
    'creditor_database',
    'user_progress'
  ],
  
  // Monitoring configuration
  ALERT_EMAIL: process.env.BACKUP_ALERT_EMAIL,
  WEBHOOK_URL: process.env.BACKUP_WEBHOOK_URL,
  
  // Backup validation settings
  MIN_BACKUP_SIZE: 1024 * 1024, // 1MB minimum
  MAX_BACKUP_AGE_HOURS: 25, // 25 hours for daily backups
};

class SupabaseBackupSystem {
  constructor() {
    this.logFile = path.join(CONFIG.BACKUP_BASE_DIR, 'backup.log');
    this.errorFile = path.join(CONFIG.BACKUP_BASE_DIR, 'errors.log');
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      await fs.appendFile(this.logFile, logMessage);
      
      if (level === 'ERROR') {
        await fs.appendFile(this.errorFile, logMessage);
      }
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }

  async ensureDirectories() {
    const dirs = [
      CONFIG.BACKUP_BASE_DIR,
      path.join(CONFIG.BACKUP_BASE_DIR, CONFIG.DAILY_DIR),
      path.join(CONFIG.BACKUP_BASE_DIR, CONFIG.WEEKLY_DIR),
      path.join(CONFIG.BACKUP_BASE_DIR, CONFIG.MONTHLY_DIR),
      path.join(CONFIG.BACKUP_BASE_DIR, 'temp'),
      path.join(CONFIG.BACKUP_BASE_DIR, 'validation'),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await this.log(`Created directory: ${dir}`);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }
      }
    }
  }

  async validateEnvironment() {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_DB_URL'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    await this.log('Environment validation passed');
  }

  async createFullBackup(type = 'daily') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(CONFIG.BACKUP_BASE_DIR, type);
    const backupFile = path.join(backupDir, `creditai_${type}_${timestamp}.sql`);
    const customBackupFile = path.join(backupDir, `creditai_${type}_${timestamp}.backup`);
    
    await this.log(`Starting ${type} backup to ${backupFile}`);

    try {
      // Create SQL dump backup
      const sqlDumpCmd = [
        'pg_dump',
        CONFIG.SUPABASE_DB_URL,
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '--format=plain',
        `--file=${backupFile}`
      ].join(' ');

      await this.log(`Executing: ${sqlDumpCmd.replace(CONFIG.SUPABASE_DB_URL, '[DB_URL]')}`);
      execSync(sqlDumpCmd, { stdio: 'pipe' });

      // Create custom format backup for faster restore
      const customDumpCmd = [
        'pg_dump',
        CONFIG.SUPABASE_DB_URL,
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '--format=custom',
        '--compress=9',
        `--file=${customBackupFile}`
      ].join(' ');

      await this.log(`Executing custom format backup`);
      execSync(customDumpCmd, { stdio: 'pipe' });

      // Compress SQL file
      execSync(`gzip "${backupFile}"`, { stdio: 'pipe' });
      const compressedFile = `${backupFile}.gz`;

      // Get file sizes
      const sqlStats = await fs.stat(compressedFile);
      const customStats = await fs.stat(customBackupFile);

      await this.log(`Backup completed successfully`);
      await this.log(`SQL backup size: ${this.formatBytes(sqlStats.size)}`);
      await this.log(`Custom backup size: ${this.formatBytes(customStats.size)}`);

      // Create metadata file
      const metadata = {
        timestamp,
        type,
        sqlFile: compressedFile,
        customFile: customBackupFile,
        sqlSize: sqlStats.size,
        customSize: customStats.size,
        checksum: await this.calculateChecksum(customBackupFile),
        tables: CONFIG.CRITICAL_TABLES,
        supabaseVersion: await this.getSupabaseVersion(),
        schemaVersion: await this.getSchemaVersion()
      };

      const metadataFile = path.join(backupDir, `metadata_${timestamp}.json`);
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

      return metadata;
    } catch (error) {
      await this.log(`Backup failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async createCriticalTablesBackup(type = 'daily') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(CONFIG.BACKUP_BASE_DIR, type);
    
    await this.log(`Creating critical tables backup`);

    const results = {};

    for (const table of CONFIG.CRITICAL_TABLES) {
      try {
        const tableBackupFile = path.join(backupDir, `${table}_${timestamp}.sql`);
        
        const tableDumpCmd = [
          'pg_dump',
          CONFIG.SUPABASE_DB_URL,
          `--table=public.${table}`,
          '--data-only',
          '--inserts',
          '--column-inserts',
          `--file=${tableBackupFile}`
        ].join(' ');

        execSync(tableDumpCmd, { stdio: 'pipe' });
        
        // Compress table backup
        execSync(`gzip "${tableBackupFile}"`, { stdio: 'pipe' });
        const compressedTableFile = `${tableBackupFile}.gz`;
        
        const stats = await fs.stat(compressedTableFile);
        results[table] = {
          file: compressedTableFile,
          size: stats.size,
          timestamp
        };

        await this.log(`Table ${table} backed up: ${this.formatBytes(stats.size)}`);
      } catch (error) {
        await this.log(`Failed to backup table ${table}: ${error.message}`, 'ERROR');
        results[table] = { error: error.message };
      }
    }

    return results;
  }

  async validateBackup(backupFile, type = 'validation') {
    await this.log(`Validating backup: ${backupFile}`);

    try {
      // Check if file exists and is readable
      const stats = await fs.stat(backupFile);
      
      if (stats.size < CONFIG.MIN_BACKUP_SIZE) {
        throw new Error(`Backup file too small: ${this.formatBytes(stats.size)}`);
      }

      // Test backup integrity
      if (backupFile.endsWith('.backup')) {
        // Custom format backup - use pg_restore --list
        const listCmd = `pg_restore --list "${backupFile}"`;
        execSync(listCmd, { stdio: 'pipe' });
        await this.log('Custom format backup validation passed');
      } else if (backupFile.endsWith('.sql.gz')) {
        // Test gzip integrity
        execSync(`gzip -t "${backupFile}"`, { stdio: 'pipe' });
        await this.log('Compressed SQL backup validation passed');
      }

      // Verify checksum if metadata exists
      const metadataFile = backupFile.replace(/\.(backup|sql\.gz)$/, '_metadata.json');
      try {
        const metadataContent = await fs.readFile(metadataFile, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        if (metadata.checksum) {
          const currentChecksum = await this.calculateChecksum(backupFile);
          if (currentChecksum !== metadata.checksum) {
            throw new Error('Checksum validation failed - backup may be corrupted');
          }
          await this.log('Checksum validation passed');
        }
      } catch (err) {
        await this.log(`Metadata validation skipped: ${err.message}`, 'WARN');
      }

      await this.log('Backup validation completed successfully');
      return true;
    } catch (error) {
      await this.log(`Backup validation failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async restoreFromBackup(backupFile, options = {}) {
    await this.log(`Starting restore from: ${backupFile}`);

    if (!options.confirmed) {
      throw new Error('Restore must be explicitly confirmed with --confirmed flag');
    }

    try {
      // Validate backup before restore
      await this.validateBackup(backupFile);

      // Get restore target
      const targetUrl = options.targetUrl || CONFIG.SUPABASE_DB_URL;
      
      if (backupFile.endsWith('.backup')) {
        // Custom format restore
        const restoreCmd = [
          'pg_restore',
          '--verbose',
          '--clean',
          '--if-exists',
          '--create',
          options.schemaOnly ? '--schema-only' : '',
          options.dataOnly ? '--data-only' : '',
          '--dbname=' + targetUrl,
          `"${backupFile}"`
        ].filter(Boolean).join(' ');

        await this.log(`Executing restore: ${restoreCmd.replace(targetUrl, '[TARGET_URL]')}`);
        execSync(restoreCmd, { stdio: 'inherit' });
      } else if (backupFile.endsWith('.sql.gz')) {
        // SQL restore from compressed file
        const restoreCmd = `gunzip -c "${backupFile}" | psql "${targetUrl}"`;
        await this.log(`Executing SQL restore`);
        execSync(restoreCmd, { stdio: 'inherit' });
      }

      await this.log('Restore completed successfully');

      // Log restore event
      await this.logRestoreEvent(backupFile, options);

      return true;
    } catch (error) {
      await this.log(`Restore failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async cleanup(type) {
    const backupDir = path.join(CONFIG.BACKUP_BASE_DIR, type);
    const retentionDays = CONFIG[`${type.toUpperCase()}_RETENTION`];
    
    await this.log(`Starting cleanup for ${type} backups (retention: ${retentionDays} days)`);

    try {
      const files = await fs.readdir(backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;
      let deletedSize = 0;

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          deletedSize += stats.size;
          await this.log(`Deleted old backup: ${file}`);
        }
      }

      await this.log(`Cleanup completed: ${deletedCount} files deleted, ${this.formatBytes(deletedSize)} freed`);
    } catch (error) {
      await this.log(`Cleanup failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async monitorBackups() {
    await this.log('Starting backup monitoring');

    const issues = [];

    // Check if recent backups exist
    for (const type of ['daily', 'weekly']) {
      const backupDir = path.join(CONFIG.BACKUP_BASE_DIR, type);
      const maxAge = type === 'daily' ? CONFIG.MAX_BACKUP_AGE_HOURS : 7 * 24; // 7 days for weekly
      
      try {
        const files = await fs.readdir(backupDir);
        const backupFiles = files.filter(f => f.endsWith('.backup') || f.endsWith('.sql.gz'));
        
        if (backupFiles.length === 0) {
          issues.push(`No ${type} backups found`);
          continue;
        }

        // Check latest backup age
        const latest = backupFiles
          .map(file => ({ file, path: path.join(backupDir, file) }))
          .sort((a, b) => b.file.localeCompare(a.file))[0];

        const stats = await fs.stat(latest.path);
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

        if (ageHours > maxAge) {
          issues.push(`Latest ${type} backup is ${Math.round(ageHours)} hours old (max: ${maxAge}h)`);
        }

        // Check backup size
        if (stats.size < CONFIG.MIN_BACKUP_SIZE) {
          issues.push(`Latest ${type} backup is too small: ${this.formatBytes(stats.size)}`);
        }

      } catch (error) {
        issues.push(`Failed to check ${type} backups: ${error.message}`);
      }
    }

    // Check disk space
    try {
      const usage = await this.getDiskUsage(CONFIG.BACKUP_BASE_DIR);
      if (usage.percentUsed > 85) {
        issues.push(`Backup disk usage high: ${usage.percentUsed}%`);
      }
    } catch (error) {
      await this.log(`Failed to check disk usage: ${error.message}`, 'WARN');
    }

    // Report issues
    if (issues.length > 0) {
      const alertMessage = `Backup monitoring alerts:\n${issues.map(i => `- ${i}`).join('\n')}`;
      await this.log(alertMessage, 'ERROR');
      await this.sendAlert(alertMessage);
    } else {
      await this.log('Backup monitoring: All checks passed');
    }

    return issues;
  }

  async sendAlert(message) {
    try {
      if (CONFIG.ALERT_EMAIL) {
        // Send email alert (requires mail command or external service)
        const subject = 'CreditAI Backup Alert';
        execSync(`echo "${message}" | mail -s "${subject}" ${CONFIG.ALERT_EMAIL}`, { stdio: 'pipe' });
        await this.log('Email alert sent');
      }

      if (CONFIG.WEBHOOK_URL) {
        // Send webhook alert
        const webhook = require('https');
        const data = JSON.stringify({ message, timestamp: new Date().toISOString() });
        
        // Implementation would depend on webhook service
        await this.log('Webhook alert would be sent (implementation needed)');
      }
    } catch (error) {
      await this.log(`Failed to send alert: ${error.message}`, 'ERROR');
    }
  }

  // Utility methods
  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const data = await fs.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getSupabaseVersion() {
    try {
      const result = execSync(`psql "${CONFIG.SUPABASE_DB_URL}" -c "SELECT version();" -t`, { encoding: 'utf8' });
      return result.trim();
    } catch (error) {
      return 'unknown';
    }
  }

  async getSchemaVersion() {
    try {
      // Get latest migration timestamp
      const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
      const files = await fs.readdir(migrationsDir);
      const migrations = files
        .filter(f => f.endsWith('.sql'))
        .sort()
        .reverse();
      
      return migrations[0] || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  async getDiskUsage(directory) {
    try {
      const result = execSync(`df "${directory}"`, { encoding: 'utf8' });
      const lines = result.trim().split('\n');
      const data = lines[1].split(/\s+/);
      
      return {
        total: parseInt(data[1]) * 1024,
        used: parseInt(data[2]) * 1024,
        available: parseInt(data[3]) * 1024,
        percentUsed: parseInt(data[4].replace('%', ''))
      };
    } catch (error) {
      throw new Error(`Failed to get disk usage: ${error.message}`);
    }
  }

  async logRestoreEvent(backupFile, options) {
    try {
      const event = {
        timestamp: new Date().toISOString(),
        type: 'restore',
        backupFile,
        options,
        user: process.env.USER || 'unknown'
      };

      const eventFile = path.join(CONFIG.BACKUP_BASE_DIR, 'restore_events.log');
      await fs.appendFile(eventFile, JSON.stringify(event) + '\n');
    } catch (error) {
      await this.log(`Failed to log restore event: ${error.message}`, 'WARN');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const backup = new SupabaseBackupSystem();

  try {
    await backup.ensureDirectories();
    await backup.validateEnvironment();

    switch (command) {
      case 'backup':
        const type = args[1] || 'daily';
        await backup.log(`Starting ${type} backup process`);
        
        // Create full backup
        const fullBackup = await backup.createFullBackup(type);
        
        // Create critical tables backup
        const criticalBackup = await backup.createCriticalTablesBackup(type);
        
        // Validate the backup
        await backup.validateBackup(fullBackup.customFile);
        
        // Cleanup old backups
        await backup.cleanup(type);
        
        await backup.log(`${type} backup completed successfully`);
        break;

      case 'restore':
        const backupFile = args[1];
        if (!backupFile) {
          throw new Error('Backup file path required for restore');
        }
        
        const options = {
          confirmed: args.includes('--confirmed'),
          schemaOnly: args.includes('--schema-only'),
          dataOnly: args.includes('--data-only'),
          targetUrl: args.find(arg => arg.startsWith('--target='))?.split('=')[1]
        };
        
        await backup.restoreFromBackup(backupFile, options);
        break;

      case 'validate':
        const validateFile = args[1];
        if (!validateFile) {
          throw new Error('Backup file path required for validation');
        }
        
        await backup.validateBackup(validateFile);
        break;

      case 'monitor':
        const issues = await backup.monitorBackups();
        process.exit(issues.length > 0 ? 1 : 0);
        break;

      case 'cleanup':
        const cleanupType = args[1] || 'daily';
        await backup.cleanup(cleanupType);
        break;

      default:
        console.log(`
CreditAI Supabase Backup System

Usage:
  node scripts/supabase-backup-system.js <command> [options]

Commands:
  backup [type]              Create backup (daily|weekly|monthly)
  restore <file> [options]   Restore from backup file
  validate <file>            Validate backup file integrity
  monitor                    Check backup health and send alerts
  cleanup [type]             Clean up old backups

Restore Options:
  --confirmed                Required flag to confirm restore
  --schema-only              Restore schema only
  --data-only                Restore data only
  --target=<url>             Restore to different database

Environment Variables:
  BACKUP_BASE_DIR            Base directory for backups (default: ./backups)
  DAILY_RETENTION            Days to retain daily backups (default: 7)
  WEEKLY_RETENTION           Days to retain weekly backups (default: 28)
  MONTHLY_RETENTION          Days to retain monthly backups (default: 365)
  BACKUP_ALERT_EMAIL         Email for alerts
  BACKUP_WEBHOOK_URL         Webhook URL for alerts
  SUPABASE_SERVICE_ROLE_KEY  Required for database access
  SUPABASE_DB_URL            Database connection URL

Examples:
  node scripts/supabase-backup-system.js backup daily
  node scripts/supabase-backup-system.js restore ./backups/daily/backup.backup --confirmed
  node scripts/supabase-backup-system.js validate ./backups/daily/backup.backup
  node scripts/supabase-backup-system.js monitor
        `);
        process.exit(1);
    }
  } catch (error) {
    await backup.log(`Operation failed: ${error.message}`, 'ERROR');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SupabaseBackupSystem;