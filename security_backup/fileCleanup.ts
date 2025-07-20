/**
 * Temporary File Cleanup Utility
 * Manages secure cleanup of temporary files containing sensitive data
 * with enhanced security features for data protection
 */

import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import os from 'os'

export interface CleanupOptions {
  maxAge?: number // Maximum age in milliseconds
  secureDelete?: boolean // Overwrite file before deletion
  recursive?: boolean // Clean subdirectories
  fileTypes?: string[] // Specific file types to clean
  force?: boolean // Force cleanup regardless of age
  dryRun?: boolean // Report what would be deleted without actually deleting
}

export interface CleanupResult {
  filesDeleted: number
  errors: string[]
  totalSize: number
  securelyDeleted: number
  skippedFiles: number
  dryRun: boolean
}

export class FileCleanup {
  private static readonly DEFAULT_MAX_AGE = 1000 * 60 * 60 // 1 hour
  private static readonly SECURE_DELETE_PASSES = 3 // Number of overwrite passes
  private static readonly TEMP_DIRS = [
    '/tmp/credit-reports',
    '/tmp/pdf-processing',
    process.env.TEMP_DIR || '/tmp',
    path.join(os.tmpdir(), 'credit-reports'),
    path.join(os.tmpdir(), 'pdf-processing')
  ]
  
  // File patterns that may contain sensitive data
  private static readonly SENSITIVE_FILE_PATTERNS = [
    /\.pdf$/i,
    /credit.*report/i,
    /temp.*pdf/i,
    /upload.*\.(pdf|txt|json)$/i,
    /processed.*\.(json|txt)$/i,
    /user.*data/i,
    /personal.*info/i,
    /account.*\d+/i,
    /ssn/i,
    /sensitive/i
  ]
  
  // File extensions that may contain sensitive data
  private static readonly SENSITIVE_EXTENSIONS = [
    '.pdf', '.json', '.txt', '.csv', '.xlsx', '.docx', '.jpg', '.png'
  ]

  /**
   * Clean up temporary files with enhanced security
   */
  static async cleanupTempFiles(options: CleanupOptions = {}): Promise<CleanupResult> {
    const opts = {
      maxAge: this.DEFAULT_MAX_AGE,
      secureDelete: true,
      recursive: false,
      fileTypes: this.SENSITIVE_EXTENSIONS,
      force: false,
      dryRun: false,
      ...options
    }

    const result: CleanupResult = {
      filesDeleted: 0,
      errors: [],
      totalSize: 0,
      securelyDeleted: 0,
      skippedFiles: 0,
      dryRun: opts.dryRun
    }

    // Create temp directories if they don't exist
    for (const tempDir of this.TEMP_DIRS) {
      try {
        await fs.mkdir(tempDir, { recursive: true })
      } catch (error) {
        // Ignore directory creation errors
      }
    }

    // Clean each temp directory
    for (const tempDir of this.TEMP_DIRS) {
      try {
        await this.cleanDirectory(tempDir, opts, result)
      } catch (error) {
        result.errors.push(`Failed to clean ${tempDir}: ${error}`)
      }
    }

    return result
  }

  /**
   * Clean a specific directory with enhanced security
   */
  private static async cleanDirectory(
    dirPath: string,
    options: CleanupOptions,
    result: CleanupResult
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const now = Date.now()

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory() && options.recursive) {
          await this.cleanDirectory(fullPath, options, result)
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath)
            const age = now - stats.mtime.getTime()
            const extension = path.extname(entry.name).toLowerCase()

            // Check if file should be deleted based on age or force option
            const shouldDelete = options.force || age > (options.maxAge || this.DEFAULT_MAX_AGE);
            
            // Check if file type matches the filter (if provided)
            const matchesFileType = !options.fileTypes || 
              options.fileTypes.length === 0 || 
              options.fileTypes.includes(extension);
            
            // Check if it's a sensitive file
            const isSensitive = this.isSensitiveFile(entry.name);

            if (shouldDelete && matchesFileType && isSensitive) {
              result.totalSize += stats.size;

              if (!options.dryRun) {
                if (options.secureDelete) {
                  await this.secureDelete(fullPath, stats.size);
                  result.securelyDeleted++;
                } else {
                  await fs.unlink(fullPath);
                }
                result.filesDeleted++;
              }
            } else {
              result.skippedFiles++;
            }
          } catch (error) {
            result.errors.push(`Failed to process ${fullPath}: ${error}`);
          }
        }
      }
      
      // Try to remove empty directories if recursive
      if (options.recursive && !options.dryRun) {
        try {
          const remainingEntries = await fs.readdir(dirPath);
          if (remainingEntries.length === 0) {
            await fs.rmdir(dirPath);
          }
        } catch (error) {
          // Ignore directory removal errors
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if file is potentially sensitive
   */
  private static isSensitiveFile(filename: string): boolean {
    // Check against sensitive file patterns
    return this.SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(filename));
  }

  /**
   * Securely delete a file by overwriting it multiple times
   */
  private static async secureDelete(filePath: string, fileSize: number): Promise<void> {
    try {
      // Overwrite file with different patterns multiple times
      const passes = this.SECURE_DELETE_PASSES;
      const buffer = Buffer.alloc(Math.min(fileSize, 1024 * 1024)); // 1MB chunks

      for (let pass = 0; pass < passes; pass++) {
        // Use different patterns for each pass
        switch (pass % 3) {
          case 0:
            // Random data
            crypto.randomFillSync(buffer);
            break;
          case 1:
            // All zeros
            buffer.fill(0);
            break;
          case 2:
            // All ones
            buffer.fill(255);
            break;
        }

        // Write pattern to file
        const fileHandle = await fs.open(filePath, 'r+');
        try {
          let position = 0;
          while (position < fileSize) {
            const bytesToWrite = Math.min(buffer.length, fileSize - position);
            await fileHandle.write(buffer, 0, bytesToWrite, position);
            position += bytesToWrite;
          }
          await fileHandle.sync();
        } finally {
          await fileHandle.close();
        }
      }

      // Finally delete the file
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Secure delete failed for ${filePath}:`, error);
      // Fallback to regular delete
      try {
        await fs.unlink(filePath);
      } catch (fallbackError) {
        throw new Error(`Both secure and regular delete failed: ${error}`);
      }
    }
  }

  /**
   * Clean up files for a specific user session with enhanced security
   */
  static async cleanupUserSession(userId: string): Promise<CleanupResult> {
    // Create multiple user-specific temp directories to ensure thorough cleanup
    const userTempDirs = [
      path.join(process.env.TEMP_DIR || '/tmp', `user-${userId}`),
      path.join(os.tmpdir(), `user-${userId}`),
      path.join('/tmp/credit-reports', `user-${userId}`),
      path.join('/tmp/pdf-processing', `user-${userId}`)
    ];
    
    const result: CleanupResult = {
      filesDeleted: 0,
      errors: [],
      totalSize: 0,
      securelyDeleted: 0,
      skippedFiles: 0,
      dryRun: false
    };

    // Clean each user-specific directory
    for (const userTempDir of userTempDirs) {
      try {
        await this.cleanDirectory(userTempDir, { 
          maxAge: 0, // Delete all files regardless of age
          secureDelete: true,
          recursive: true,
          force: true // Force deletion of all files
        }, result);

        // Remove the user directory if empty
        try {
          await fs.rmdir(userTempDir);
        } catch (error) {
          // Directory not empty or doesn't exist, ignore
        }
      } catch (error) {
        result.errors.push(`Failed to clean user session directory ${userTempDir}: ${error}`);
      }
    }
    
    // Also clean any files with user ID in the filename from main temp directories
    for (const tempDir of this.TEMP_DIRS) {
      try {
        const entries = await fs.readdir(tempDir, { withFileTypes: true });
        
        for (const entry of entries) {
          // Check if filename contains user ID
          if (entry.isFile() && entry.name.includes(userId)) {
            const fullPath = path.join(tempDir, entry.name);
            try {
              const stats = await fs.stat(fullPath);
              result.totalSize += stats.size;
              
              await this.secureDelete(fullPath, stats.size);
              result.filesDeleted++;
              result.securelyDeleted++;
            } catch (error) {
              result.errors.push(`Failed to delete user file ${fullPath}: ${error}`);
            }
          }
        }
      } catch (error) {
        // Ignore directory access errors
      }
    }

    return result;
  }

  /**
   * Schedule automatic cleanup with configurable options
   */
  static scheduleCleanup(intervalMs: number = 1000 * 60 * 30, options: CleanupOptions = {}): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        // Default to secure delete for scheduled cleanups
        const cleanupOptions: CleanupOptions = {
          secureDelete: true,
          recursive: true,
          ...options
        };
        
        const result = await this.cleanupTempFiles(cleanupOptions);
        
        console.log(`Scheduled cleanup completed: ${result.filesDeleted} files deleted (${result.securelyDeleted} securely), ${result.totalSize} bytes freed`);
        
        if (result.errors.length > 0) {
          console.warn('Cleanup errors:', result.errors);
        }
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Get temporary directory usage statistics with security classification
   */
  static async getTempDirStats(): Promise<{ 
    [dir: string]: { 
      files: number; 
      size: number;
      sensitiveFiles: number;
      oldestFile: Date | null;
      newestFile: Date | null;
    } 
  }> {
    const stats: { 
      [dir: string]: { 
        files: number; 
        size: number;
        sensitiveFiles: number;
        oldestFile: Date | null;
        newestFile: Date | null;
      } 
    } = {};

    for (const tempDir of this.TEMP_DIRS) {
      try {
        const dirStats = await this.getDirStats(tempDir);
        stats[tempDir] = dirStats;
      } catch (error) {
        stats[tempDir] = { 
          files: 0, 
          size: 0,
          sensitiveFiles: 0,
          oldestFile: null,
          newestFile: null
        };
      }
    }

    return stats;
  }

  /**
   * Get directory statistics with enhanced information
   */
  private static async getDirStats(dirPath: string): Promise<{ 
    files: number; 
    size: number;
    sensitiveFiles: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    let files = 0;
    let size = 0;
    let sensitiveFiles = 0;
    let oldestFile: Date | null = null;
    let newestFile: Date | null = null;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files++;
          size += stats.size;
          
          // Track file dates
          const fileDate = stats.mtime;
          if (!oldestFile || fileDate < oldestFile) {
            oldestFile = fileDate;
          }
          if (!newestFile || fileDate > newestFile) {
            newestFile = fileDate;
          }
          
          // Count sensitive files
          if (this.isSensitiveFile(entry.name)) {
            sensitiveFiles++;
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return { 
      files, 
      size,
      sensitiveFiles,
      oldestFile,
      newestFile
    };
  }
  
  /**
   * Create a secure temporary directory for a user session
   */
  static async createSecureTempDir(userId: string): Promise<string> {
    // Create a user-specific temp directory with secure permissions
    const userTempDir = path.join(os.tmpdir(), `user-${userId}-${Date.now()}`);
    
    try {
      await fs.mkdir(userTempDir, { recursive: true, mode: 0o700 }); // Only owner can access
      return userTempDir;
    } catch (error) {
      console.error(`Failed to create secure temp directory: ${error}`);
      throw new Error('Could not create secure temporary directory');
    }
  }
  
  /**
   * Register a file for automatic cleanup
   */
  static async registerFileForCleanup(filePath: string, maxAgeMs: number = 3600000): Promise<void> {
    try {
      // Create a marker file with cleanup timestamp
      const markerPath = `${filePath}.cleanup`;
      const cleanupTime = Date.now() + maxAgeMs;
      
      await fs.writeFile(markerPath, cleanupTime.toString(), { encoding: 'utf8' });
    } catch (error) {
      console.error(`Failed to register file for cleanup: ${error}`);
    }
  }
}