import Tesseract from 'tesseract.js'
import { analyticsService } from '@/lib/analytics/analyticsService'
import { creditAnalyzer, AIAnalysisResult } from '@/lib/ai/creditAnalyzer'

export interface ExtractedText {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
  creditData: {
    score?: string
    accounts: string[]
    inquiries: string[]
    publicRecords: string[]
  }
  aiAnalysis?: AIAnalysisResult
}

export interface OCRProgress {
  status: 'loading' | 'recognizing' | 'parsing' | 'analyzing' | 'complete' | 'error'
  progress: number
  message: string
}

export class TextExtractor {
  private worker: any = null

  async extractFromImage(
    imageUrl: string, 
    onProgress?: (progress: OCRProgress) => void,
    userId?: string,
    enableAIAnalysis: boolean = true
  ): Promise<ExtractedText> {
    const startTime = Date.now()
    
    try {
      onProgress?.({
        status: 'loading',
        progress: 0,
        message: 'Initializing OCR engine...'
      })

      // Create worker
      this.worker = await Tesseract.createWorker()
      
      // Load English language with optimized settings
      await this.worker.loadLanguage('eng')
      await this.worker.initialize('eng')
      
      onProgress?.({
        status: 'recognizing',
        progress: 60,
        message: 'Extracting text from image...'
      })

      // Optimized OCR parameters for credit reports
      await this.worker.setParameters({
        // Character whitelist optimized for credit reports
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$%()-/:\\s',
        
        // Page segmentation mode for mixed text
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        
        // Preserve interword spaces for better parsing
        preserve_interword_spaces: '1',
        
        // OCR Engine mode for better accuracy
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        
        // Language model for better text recognition
        tessedit_do_invert: '0',
        
        // Text orientation detection
        textord_orientation: '0',
        
        // Line finding parameters
        textord_min_linesize: '1.5',
        
        // Word recognition parameters
        textord_min_xheight: '8',
        
        // Noise reduction
        textord_noise_debug: '0',
        textord_noise_normratio: '2.0',
        
        // Character recognition parameters
        tessedit_char_blacklist: '|\\/',
        
        // Confidence threshold
        tessedit_min_confidence: '30'
      })

      // Track OCR start
      await analyticsService.trackOCRStart(new File([], 'credit_report.jpg'))
      
      // Recognize text with retry logic
      let attempts = 0
      const maxAttempts = 2
      let result
      
      while (attempts < maxAttempts) {
        try {
          result = await this.worker.recognize(imageUrl)
          break
        } catch (error) {
          attempts++
          if (attempts >= maxAttempts) throw error
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      const { data } = result!
      
      onProgress?.({
        status: 'parsing',
        progress: 80,
        message: 'Parsing credit data...'
      })

      // Parse the extracted text for credit-specific information
      const creditData = this.parseCreditData(data.text)
      
      let aiAnalysis: AIAnalysisResult | undefined

      // Perform AI analysis if enabled and conditions are met
      if (enableAIAnalysis && userId && data.text.length > 100 && data.confidence > 50) {
        onProgress?.({
          status: 'analyzing',
          progress: 85,
          message: 'Analyzing credit report with AI...'
        })

        try {
          aiAnalysis = await creditAnalyzer.analyzeReport(data.text, userId)
        } catch (error) {
          console.error('AI analysis failed:', error)
          // Continue without AI analysis rather than failing
        }
      }
      
      const processingTime = Date.now() - startTime
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: `Text extraction ${aiAnalysis ? 'and analysis ' : ''}complete! (${processingTime}ms)`
      })

      // Track OCR success
      await analyticsService.trackOCRSuccess(new File([], 'credit_report.jpg'), data.confidence, processingTime)

      return {
        text: data.text,
        confidence: data.confidence,
        words: (data as any).words?.map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })) || [],
        creditData: {
          ...(creditData.score && { score: creditData.score }),
          accounts: creditData.accounts,
          inquiries: creditData.inquiries,
          publicRecords: creditData.publicRecords
        },
        aiAnalysis
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      onProgress?.({
        status: 'error',
        progress: 0,
        message: `OCR Error: ${errorMessage} (${processingTime}ms)`
      })
      
      // Track OCR failure
      await analyticsService.trackOCRFailure(new File([], 'credit_report.jpg'), errorMessage)
      throw error
    } finally {
      if (this.worker) {
        await this.worker.terminate()
        this.worker = null
      }
    }
  }

  private parseCreditData(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    
    const creditData = {
      score: undefined as string | undefined,
      accounts: [] as string[],
      inquiries: [] as string[],
      publicRecords: [] as string[]
    }

    // Look for credit score patterns
    const scorePatterns = [
      /credit\s*score\s*:?\s*(\d{3})/i,
      /score\s*:?\s*(\d{3})/i,
      /(\d{3})\s*credit\s*score/i,
      /fico\s*:?\s*(\d{3})/i
    ]

    for (const line of lines) {
      for (const pattern of scorePatterns) {
        const match = line.match(pattern)
        if (match && match[1]) {
          creditData.score = match[1]
          break
        }
      }

      // Look for account information
      if (line.includes('account') || line.includes('loan') || line.includes('credit')) {
        creditData.accounts?.push(line)
      }

      // Look for inquiry information
      if (line.includes('inquiry') || line.includes('pull')) {
        creditData.inquiries?.push(line)
      }

      // Look for public records
      if (line.includes('public record') || line.includes('bankruptcy') || line.includes('lien')) {
        creditData.publicRecords?.push(line)
      }
    }

    return creditData
  }

  async extractFromPDF(pdfUrl: string, onProgress?: (progress: OCRProgress) => void): Promise<ExtractedText[]> {
    // For PDF processing, we'd need to convert PDF to images first
    // This is a placeholder for future PDF support
    throw new Error('PDF processing not yet implemented')
  }
}

// Singleton instance
export const textExtractor = new TextExtractor() 