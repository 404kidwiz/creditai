/**
 * File Cleanup Utility
 * Simplified implementation for build compatibility
 */

import fs from 'fs'
import path from 'path'

export interface CleanupOptions {
  maxAgeMs: number
  maxSizeBytes?: number
  filePatterns?: string[]
  excludePatterns?: string[]
}

export interface CleanupResult {
  filesDeleted: number
  spaceFree: number
  errors: string[]
  duration: number
}

export class FileCleanup {
  private readonly defaultOptions: CleanupOptions = {
    maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    filePatterns: ['*.tmp', '*.temp', '*.cache'],
    excludePatterns: ['.git', 'node_modules'],
  }

  async cleanupDirectory(
    directoryPath: string,
    options?: Partial<CleanupOptions>
  ): Promise<CleanupResult> {
    const startTime = Date.now()
    const opts = { ...this.defaultOptions, ...options }
    
    const result: CleanupResult = {
      filesDeleted: 0,
      spaceFree: 0,
      errors: [],
      duration: 0,
    }

    try {
      if (!fs.existsSync(directoryPath)) {
        result.errors.push(`Directory does not exist: ${directoryPath}`)
        return result
      }

      const files = await this.getFilesRecursively(directoryPath, opts)
      const filesToDelete = this.filterFilesToDelete(files, opts)

      for (const file of filesToDelete) {
        try {
          const stats = fs.statSync(file)
          fs.unlinkSync(file)
          result.filesDeleted++
          result.spaceFree += stats.size
        } catch (error) {
          result.errors.push(`Failed to delete ${file}: ${error}`)
        }
      }
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error}`)
    }

    result.duration = Date.now() - startTime
    return result
  }

  async cleanupTempFiles(): Promise<CleanupResult> {
    const tempDirs = [
      '/tmp',
      process.env.TMPDIR || '/tmp',
      './temp',
      './tmp',
      './uploads/temp',
    ]

    let combinedResult: CleanupResult = {
      filesDeleted: 0,
      spaceFree: 0,
      errors: [],
      duration: 0,
    }

    for (const tempDir of tempDirs) {
      if (fs.existsSync(tempDir)) {
        const result = await this.cleanupDirectory(tempDir, {
          maxAgeMs: 60 * 60 * 1000, // 1 hour for temp files
        })
        
        combinedResult.filesDeleted += result.filesDeleted
        combinedResult.spaceFree += result.spaceFree
        combinedResult.errors.push(...result.errors)
        combinedResult.duration += result.duration
      }
    }

    return combinedResult
  }

  private async getFilesRecursively(
    dir: string,
    options: CleanupOptions
  ): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        // Skip excluded patterns
        if (options.excludePatterns?.some(pattern => fullPath.includes(pattern))) {
          continue
        }

        if (entry.isDirectory()) {
          files.push(...await this.getFilesRecursively(fullPath, options))
        } else {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }

    return files
  }

  private filterFilesToDelete(files: string[], options: CleanupOptions): string[] {
    const now = Date.now()

    return files.filter(file => {
      try {
        const stats = fs.statSync(file)
        const age = now - stats.mtime.getTime()

        // Check age
        if (age < options.maxAgeMs) {
          return false
        }

        // Check file patterns
        if (options.filePatterns && options.filePatterns.length > 0) {
          const matchesPattern = options.filePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace('*', '.*'))
            return regex.test(path.basename(file))
          })
          if (!matchesPattern) {
            return false
          }
        }

        return true
      } catch {
        return false
      }
    })
  }

  // Static cleanup methods
  static async cleanupUploads(): Promise<CleanupResult> {
    const cleanup = new FileCleanup()
    return cleanup.cleanupDirectory('./uploads', {
      maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
  }

  static async emergencyCleanup(): Promise<CleanupResult> {
    const cleanup = new FileCleanup()
    return cleanup.cleanupTempFiles()
  }

  // API compatibility method
  static async cleanupUserSession(userId: string): Promise<CleanupResult> {
    console.log(`Cleaning up session for user: ${userId}`)
    
    const cleanup = new FileCleanup()
    const userTempPaths = [
      `./uploads/temp/${userId}`,
      `./temp/${userId}`,
      `/tmp/creditai-${userId}`,
    ]

    let combinedResult: CleanupResult = {
      filesDeleted: 0,
      spaceFree: 0,
      errors: [],
      duration: 0,
    }

    for (const tempPath of userTempPaths) {
      if (fs.existsSync(tempPath)) {
        const result = await cleanup.cleanupDirectory(tempPath, {
          maxAgeMs: 0, // Delete all files in user session directory
        })
        
        combinedResult.filesDeleted += result.filesDeleted
        combinedResult.spaceFree += result.spaceFree
        combinedResult.errors.push(...result.errors)
        combinedResult.duration += result.duration

        // Try to remove the directory if it's empty
        try {
          fs.rmdirSync(tempPath)
        } catch {
          // Directory not empty or doesn't exist, ignore
        }
      }
    }

    return combinedResult
  }
}

// Export singleton instance
export const fileCleanup = new FileCleanup()

// Export for compatibility
export { FileCleanup as default }