import { supabase } from '@/lib/supabase/client'
import { analyticsService } from '@/lib/analytics/analyticsService'

export interface UploadProgress {
  status: 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  message: string
}

export interface UploadResult {
  url: string
  path: string
  size: number
  type: string
}

export class FileUploader {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  private readonly BUCKET_NAME = 'credit-reports'

  async uploadFile(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const startTime = Date.now()
    
    try {
      // Track upload start
      await analyticsService.trackUploadStart(file)
      
      // Validate file
      this.validateFile(file)

      onProgress?.({
        status: 'uploading',
        progress: 0,
        message: 'Preparing file for upload...'
      })

      // Compress image if needed
      let processedFile = file
      if (file.type.startsWith('image/')) {
        processedFile = await this.compressImage(file)
      }

      onProgress?.({
        status: 'uploading',
        progress: 20,
        message: 'Uploading file...'
      })

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}/${timestamp}.${fileExtension}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        const processingTime = Date.now() - startTime
        await analyticsService.trackUploadFailure(file, error.message)
        
        // Provide more specific error messages
        let errorMessage = error.message
        if (error.message.includes('bucket')) {
          errorMessage = 'Storage bucket not found. Please contact support.'
        } else if (error.message.includes('policy') || error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please make sure you are logged in.'
        } else if (error.message.includes('size')) {
          errorMessage = `File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`
        } else if (error.message.includes('type') || error.message.includes('mime')) {
          errorMessage = 'File type not allowed. Please upload JPG, PNG, or PDF files.'
        }
        
        throw new Error(`Upload failed: ${errorMessage}`)
      }

      onProgress?.({
        status: 'processing',
        progress: 80,
        message: 'Processing upload...'
      })

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName)

      const processingTime = Date.now() - startTime
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: `Upload complete! (${processingTime}ms)`
      })

      // Track successful upload
      await analyticsService.trackUploadSuccess(file, processingTime)

      return {
        url: urlData.publicUrl,
        path: fileName,
        size: processedFile.size,
        type: processedFile.type
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      onProgress?.({
        status: 'error',
        progress: 0,
        message: `Upload Error: ${errorMessage} (${processingTime}ms)`
      })
      
      // Track upload failure
      await analyticsService.trackUploadFailure(file, errorMessage)
      throw error
    }
  }

  private validateFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`)
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type not supported. Please upload JPG, PNG, or PDF files.')
    }
  }

  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (max 1920px width/height)
        const maxSize = 1920
        let { width, height } = img

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          0.8 // 80% quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  async getFileUrl(path: string): Promise<string> {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path)

    return data.publicUrl
  }
}

// Singleton instance
export const fileUploader = new FileUploader() 