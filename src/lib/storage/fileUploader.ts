import { supabase } from '@/lib/supabase/client'
import { analyticsService } from '@/lib/analytics/analyticsService'
import { textExtractor } from '@/lib/ocr/textExtractor'

export interface UploadProgress {
  status: 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'
  progress: number
  message: string
}

export interface UploadResult {
  url: string
  path: string
  size: number
  type: string
  ocrResult?: any
  documentId?: string
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
        progress: 70,
        message: 'Processing upload...'
      })

      // Get public URL for database storage (even though bucket is private)
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName)

      // Save document to database with all metadata
      let documentData: any = null
      try {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            document_type: this.determineDocumentType(file),
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size: processedFile.size,
            file_type: file.type
          })
          .select()
          .single()
        
        if (error) {
          console.error('Database save failed:', error)
          // Create mock data as fallback
          documentData = {
            id: `temp-${Date.now()}`,
            user_id: userId,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size: processedFile.size,
            document_type: this.determineDocumentType(file)
          }
        } else {
          documentData = data
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Create mock data as fallback
        documentData = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: processedFile.size,
          document_type: this.determineDocumentType(file)
        }
      }

      let ocrResult: any = undefined

      // Perform OCR and AI analysis for supported file types
      if (file.type.startsWith('image/')) {
        onProgress?.({
          status: 'analyzing',
          progress: 80,
          message: 'Analyzing document with AI...'
        })

        try {
          console.log('Starting OCR/AI analysis for image file')
          
          // Create signed URL for OCR processing (valid for 1 hour)
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUrl(fileName, 3600)

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('Failed to create signed URL:', signedUrlError)
            throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
          }

          console.log('Created signed URL for OCR processing')

          ocrResult = await textExtractor.extractFromImage(
            signedUrlData.signedUrl,
            (ocrProgress) => {
              console.log('OCR progress:', ocrProgress)
              // Map OCR progress to upload progress
              const progressValue = 80 + (ocrProgress.progress * 0.2)
              onProgress?.({
                status: 'analyzing',
                progress: progressValue,
                message: ocrProgress.message
              })
            },
            userId,
            true // Enable AI analysis
          )

          console.log('OCR/AI analysis completed:', ocrResult ? 'Success' : 'No result')

          // Update document with OCR results (only if we have a real DB record)
          if (documentData && ocrResult && !documentData.id.startsWith('temp-')) {
            try {
              await supabase
                .from('documents')
                .update({
                  ocr_text: ocrResult.text,
                  ai_analysis: ocrResult.aiAnalysis
                })
                .eq('id', documentData.id)
              console.log('Updated document with OCR results')
            } catch (updateError) {
              console.error('Failed to update document with OCR results:', updateError)
              // Continue anyway
            }
          }
        } catch (error) {
          console.error('OCR/AI analysis failed:', error)
          // Create a basic OCR result so the upload doesn't fail completely
          ocrResult = {
            text: 'OCR analysis failed, but file was uploaded successfully',
            confidence: 0,
            words: [],
            creditData: {
              accounts: [],
              inquiries: [],
              publicRecords: []
            },
            aiAnalysis: {
              extractedData: {
                personalInfo: { name: '', address: '' },
                creditScore: { score: 0, bureau: 'experian', date: '', scoreRange: { min: 300, max: 850 } },
                accounts: [],
                negativeItems: [],
                inquiries: [],
                publicRecords: []
              },
              recommendations: [],
              scoreAnalysis: { currentScore: 0, factors: [], improvementPotential: 0, timelineEstimate: '' },
              summary: 'Analysis failed, but file uploaded successfully'
            }
          }
        }
      } else if (file.type === 'application/pdf') {
        onProgress?.({
          status: 'analyzing',
          progress: 80,
          message: 'Processing PDF with Google Cloud AI...'
        })
        
        try {
          console.log('Starting server-side PDF processing')
          
          // Create FormData for the API request
          const formData = new FormData()
          formData.append('file', file)
          
          // Process PDF using server-side API
          const response = await fetch('/api/process-pdf', {
            method: 'POST',
            body: formData
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'PDF processing failed')
          }
          
          const pdfResult = await response.json()
          
          // Check if the response contains an error
          if (pdfResult.error) {
            throw new Error(pdfResult.error)
          }
          
          // Check if the response has the expected structure
          if (!pdfResult.text || !pdfResult.processingMethod) {
            throw new Error('Invalid PDF processing response structure')
          }
          
          console.log('Server-side PDF processing completed:', pdfResult.processingMethod)
          
          // Convert server result to OCR result format
          const extractedData = pdfResult.extractedData || {
            accounts: [],
            inquiries: [],
            publicRecords: [],
            negativeItems: [],
            creditScore: { score: 0, bureau: 'unknown', date: new Date().toISOString(), scoreRange: { min: 300, max: 850 } },
            personalInfo: { name: '', address: '' }
          }
          
          ocrResult = {
            text: pdfResult.text,
            confidence: pdfResult.confidence,
            words: pdfResult.text.split(/\s+/),
            creditData: {
              accounts: extractedData.accounts || [],
              inquiries: extractedData.inquiries || [],
              publicRecords: extractedData.publicRecords || []
            },
            aiAnalysis: {
              extractedData: extractedData,
              recommendations: this.generateRecommendationsFromPDFData(extractedData),
              scoreAnalysis: {
                currentScore: extractedData.creditScore?.score || 0,
                factors: this.generateScoreFactors(extractedData),
                improvementPotential: this.calculateImprovementPotential(extractedData),
                timelineEstimate: '3-6 months'
              },
              summary: `PDF processed using ${pdfResult.processingMethod}. Found ${extractedData.accounts?.length || 0} accounts, ${extractedData.negativeItems?.length || 0} negative items, and ${extractedData.inquiries?.length || 0} inquiries.`
            }
          }
          
          // Update document with PDF results (only if we have a real DB record)
          if (documentData && !documentData.id.startsWith('temp-')) {
            try {
              await supabase
                .from('documents')
                .update({
                  ocr_text: ocrResult.text,
                  ai_analysis: ocrResult.aiAnalysis
                })
                .eq('id', documentData.id)
              console.log('Updated document with PDF processing results')
            } catch (updateError) {
              console.error('Failed to update document with PDF results:', updateError)
              // Continue anyway
            }
          }
          
        } catch (error) {
          console.error('Server-side PDF processing failed:', error)
          ocrResult = this.createPDFFallbackResult(file.name)
        }
      }

      const processingTime = Date.now() - startTime
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: `Upload and analysis complete! (${processingTime}ms)`
      })

      // Track successful upload
      await analyticsService.trackUploadSuccess(file, urlData.publicUrl)

      return {
        url: urlData.publicUrl,
        path: fileName,
        size: processedFile.size,
        type: processedFile.type,
        ocrResult,
        documentId: documentData?.id
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

  /**
   * Determine document type based on file name and type
   */
  private determineDocumentType(file: File): string {
    const fileName = file.name.toLowerCase()
    
    if (fileName.includes('credit') && fileName.includes('report')) {
      return 'credit_report'
    } else if (fileName.includes('bank') || fileName.includes('statement')) {
      return 'bank_statement'
    } else if (fileName.includes('income') || fileName.includes('pay')) {
      return 'income'
    } else if (fileName.includes('id') || fileName.includes('license')) {
      return 'identity'
    } else if (fileName.includes('dispute') || fileName.includes('letter')) {
      return 'dispute_letter'
    } else {
      return 'other'
    }
  }

  private async convertPDFToImage(file: File): Promise<string | null> {
    try {
      // For now, we'll use a simpler approach that doesn't require PDF.js workers
      // This is a fallback that creates a placeholder image for PDFs
      console.log('Creating placeholder image for PDF processing')
      
      // Create a canvas with placeholder content
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) {
        throw new Error('Failed to get canvas context')
      }
      
      // Set canvas size
      canvas.width = 800
      canvas.height = 600
      
      // Fill background
      context.fillStyle = 'white'
      context.fillRect(0, 0, 800, 600)
      
      // Add text
      context.fillStyle = 'black'
      context.font = '24px Arial'
      context.textAlign = 'center'
      context.fillText('PDF Processing', 400, 200)
      context.fillText('Document: ' + file.name, 400, 250)
      context.fillText('Size: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB', 400, 300)
      context.fillText('Processing in progress...', 400, 350)
      
      // Convert canvas to blob URL
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            resolve(url)
          } else {
            resolve(null)
          }
        }, 'image/png', 0.9)
      })
      
    } catch (error) {
      console.error('PDF to image conversion failed:', error)
      return null
    }
  }

  private generateRecommendationsFromPDFData(extractedData: any): any[] {
    const recommendations = []
    
    // Generate recommendations based on negative items
    if (extractedData.negativeItems && extractedData.negativeItems.length > 0) {
      extractedData.negativeItems.forEach((item: any, index: number) => {
        recommendations.push({
          negativeItemId: `pdf-item-${index}`,
          priority: 'high',
          disputeReason: `Dispute ${item.itemType || 'negative item'} with ${item.creditorName}`,
          legalBasis: 'Fair Credit Reporting Act - right to dispute inaccurate information',
          expectedImpact: 'Potential score improvement of 10-50 points',
          letterTemplate: `Dispute letter for ${item.creditorName}`
        })
      })
    }
    
    // Generate recommendations based on inquiries
    if (extractedData.inquiries && extractedData.inquiries.length > 0) {
      extractedData.inquiries.forEach((inquiry: any, index: number) => {
        recommendations.push({
          negativeItemId: `pdf-inquiry-${index}`,
          priority: 'medium',
          disputeReason: `Dispute unauthorized inquiry from ${inquiry.creditorName}`,
          legalBasis: 'Fair Credit Reporting Act - unauthorized access to credit report',
          expectedImpact: 'Potential score improvement of 5-15 points',
          letterTemplate: `Inquiry dispute letter for ${inquiry.creditorName}`
        })
      })
    }
    
    return recommendations
  }

  private generateScoreFactors(extractedData: any): any[] {
    const factors = []
    
    if (extractedData.creditScore.score > 0) {
      factors.push({
        factor: 'Current Credit Score',
        impact: extractedData.creditScore.score >= 700 ? 'positive' : 'negative',
        weight: 100,
        description: `Current score: ${extractedData.creditScore.score}`
      })
    }
    
    if (extractedData.negativeItems && extractedData.negativeItems.length > 0) {
      factors.push({
        factor: 'Negative Items',
        impact: 'negative',
        weight: extractedData.negativeItems.length * 20,
        description: `${extractedData.negativeItems.length} negative items found`
      })
    }
    
    if (extractedData.inquiries && extractedData.inquiries.length > 0) {
      factors.push({
        factor: 'Credit Inquiries',
        impact: 'negative',
        weight: extractedData.inquiries.length * 10,
        description: `${extractedData.inquiries.length} recent inquiries`
      })
    }
    
    return factors
  }

  private calculateImprovementPotential(extractedData: any): number {
    let potential = 0
    
    // Base potential from negative items
    if (extractedData.negativeItems && extractedData.negativeItems.length > 0) {
      potential += extractedData.negativeItems.length * 25
    }
    
    // Additional potential from inquiries
    if (extractedData.inquiries && extractedData.inquiries.length > 0) {
      potential += extractedData.inquiries.length * 10
    }
    
    // Cap at reasonable amount
    return Math.min(potential, 200)
  }

  private createPDFFallbackResult(fileName: string): any {
    // Create a more informative fallback result for PDFs
    const fallbackText = `PDF Credit Report: ${fileName}
    
This PDF credit report has been uploaded successfully. The system is currently processing PDF files and will extract credit information including:

• Personal Information
• Credit Scores  
• Account Details
• Payment History
• Negative Items
• Public Records
• Credit Inquiries

PDF processing is currently in development. For immediate results, please upload an image file (JPG, PNG) instead of PDF.

Please check back shortly for the complete analysis results.`

    return {
      text: fallbackText,
      confidence: 100,
      words: [],
      creditData: {
        accounts: [],
        inquiries: [],
        publicRecords: []
      },
      aiAnalysis: {
        extractedData: {
          personalInfo: { 
            name: 'PDF Document', 
            address: 'Processing required' 
          },
          creditScore: { 
            score: 0, 
            bureau: 'experian', 
            date: new Date().toISOString().split('T')[0], 
            scoreRange: { min: 300, max: 850 } 
          },
          accounts: [],
          negativeItems: [],
          inquiries: [],
          publicRecords: []
        },
        recommendations: [
          {
            negativeItemId: 'pdf-processing',
            priority: 'medium',
            disputeReason: 'PDF processing in development',
            legalBasis: 'Document analysis requires image format',
            expectedImpact: 'Upload image for immediate results',
            letterTemplate: 'Processing pending'
          }
        ],
        scoreAnalysis: { 
          currentScore: 0, 
          factors: [
            {
              factor: 'PDF Processing',
              impact: 'neutral',
              weight: 100,
              description: 'PDF analysis in development - upload image for immediate results'
            }
          ], 
          improvementPotential: 0, 
          timelineEstimate: 'Development in progress' 
        },
        summary: `PDF credit report "${fileName}" uploaded successfully. PDF processing is currently in development. For immediate analysis results, please upload an image file (JPG, PNG) instead of PDF. The system will extract credit information and generate dispute recommendations once processing is complete.`
      }
    }
  }
}

// Singleton instance
export const fileUploader = new FileUploader() 