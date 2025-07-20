#!/usr/bin/env node

/**
 * CreditAI Backup Validation and Testing System
 * 
 * Comprehensive validation system for database backups including:
 * - Backup file integrity verification
 * - Data consistency checks
 * - Schema validation
 * - Automated testing of restore procedures
 * - Performance benchmarking
 * 
 * Usage:
 *   node scripts/backup-validation-system.js validate <backup-file>
 *   node scripts/backup-validation-system.js test-restore <backup-file>
 *   node scripts/backup-validation-system.js benchmark <backup-file>
 *   node scripts/backup-validation-system.js integrity-check [directory]
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class BackupValidationSystem {
  constructor() {
    this.logFile = path.join(process.cwd(), 'backup-validation.log');
    this.testDbUrl = process.env.TEST_DATABASE_URL || process.env.SUPABASE_DB_URL + '_test';
    this.backupDir = process.env.BACKUP_BASE_DIR || './backups';
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

  async validateBackupFile(backupFile) {
    await this.log(`Starting validation of backup file: ${backupFile}`);
    
    const results = {
      file: backupFile,
      timestamp: new Date().toISOString(),
      tests: {},
      overall: 'UNKNOWN'
    };

    try {
      // Test 1: File existence and readability
      results.tests.fileExists = await this.testFileExists(backupFile);
      
      // Test 2: File size validation
      results.tests.fileSize = await this.testFileSize(backupFile);
      
      // Test 3: File format validation
      results.tests.fileFormat = await this.testFileFormat(backupFile);
      
      // Test 4: Backup integrity
      results.tests.integrity = await this.testBackupIntegrity(backupFile);
      
      // Test 5: Metadata validation
      results.tests.metadata = await this.testMetadata(backupFile);
      
      // Test 6: Content validation
      results.tests.content = await this.testBackupContent(backupFile);
      
      // Test 7: Security scan
      results.tests.security = await this.testSecurityScan(backupFile);

      // Calculate overall result
      const testResults = Object.values(results.tests);
      const passedTests = testResults.filter(t => t.status === 'PASS').length;
      const failedTests = testResults.filter(t => t.status === 'FAIL').length;
      
      if (failedTests === 0) {
        results.overall = 'PASS';
      } else if (failedTests <= 2 && passedTests >= 5) {
        results.overall = 'PARTIAL';
      } else {
        results.overall = 'FAIL';
      }

      await this.log(`Validation completed. Overall result: ${results.overall}`);
      await this.log(`Tests passed: ${passedTests}/${testResults.length}`);

      return results;
    } catch (error) {
      await this.log(`Validation failed: ${error.message}`, 'ERROR');
      results.overall = 'ERROR';
      results.error = error.message;
      return results;
    }
  }

  async testFileExists(backupFile) {
    try {
      await fs.access(backupFile, fs.constants.R_OK);
      return { status: 'PASS', message: 'File exists and is readable' };
    } catch (error) {
      return { status: 'FAIL', message: `File not accessible: ${error.message}` };
    }
  }

  async testFileSize(backupFile) {
    try {
      const stats = await fs.stat(backupFile);
      const minSize = 1024 * 1024; // 1MB
      const maxSize = 50 * 1024 * 1024 * 1024; // 50GB
      
      if (stats.size < minSize) {
        return { 
          status: 'FAIL', 
          message: `File too small: ${this.formatBytes(stats.size)} (min: ${this.formatBytes(minSize)})` 
        };
      }
      
      if (stats.size > maxSize) {
        return { 
          status: 'WARN', 
          message: `File very large: ${this.formatBytes(stats.size)} (max recommended: ${this.formatBytes(maxSize)})` 
        };
      }
      
      return { 
        status: 'PASS', 
        message: `File size OK: ${this.formatBytes(stats.size)}`,
        size: stats.size
      };
    } catch (error) {
      return { status: 'FAIL', message: `Size check failed: ${error.message}` };
    }
  }

  async testFileFormat(backupFile) {
    try {
      const ext = path.extname(backupFile);
      
      if (ext === '.backup') {
        // Test PostgreSQL custom format
        const listCmd = `pg_restore --list "${backupFile}"`;
        execSync(listCmd, { stdio: 'pipe' });
        return { status: 'PASS', message: 'Valid PostgreSQL custom format' };
      } else if (ext === '.gz') {
        // Test gzip compression
        execSync(`gzip -t "${backupFile}"`, { stdio: 'pipe' });
        return { status: 'PASS', message: 'Valid gzip compressed file' };
      } else if (ext === '.sql') {
        // Basic SQL file validation
        const content = await fs.readFile(backupFile, 'utf8');
        if (content.includes('CREATE') || content.includes('INSERT')) {
          return { status: 'PASS', message: 'Valid SQL file format' };
        } else {
          return { status: 'FAIL', message: 'Invalid SQL file - no CREATE/INSERT statements found' };
        }
      } else {
        return { status: 'WARN', message: `Unknown file format: ${ext}` };
      }
    } catch (error) {
      return { status: 'FAIL', message: `Format validation failed: ${error.message}` };
    }
  }

  async testBackupIntegrity(backupFile) {
    try {
      const ext = path.extname(backupFile);
      
      if (ext === '.backup') {
        // Test restore list for custom format
        const output = execSync(`pg_restore --list "${backupFile}"`, { encoding: 'utf8' });
        const lines = output.split('\n').filter(line => line.trim());
        
        if (lines.length < 10) {
          return { status: 'WARN', message: 'Backup contains very few objects' };
        }
        
        return { 
          status: 'PASS', 
          message: `Backup integrity OK - ${lines.length} objects found` 
        };
      } else if (ext === '.gz') {
        // Test gzip integrity
        execSync(`gzip -t "${backupFile}"`, { stdio: 'pipe' });
        return { status: 'PASS', message: 'Compressed file integrity OK' };
      } else {
        return { status: 'SKIP', message: 'Integrity test not available for this format' };
      }
    } catch (error) {
      return { status: 'FAIL', message: `Integrity check failed: ${error.message}` };
    }
  }

  async testMetadata(backupFile) {
    try {
      // Look for corresponding metadata file
      const metadataFile = backupFile.replace(/\.(backup|sql\.gz|sql)$/, '_metadata.json');
      
      try {
        const metadataContent = await fs.readFile(metadataFile, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        // Validate metadata structure
        const required = ['timestamp', 'type', 'checksum'];
        const missing = required.filter(field => !metadata[field]);
        
        if (missing.length > 0) {
          return { 
            status: 'WARN', 
            message: `Metadata incomplete - missing: ${missing.join(', ')}` 
          };
        }
        
        // Validate checksum if available
        if (metadata.checksum) {
          const currentChecksum = await this.calculateChecksum(backupFile);
          if (currentChecksum !== metadata.checksum) {
            return { 
              status: 'FAIL', 
              message: 'Checksum mismatch - backup may be corrupted' 
            };
          }
        }
        
        return { 
          status: 'PASS', 
          message: 'Metadata validation passed',
          metadata 
        };
      } catch (err) {
        return { 
          status: 'WARN', 
          message: 'No metadata file found or invalid format' 
        };
      }
    } catch (error) {
      return { status: 'FAIL', message: `Metadata validation failed: ${error.message}` };
    }
  }

  async testBackupContent(backupFile) {
    try {
      if (path.extname(backupFile) === '.backup') {
        // For custom format, check table list
        const output = execSync(`pg_restore --list "${backupFile}"`, { encoding: 'utf8' });
        
        const criticalTables = [
          'profiles',
          'credit_reports',
          'negative_items',
          'disputes'
        ];
        
        const foundTables = criticalTables.filter(table => 
          output.includes(`TABLE public ${table}`) || output.includes(`TABLE DATA public ${table}`)
        );
        
        if (foundTables.length === 0) {
          return { 
            status: 'FAIL', 
            message: 'No critical tables found in backup' 
          };
        }
        
        if (foundTables.length < criticalTables.length) {
          return { 
            status: 'WARN', 
            message: `Some critical tables missing: ${criticalTables.filter(t => !foundTables.includes(t)).join(', ')}` 
          };
        }
        
        return { 
          status: 'PASS', 
          message: `All critical tables present: ${foundTables.join(', ')}` 
        };
      } else {
        return { status: 'SKIP', message: 'Content validation not available for this format' };
      }
    } catch (error) {
      return { status: 'FAIL', message: `Content validation failed: ${error.message}` };
    }
  }

  async testSecurityScan(backupFile) {
    try {
      // Basic security checks
      const issues = [];
      
      // Check file permissions
      const stats = await fs.stat(backupFile);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      
      if (mode.includes('4') || mode.includes('6')) {
        issues.push('File has world-readable permissions');
      }
      
      // Check for sensitive data patterns (basic scan)
      if (path.extname(backupFile) === '.sql') {
        const content = await fs.readFile(backupFile, 'utf8');
        const sampleSize = Math.min(content.length, 100000); // First 100KB
        const sample = content.substring(0, sampleSize);
        
        // Look for potential PII patterns
        const patterns = [
          /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
          /\b\d{16}\b/g,             // Credit card
          /password/gi,              // Password fields
        ];
        
        patterns.forEach((pattern, index) => {
          const matches = sample.match(pattern);
          if (matches && matches.length > 5) {
            issues.push(`Potential sensitive data pattern ${index + 1} found`);
          }
        });
      }
      
      if (issues.length > 0) {
        return { 
          status: 'WARN', 
          message: `Security concerns: ${issues.join(', ')}`,
          issues 
        };
      }
      
      return { status: 'PASS', message: 'Basic security scan passed' };
    } catch (error) {
      return { status: 'FAIL', message: `Security scan failed: ${error.message}` };
    }
  }

  async testRestoreProcedure(backupFile, testDbName = 'backup_test') {
    await this.log(`Starting restore test for: ${backupFile}`);
    
    const results = {
      backupFile,
      testDatabase: testDbName,
      timestamp: new Date().toISOString(),
      phases: {},
      overall: 'UNKNOWN'
    };

    try {
      // Phase 1: Create test database
      results.phases.createTestDb = await this.createTestDatabase(testDbName);
      
      // Phase 2: Restore backup to test database
      results.phases.restore = await this.restoreToTestDatabase(backupFile, testDbName);
      
      // Phase 3: Validate restored data
      results.phases.dataValidation = await this.validateRestoredData(testDbName);
      
      // Phase 4: Performance test
      results.phases.performance = await this.performanceTest(testDbName);
      
      // Phase 5: Cleanup
      results.phases.cleanup = await this.cleanupTestDatabase(testDbName);

      // Calculate overall result
      const phaseResults = Object.values(results.phases);
      const passedPhases = phaseResults.filter(p => p.status === 'PASS').length;
      const failedPhases = phaseResults.filter(p => p.status === 'FAIL').length;
      
      if (failedPhases === 0) {
        results.overall = 'PASS';
      } else if (failedPhases <= 1 && passedPhases >= 3) {
        results.overall = 'PARTIAL';
      } else {
        results.overall = 'FAIL';
      }

      await this.log(`Restore test completed. Overall result: ${results.overall}`);
      return results;
    } catch (error) {
      await this.log(`Restore test failed: ${error.message}`, 'ERROR');
      results.overall = 'ERROR';
      results.error = error.message;
      
      // Attempt cleanup even on failure
      try {
        await this.cleanupTestDatabase(testDbName);
      } catch (cleanupError) {
        await this.log(`Cleanup failed: ${cleanupError.message}`, 'WARN');
      }
      
      return results;
    }
  }

  async createTestDatabase(testDbName) {
    try {
      const createCmd = `createdb -h localhost -p 5432 ${testDbName}`;
      execSync(createCmd, { stdio: 'pipe' });
      
      return { 
        status: 'PASS', 
        message: `Test database '${testDbName}' created successfully` 
      };
    } catch (error) {
      return { 
        status: 'FAIL', 
        message: `Failed to create test database: ${error.message}` 
      };
    }
  }

  async restoreToTestDatabase(backupFile, testDbName) {
    try {
      const ext = path.extname(backupFile);
      let restoreCmd;
      
      if (ext === '.backup') {
        restoreCmd = `pg_restore -d ${testDbName} "${backupFile}"`;
      } else if (ext === '.gz') {
        restoreCmd = `gunzip -c "${backupFile}" | psql ${testDbName}`;
      } else if (ext === '.sql') {
        restoreCmd = `psql ${testDbName} < "${backupFile}"`;
      } else {
        throw new Error(`Unsupported backup format: ${ext}`);
      }
      
      const startTime = Date.now();
      execSync(restoreCmd, { stdio: 'pipe' });
      const duration = Date.now() - startTime;
      
      return { 
        status: 'PASS', 
        message: `Restore completed in ${duration}ms`,
        duration 
      };
    } catch (error) {
      return { 
        status: 'FAIL', 
        message: `Restore failed: ${error.message}` 
      };
    }
  }

  async validateRestoredData(testDbName) {
    try {
      const validations = [];
      
      // Test 1: Check critical tables exist
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `;
      
      const tablesResult = execSync(`psql ${testDbName} -c "${tablesQuery}" -t`, { encoding: 'utf8' });
      const tables = tablesResult.split('\n').map(t => t.trim()).filter(Boolean);
      
      const criticalTables = ['profiles', 'credit_reports', 'negative_items', 'disputes'];
      const missingTables = criticalTables.filter(t => !tables.includes(t));
      
      if (missingTables.length > 0) {
        validations.push(`Missing tables: ${missingTables.join(', ')}`);
      }
      
      // Test 2: Check data counts
      for (const table of criticalTables.filter(t => tables.includes(t))) {
        try {
          const countResult = execSync(`psql ${testDbName} -c "SELECT COUNT(*) FROM ${table};" -t`, { encoding: 'utf8' });
          const count = parseInt(countResult.trim());
          validations.push(`${table}: ${count} rows`);
        } catch (err) {
          validations.push(`${table}: COUNT failed - ${err.message}`);
        }
      }
      
      // Test 3: Check constraints and indexes
      const constraintsQuery = `
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public'
      `;
      
      const constraintsResult = execSync(`psql ${testDbName} -c "${constraintsQuery}" -t`, { encoding: 'utf8' });
      const constraintsCount = parseInt(constraintsResult.trim());
      
      if (constraintsCount === 0) {
        validations.push('Warning: No constraints found');
      }
      
      return { 
        status: 'PASS', 
        message: 'Data validation completed',
        details: validations 
      };
    } catch (error) {
      return { 
        status: 'FAIL', 
        message: `Data validation failed: ${error.message}` 
      };
    }
  }

  async performanceTest(testDbName) {
    try {
      const tests = [];
      
      // Test 1: Simple SELECT performance
      const startTime = Date.now();
      execSync(`psql ${testDbName} -c "SELECT COUNT(*) FROM profiles;" -t`, { stdio: 'pipe' });
      const selectDuration = Date.now() - startTime;
      tests.push(`SELECT test: ${selectDuration}ms`);
      
      // Test 2: JOIN performance (if data exists)
      try {
        const joinStartTime = Date.now();
        execSync(`psql ${testDbName} -c "SELECT COUNT(*) FROM profiles p LEFT JOIN credit_reports cr ON p.id = cr.user_id;" -t`, { stdio: 'pipe' });
        const joinDuration = Date.now() - joinStartTime;
        tests.push(`JOIN test: ${joinDuration}ms`);
      } catch (err) {
        tests.push(`JOIN test: skipped (${err.message})`);
      }
      
      return { 
        status: 'PASS', 
        message: 'Performance test completed',
        results: tests 
      };
    } catch (error) {
      return { 
        status: 'FAIL', 
        message: `Performance test failed: ${error.message}` 
      };
    }
  }

  async cleanupTestDatabase(testDbName) {
    try {
      const dropCmd = `dropdb -h localhost -p 5432 ${testDbName}`;
      execSync(dropCmd, { stdio: 'pipe' });
      
      return { 
        status: 'PASS', 
        message: `Test database '${testDbName}' cleaned up successfully` 
      };
    } catch (error) {
      return { 
        status: 'WARN', 
        message: `Cleanup warning: ${error.message}` 
      };
    }
  }

  async benchmarkBackup(backupFile) {
    await this.log(`Starting benchmark for: ${backupFile}`);
    
    const results = {
      backupFile,
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    try {
      // File size metrics
      const stats = await fs.stat(backupFile);
      results.metrics.fileSize = stats.size;
      results.metrics.fileSizeFormatted = this.formatBytes(stats.size);
      
      // Compression ratio (if applicable)
      if (path.extname(backupFile) === '.gz') {
        const uncompressedSize = await this.getUncompressedSize(backupFile);
        results.metrics.compressionRatio = (stats.size / uncompressedSize * 100).toFixed(2) + '%';
      }
      
      // Checksum calculation time
      const checksumStart = Date.now();
      const checksum = await this.calculateChecksum(backupFile);
      results.metrics.checksumTime = Date.now() - checksumStart;
      results.metrics.checksum = checksum;
      
      // Read performance
      const readStart = Date.now();
      await fs.readFile(backupFile);
      results.metrics.readTime = Date.now() - readStart;
      results.metrics.readThroughput = this.formatBytes(stats.size / (results.metrics.readTime / 1000)) + '/s';
      
      await this.log(`Benchmark completed successfully`);
      return results;
    } catch (error) {
      await this.log(`Benchmark failed: ${error.message}`, 'ERROR');
      results.error = error.message;
      return results;
    }
  }

  async runIntegrityCheck(directory = null) {
    const checkDir = directory || this.backupDir;
    await this.log(`Running integrity check on directory: ${checkDir}`);
    
    const results = {
      directory: checkDir,
      timestamp: new Date().toISOString(),
      files: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    try {
      const files = await this.findBackupFiles(checkDir);
      results.summary.total = files.length;
      
      for (const file of files) {
        await this.log(`Checking: ${file}`);
        const validation = await this.validateBackupFile(file);
        
        results.files.push({
          file,
          result: validation.overall,
          details: validation.tests
        });
        
        switch (validation.overall) {
          case 'PASS':
            results.summary.passed++;
            break;
          case 'FAIL':
          case 'ERROR':
            results.summary.failed++;
            break;
          case 'PARTIAL':
            results.summary.warnings++;
            break;
        }
      }
      
      await this.log(`Integrity check completed. ${results.summary.passed}/${results.summary.total} files passed`);
      return results;
    } catch (error) {
      await this.log(`Integrity check failed: ${error.message}`, 'ERROR');
      results.error = error.message;
      return results;
    }
  }

  async findBackupFiles(directory) {
    const files = [];
    
    async function scan(dir) {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await scan(itemPath);
        } else if (item.match(/\.(backup|sql|sql\.gz)$/)) {
          files.push(itemPath);
        }
      }
    }
    
    await scan(directory);
    return files;
  }

  // Utility methods
  async calculateChecksum(filePath) {
    const hash = crypto.createHash('sha256');
    const data = await fs.readFile(filePath);
    hash.update(data);
    return hash.digest('hex');
  }

  async getUncompressedSize(gzFile) {
    try {
      const result = execSync(`gzip -l "${gzFile}"`, { encoding: 'utf8' });
      const lines = result.split('\n');
      const dataLine = lines.find(line => line.includes(path.basename(gzFile)));
      if (dataLine) {
        const parts = dataLine.trim().split(/\s+/);
        return parseInt(parts[1]);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const validator = new BackupValidationSystem();

  try {
    switch (command) {
      case 'validate':
        const backupFile = args[1];
        if (!backupFile) {
          throw new Error('Backup file path required');
        }
        
        const validation = await validator.validateBackupFile(backupFile);
        console.log(JSON.stringify(validation, null, 2));
        process.exit(validation.overall === 'PASS' ? 0 : 1);
        break;

      case 'test-restore':
        const restoreFile = args[1];
        if (!restoreFile) {
          throw new Error('Backup file path required');
        }
        
        const testResults = await validator.testRestoreProcedure(restoreFile);
        console.log(JSON.stringify(testResults, null, 2));
        process.exit(testResults.overall === 'PASS' ? 0 : 1);
        break;

      case 'benchmark':
        const benchmarkFile = args[1];
        if (!benchmarkFile) {
          throw new Error('Backup file path required');
        }
        
        const benchmark = await validator.benchmarkBackup(benchmarkFile);
        console.log(JSON.stringify(benchmark, null, 2));
        break;

      case 'integrity-check':
        const directory = args[1];
        const integrity = await validator.runIntegrityCheck(directory);
        console.log(JSON.stringify(integrity, null, 2));
        process.exit(integrity.summary.failed === 0 ? 0 : 1);
        break;

      default:
        console.log(`
CreditAI Backup Validation System

Usage:
  node scripts/backup-validation-system.js <command> [options]

Commands:
  validate <file>           Validate a single backup file
  test-restore <file>       Test restore procedure with validation
  benchmark <file>          Performance benchmark of backup file
  integrity-check [dir]     Check integrity of all backups in directory

Examples:
  node scripts/backup-validation-system.js validate ./backups/daily/backup.backup
  node scripts/backup-validation-system.js test-restore ./backups/daily/backup.backup
  node scripts/backup-validation-system.js benchmark ./backups/daily/backup.backup
  node scripts/backup-validation-system.js integrity-check ./backups
        `);
        process.exit(1);
    }
  } catch (error) {
    await validator.log(`Operation failed: ${error.message}`, 'ERROR');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupValidationSystem;