/**
 * Unit Tests for PDF Text Extraction Accuracy
 * Tests the PDF processor's ability to extract text from various document types
 */

import { GoogleCloudPDFProcessor } from '../pdfProcessor'
import { creditReportParser } from '@/lib/ai/creditReportParser'

// Mock Google Cloud services
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    textDetection: jest.fn().mockResolvedValue([{
      textAnnotations: [{
        description: 'Mock extracted text from Vision API\nCredit Report\nName: John Doe\nScore: 720'
      }]
    }])
  }))
}))

jest.mock('@google-cloud/documentai', () => ({
  DocumentProcessorServiceClient: jest.fn().mockImplementation(() => ({
    processDocument: jest.fn().mockResolvedValue([{
      document: {
        text: 'Mock extracted text from Document AI\nCredit Report\nName: John Doe\nAddress: 123 Main St\nScore: 720\nAccounts: Bank of America - $1,000',
        pages: [{ pageNumber: 1 }]
      }
    }])
  }))
}))

// Mock credit report parser
jest.mock('@/lib/ai/creditReportParser', () => ({
  creditReportParser: {
    parseCreditReport: jest.fn().mockResolvedValue({
      personalInfo: {
        name: 'John Doe',
        address: '123 Main St',
        confidence: 90
      },
      creditScores: {
        experian: {
          score: 720,
          bureau: 'experian',
          confidence: 95
        }
      },
      accounts: [{
        id: 'acc_1',
        creditorName: 'Bank of America',
        balance: 1000,
        confidence: 85
      }],
      negativeItems: [],
      inquiries: [],
      publicRecords: [],
      extractionMetadata: {
        processingMethod: 'test',
        confidence: 90,
        processingTime: 100,
        documentQuality: 85,
        reportFormat: 'experian'
      }
    })
  }
}))

// Mock credit analyzer
jest.mock('@/lib/ai/creditAnalyzer', () => ({
  creditAnalyzer: {
    analyzeReport: jest.fn().mockResolvedValue({
      confidence: 85,
      recommendations: [],
      scoreAnalysis: {
        currentScore: 720,
        factors: [],
        improvementPotential: 50
      }
    })
  }
}))

describe('PDF Text Extraction Accuracy Tests', () => {
  let processor: GoogleCloudPDFProcessor

  beforeEach(() => {
    processor = new GoogleCloudPDFProcessor()
    jest.clearAllMocks()
  })

  describe('Document AI Text Extraction', () => {
    it('should extract text with high accuracy from structured PDFs', async () => {
      const mockFile = new File(['mock pdf content'], 'credit-report.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.text).toContain('Mock extracted text from Document AI')
      expect(result.confidence).toBeGreaterThan(90)
      expect(result.processingMethod).toBe('google-documentai')
      expect(result.extractedData.personalInfo.name).toBe('John Doe')
      expect(result.extractedData.creditScore.score).toBe(720)
    })

    it('should handle multi-page PDF documents', async () => {
      const mockFile = new File(['multi-page pdf content'], 'multi-page-report.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.pages).toBeGreaterThan(0)
      expect(result.text).toBeDefined()
      expect(result.confidence).toBeGreaterThan(80)
    })

    it('should extract structured data with confidence scores', async () => {
      const mockFile = new File(['structured pdf'], 'structured-report.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.extractedData).toBeDefined()
      expect(result.extractedData.personalInfo.name).toBeTruthy()
      expect(result.extractedData.creditScore.score).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(80)
    })
  })

  describe('Vision API Text Extraction', () => {
    it('should extract text from image-based PDFs using Vision API', async () => {
      // Mock Document AI failure to trigger Vision API fallback
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Document AI failed'))
      }))

      const mockFile = new File(['image-based pdf'], 'scanned-report.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.processingMethod).toBe('google-vision')
      expect(result.text).toContain('Mock extracted text from Vision API')
      expect(result.confidence).toBeGreaterThan(70)
    })

    it('should handle image files directly', async () => {
      const mockFile = new File(['image content'], 'credit-report.png', {
        type: 'image/png'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.processingMethod).toBe('basic-ocr')
      expect(result.text).toBeDefined()
      expect(result.confidence).toBeGreaterThan(60)
    })

    it('should process JPEG images with OCR', async () => {
      const mockFile = new File(['jpeg content'], 'credit-report.jpg', {
        type: 'image/jpeg'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.processingMethod).toBe('basic-ocr')
      expect(result.extractedData).toBeDefined()
    })
  })

  describe('Fallback Processing', () => {
    it('should use fallback processing when cloud services fail', async () => {
      // Mock all cloud services to fail
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      const { ImageAnnotatorClient } = require('@google-cloud/vision')
      
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }))
      
      ImageAnnotatorClient.mockImplementation(() => ({
        textDetection: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }))

      const mockFile = new File(['fallback content'], 'report.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.processingMethod).toBe('fallback')
      expect(result.text).toBeDefined()
      expect(result.confidence).toBeGreaterThan(50)
      expect(result.extractedData).toBeDefined()
    })

    it('should provide meaningful mock data in fallback mode', async () => {
      // Force fallback by mocking service unavailability
      const processor = new GoogleCloudPDFProcessor()
      processor['isConfigured'] = false

      const mockFile = new File(['content'], 'test.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.processingMethod).toBe('fallback')
      expect(result.extractedData.personalInfo.name).toBeTruthy()
      expect(result.extractedData.accounts.length).toBeGreaterThan(0)
      expect(result.extractedData.creditScore.score).toBeGreaterThan(0)
    })
  })

  describe('Text Extraction Quality Assessment', () => {
    it('should assess document quality and adjust confidence accordingly', async () => {
      const highQualityFile = new File(['high quality content'], 'high-quality.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(highQualityFile)

      expect(result.confidence).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should detect and handle OCR artifacts', async () => {
      // Mock text with OCR artifacts
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockResolvedValue([{
          document: {
            text: 'Cr3d1t R3p0rt w1th 0CR 3rr0rs\n@#$%^&*()\nN@me: J0hn D03',
            pages: [{ pageNumber: 1 }]
          }
        }])
      }))

      const mockFile = new File(['poor quality scan'], 'poor-quality.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.text).toContain('0CR')
      expect(result.confidence).toBeLessThan(90) // Lower confidence for poor quality
    })

    it('should handle empty or corrupted files gracefully', async () => {
      const emptyFile = new File([''], 'empty.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(emptyFile)

      expect(result).toBeDefined()
      expect(result.processingMethod).toBe('fallback')
      expect(result.text).toBeDefined()
    })
  })

  describe('Processing Time Performance', () => {
    it('should complete processing within reasonable time limits', async () => {
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf'
      })

      const startTime = Date.now()
      const result = await processor.processPDF(mockFile)
      const processingTime = Date.now() - startTime

      expect(result.processingTime).toBeDefined()
      expect(processingTime).toBeLessThan(10000) // 10 seconds max
    })

    it('should track processing time accurately', async () => {
      const mockFile = new File(['content'], 'timed-test.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.processingTime).toBeGreaterThan(0)
      expect(typeof result.processingTime).toBe('number')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network timeouts gracefully', async () => {
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
        )
      }))

      const mockFile = new File(['content'], 'timeout-test.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result).toBeDefined()
      expect(result.processingMethod).toBe('google-vision') // Should fallback
    })

    it('should handle authentication errors', async () => {
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      }))

      const mockFile = new File(['content'], 'auth-test.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result).toBeDefined()
      expect(['google-vision', 'fallback']).toContain(result.processingMethod)
    })

    it('should handle quota exceeded errors', async () => {
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Quota exceeded'))
      }))

      const mockFile = new File(['content'], 'quota-test.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result).toBeDefined()
      expect(result.processingMethod).not.toBe('google-documentai')
    })
  })

  describe('File Type Validation', () => {
    it('should accept valid PDF files', async () => {
      const pdfFile = new File(['pdf content'], 'valid.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(pdfFile)

      expect(result).toBeDefined()
      expect(result.extractedData).toBeDefined()
    })

    it('should accept valid image files', async () => {
      const imageFile = new File(['image content'], 'valid.png', {
        type: 'image/png'
      })

      const result = await processor.processPDF(imageFile)

      expect(result).toBeDefined()
      expect(result.processingMethod).toBe('basic-ocr')
    })

    it('should handle unsupported file types gracefully', async () => {
      const textFile = new File(['text content'], 'invalid.txt', {
        type: 'text/plain'
      })

      // This should still process but with fallback
      const result = await processor.processPDF(textFile)

      expect(result).toBeDefined()
      expect(result.processingMethod).toBe('fallback')
    })
  })

  describe('Data Extraction Accuracy', () => {
    it('should extract personal information accurately', async () => {
      const mockFile = new File(['personal info test'], 'personal.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.extractedData.personalInfo).toBeDefined()
      expect(result.extractedData.personalInfo.name).toBeTruthy()
      expect(typeof result.extractedData.personalInfo.name).toBe('string')
    })

    it('should extract credit scores with bureau information', async () => {
      const mockFile = new File(['credit score test'], 'scores.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.extractedData.creditScore).toBeDefined()
      expect(result.extractedData.creditScore.score).toBeGreaterThan(0)
      expect(result.extractedData.creditScore.bureau).toBeTruthy()
    })

    it('should extract account information with balances', async () => {
      const mockFile = new File(['account test'], 'accounts.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.extractedData.accounts).toBeDefined()
      expect(Array.isArray(result.extractedData.accounts)).toBe(true)
      
      if (result.extractedData.accounts.length > 0) {
        const account = result.extractedData.accounts[0]
        expect(account.creditorName).toBeTruthy()
        expect(typeof account.balance).toBe('number')
      }
    })

    it('should identify negative items correctly', async () => {
      const mockFile = new File(['negative items test'], 'negative.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(result.extractedData.negativeItems).toBeDefined()
      expect(Array.isArray(result.extractedData.negativeItems)).toBe(true)
    })
  })

  describe('Integration with Parser', () => {
    it('should integrate correctly with credit report parser', async () => {
      const mockFile = new File(['integration test'], 'integration.pdf', {
        type: 'application/pdf'
      })

      const result = await processor.processPDF(mockFile)

      expect(creditReportParser.parseCreditReport).toHaveBeenCalled()
      expect(result.extractedData).toBeDefined()
    })

    it('should pass processing method to parser', async () => {
      const mockFile = new File(['method test'], 'method.pdf', {
        type: 'application/pdf'
      })

      await processor.processPDF(mockFile)

      expect(creditReportParser.parseCreditReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/google-documentai|google-vision|fallback|basic-ocr/)
      )
    })
  })
})