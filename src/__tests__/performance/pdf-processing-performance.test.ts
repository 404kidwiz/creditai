/**
 * Performance Tests for Large PDF Processing
 * Tests system performance with various PDF sizes and processing loads
 */

import { GoogleCloudPDFProcessor } from '@/lib/google-cloud/pdfProcessor'
import { creditReportParser } from '@/lib/ai/creditReportParser'

// Mock Google Cloud services with realistic delays
jest.mock('@google-cloud/documentai', () => ({
  DocumentProcessorServiceClient: jest.fn().mockImplementation(() => ({
    processDocument: jest.fn().mockImplementation(async () => {
      // Simulate processing delay based on document size
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
      return [{
        document: {
          text: generateMockCreditReportText(),
          pages: Array(Math.floor(Math.random() * 5) + 1).fill({ pageNumber: 1 })
        }
      }]
    })
  }))
}))

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    textDetection: jest.fn().mockImplementation(async () => {
      // Simulate OCR processing delay
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))
      return [{
        textAnnotations: [{
          description: generateMockCreditReportText()
        }]
      }]
    })
  }))
}))

// Mock credit analyzer with realistic processing time
jest.mock('@/lib/ai/creditAnalyzer', () => ({
  creditAnalyzer: {
    analyzeReport: jest.fn().mockImplementation(async () => {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200))
      return {
        confidence: 85,
        recommendations: [],
        scoreAnalysis: {
          currentScore: 720,
          factors: [],
          improvementPotential: 50
        }
      }
    })
  }
}))

function generateMockCreditReportText(complexity: 'simple' | 'medium' | 'complex' = 'medium'): string {
  const baseText = `
    CREDIT REPORT
    Name: John Doe
    Address: 123 Main St, Anytown, CA 90210
    SSN: ***-**-1234
    Date of Birth: 01/15/1985
    
    CREDIT SCORES
    Experian: 720 (as of 01/15/2024)
    Equifax: 715 (as of 01/10/2024)
    TransUnion: 718 (as of 01/12/2024)
  `

  if (complexity === 'simple') {
    return baseText + `
      ACCOUNTS
      1. Bank of America Credit Card - Balance: $1,000
      
      NEGATIVE ITEMS
      None reported
    `
  }

  if (complexity === 'medium') {
    let mediumText = baseText + '\nACCOUNTS\n'
    for (let i = 1; i <= 10; i++) {
      mediumText += `
        ${i}. Creditor ${i} - Account Type
           Account: ****${String(1000 + i).padStart(4, '0')}
           Balance: $${(Math.random() * 5000).toFixed(2)}
           Status: Current
           Open Date: 0${(i % 12) + 1}/2020
      `
    }
    
    mediumText += '\nNEGATIVE ITEMS\n'
    for (let i = 1; i <= 3; i++) {
      mediumText += `
        ${i}. Late Payment - Creditor ${i}
           Date: 0${i}/2023
           Amount: $${(Math.random() * 200).toFixed(2)}
      `
    }
    
    return mediumText
  }

  // Complex report
  let complexText = baseText + '\nACCOUNTS\n'
  for (let i = 1; i <= 50; i++) {
    complexText += `
      ${i}. ${['Bank of America', 'Wells Fargo', 'Chase', 'Capital One', 'Citi'][i % 5]} - ${['Credit Card', 'Auto Loan', 'Mortgage', 'Personal Loan'][i % 4]}
         Account Number: ****${String(1000 + i).padStart(4, '0')}
         Balance: $${(Math.random() * 50000).toFixed(2)}
         Credit Limit: $${(5000 + Math.random() * 45000).toFixed(2)}
         Payment Status: ${['Current', 'Current', 'Current', '30 Days Late'][i % 4]}
         Open Date: ${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/${2015 + (i % 8)}
         Last Reported: 01/15/2024
         Payment History: ${Array(24).fill('C').map((_, idx) => idx === i % 24 ? '1' : 'C').join('')}
    `
  }
  
  complexText += '\nNEGATIVE ITEMS\n'
  for (let i = 1; i <= 20; i++) {
    complexText += `
      ${i}. ${['Late Payment', 'Collection', 'Charge Off'][i % 3]} - Creditor ${i}
         Date Reported: ${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/2023
         Amount: $${(Math.random() * 2000).toFixed(2)}
         Status: ${['Paid', 'Unpaid', 'Settled'][i % 3]}
         Impact Score: ${Math.floor(Math.random() * 100)}
    `
  }
  
  complexText += '\nCREDIT INQUIRIES\n'
  for (let i = 1; i <= 15; i++) {
    complexText += `
      ${i}. ${['Bank of America', 'Wells Fargo', 'Chase', 'Capital One'][i % 4]} - ${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/2023
         Type: ${['Hard', 'Soft'][i % 2]} Inquiry
         Purpose: ${['Credit Card Application', 'Auto Loan', 'Account Review'][i % 3]}
    `
  }
  
  return complexText
}

describe('PDF Processing Performance Tests', () => {
  let processor: GoogleCloudPDFProcessor

  beforeEach(() => {
    processor = new GoogleCloudPDFProcessor()
    jest.clearAllMocks()
  })

  describe('Single Document Performance', () => {
    it('should process small PDF (1-2 pages) within 5 seconds', async () => {
      const smallPdfContent = Buffer.from(generateMockCreditReportText('simple'))
      const file = new File([smallPdfContent], 'small-report.pdf', {
        type: 'application/pdf'
      })

      const startTime = Date.now()
      const result = await processor.processPDF(file)
      const processingTime = Date.now() - startTime

      expect(result).toBeDefined()
      expect(result.extractedData).toBeDefined()
      expect(processingTime).toBeLessThan(5000) // 5 seconds
      expect(result.processingTime).toBeLessThan(5000)
    })

    it('should process medium PDF (5-10 pages) within 15 seconds', async () => {
      const mediumPdfContent = Buffer.from(generateMockCreditReportText('medium'))
      const file = new File([mediumPdfContent], 'medium-report.pdf', {
        type: 'application/pdf'
      })

      const startTime = Date.now()
      const result = await processor.processPDF(file)
      const processingTime = Date.now() - startTime

      expect(result).toBeDefined()
      expect(result.extractedData.accounts.length).toBeGreaterThan(0)
      expect(processingTime).toBeLessThan(15000) // 15 seconds
    }, 20000)

    it('should process large PDF (20+ pages) within 45 seconds', async () => {
      const largePdfContent = Buffer.from(generateMockCreditReportText('complex'))
      const file = new File([largePdfContent], 'large-report.pdf', {
        type: 'application/pdf'
      })

      const startTime = Date.now()
      const result = await processor.processPDF(file)
      const processingTime = Date.now() - startTime

      expect(result).toBeDefined()
      expect(result.extractedData.accounts.length).toBeGreaterThan(0)
      expect(result.extractedData.negativeItems.length).toBeGreaterThan(0)
      expect(processingTime).toBeLessThan(45000) // 45 seconds
    }, 50000)

    it('should maintain accuracy with increasing document size', async () => {
      const sizes = ['simple', 'medium', 'complex'] as const
      const results = []

      for (const size of sizes) {
        const content = Buffer.from(generateMockCreditReportText(size))
        const file = new File([content], `${size}-report.pdf`, {
          type: 'application/pdf'
        })

        const result = await processor.processPDF(file)
        results.push(result)
      }

      // All results should maintain reasonable confidence
      results.forEach((result, index) => {
        expect(result.confidence).toBeGreaterThan(60)
        expect(result.extractedData.personalInfo.name).toBeTruthy()
        
        // Complex documents should have more data
        if (index === 2) { // complex
          expect(result.extractedData.accounts.length).toBeGreaterThan(results[0].extractedData.accounts.length)
        }
      })
    }, 60000)
  })

  describe('Concurrent Processing Performance', () => {
    it('should handle 3 concurrent small PDF processing within 10 seconds', async () => {
      const files = Array(3).fill(null).map((_, index) => {
        const content = Buffer.from(generateMockCreditReportText('simple'))
        return new File([content], `concurrent-small-${index}.pdf`, {
          type: 'application/pdf'
        })
      })

      const startTime = Date.now()
      const promises = files.map(file => processor.processPDF(file))
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.confidence).toBeGreaterThan(50)
      })
      expect(totalTime).toBeLessThan(10000) // 10 seconds total
    })

    it('should handle 5 concurrent medium PDF processing within 30 seconds', async () => {
      const files = Array(5).fill(null).map((_, index) => {
        const content = Buffer.from(generateMockCreditReportText('medium'))
        return new File([content], `concurrent-medium-${index}.pdf`, {
          type: 'application/pdf'
        })
      })

      const startTime = Date.now()
      const promises = files.map(file => processor.processPDF(file))
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.extractedData.accounts.length).toBeGreaterThan(0)
      })
      expect(totalTime).toBeLessThan(30000) // 30 seconds total
    }, 35000)

    it('should maintain performance under mixed concurrent load', async () => {
      const files = [
        ...Array(2).fill(null).map((_, i) => ({
          file: new File([Buffer.from(generateMockCreditReportText('simple'))], `mixed-simple-${i}.pdf`, { type: 'application/pdf' }),
          expectedTime: 5000
        })),
        ...Array(2).fill(null).map((_, i) => ({
          file: new File([Buffer.from(generateMockCreditReportText('medium'))], `mixed-medium-${i}.pdf`, { type: 'application/pdf' }),
          expectedTime: 15000
        })),
        ...Array(1).fill(null).map((_, i) => ({
          file: new File([Buffer.from(generateMockCreditReportText('complex'))], `mixed-complex-${i}.pdf`, { type: 'application/pdf' }),
          expectedTime: 45000
        }))
      ]

      const startTime = Date.now()
      const promises = files.map(({ file }) => processor.processPDF(file))
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.confidence).toBeGreaterThan(50)
      })
      expect(totalTime).toBeLessThan(60000) // 60 seconds total for mixed load
    }, 65000)
  })

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks with repeated processing', async () => {
      const initialMemory = process.memoryUsage()
      
      // Process 10 documents sequentially
      for (let i = 0; i < 10; i++) {
        const content = Buffer.from(generateMockCreditReportText('medium'))
        const file = new File([content], `memory-test-${i}.pdf`, {
          type: 'application/pdf'
        })
        
        await processor.processPDF(file)
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100
      
      // Memory usage should not increase dramatically
      expect(memoryIncreasePercent).toBeLessThan(150) // Less than 150% increase
    }, 60000)

    it('should handle large documents without excessive memory usage', async () => {
      const initialMemory = process.memoryUsage()
      
      // Generate very large document
      let veryLargeText = generateMockCreditReportText('complex')
      // Duplicate content to make it even larger
      veryLargeText = veryLargeText.repeat(3)
      
      const content = Buffer.from(veryLargeText)
      const file = new File([content], 'very-large-report.pdf', {
        type: 'application/pdf'
      })
      
      const result = await processor.processPDF(file)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      expect(result).toBeDefined()
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024) // Less than 200MB increase
    }, 30000)
  })

  describe('Processing Method Performance Comparison', () => {
    it('should compare Document AI vs Vision API performance', async () => {
      const testFile = new File([Buffer.from(generateMockCreditReportText('medium'))], 'comparison-test.pdf', {
        type: 'application/pdf'
      })

      // Test Document AI (primary method)
      const docAIStart = Date.now()
      const docAIResult = await processor.processPDF(testFile)
      const docAITime = Date.now() - docAIStart

      // Mock Document AI failure to test Vision API
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }))

      const visionStart = Date.now()
      const visionResult = await processor.processPDF(testFile)
      const visionTime = Date.now() - visionStart

      expect(docAIResult.processingMethod).toBe('google-documentai')
      expect(visionResult.processingMethod).toBe('google-vision')
      
      // Both should complete within reasonable time
      expect(docAITime).toBeLessThan(20000)
      expect(visionTime).toBeLessThan(25000)
      
      // Document AI should generally be faster and more accurate
      expect(docAIResult.confidence).toBeGreaterThanOrEqual(visionResult.confidence - 10)
    }, 30000)

    it('should measure fallback processing performance', async () => {
      // Mock all cloud services to fail
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      const { ImageAnnotatorClient } = require('@google-cloud/vision')
      
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }))
      
      ImageAnnotatorClient.mockImplementation(() => ({
        textDetection: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }))

      const testFile = new File([Buffer.from(generateMockCreditReportText('medium'))], 'fallback-test.pdf', {
        type: 'application/pdf'
      })

      const startTime = Date.now()
      const result = await processor.processPDF(testFile)
      const processingTime = Date.now() - startTime

      expect(result.processingMethod).toBe('fallback')
      expect(processingTime).toBeLessThan(5000) // Fallback should be fast
      expect(result.extractedData).toBeDefined()
      expect(result.confidence).toBeGreaterThan(50) // Should still provide reasonable data
    })
  })

  describe('Scalability Testing', () => {
    it('should scale processing time linearly with document complexity', async () => {
      const complexities = ['simple', 'medium', 'complex'] as const
      const times: number[] = []
      
      for (const complexity of complexities) {
        const content = Buffer.from(generateMockCreditReportText(complexity))
        const file = new File([content], `scalability-${complexity}.pdf`, {
          type: 'application/pdf'
        })
        
        const startTime = Date.now()
        await processor.processPDF(file)
        const processingTime = Date.now() - startTime
        
        times.push(processingTime)
      }
      
      // Processing time should increase with complexity but not exponentially
      expect(times[1]).toBeGreaterThan(times[0]) // medium > simple
      expect(times[2]).toBeGreaterThan(times[1]) // complex > medium
      
      // But not more than 5x increase for each step
      expect(times[1]).toBeLessThan(times[0] * 5)
      expect(times[2]).toBeLessThan(times[1] * 5)
    }, 90000)

    it('should handle increasing concurrent load gracefully', async () => {
      const concurrencyLevels = [1, 3, 5]
      const avgTimes: number[] = []
      
      for (const concurrency of concurrencyLevels) {
        const files = Array(concurrency).fill(null).map((_, index) => {
          const content = Buffer.from(generateMockCreditReportText('medium'))
          return new File([content], `concurrency-${concurrency}-${index}.pdf`, {
            type: 'application/pdf'
          })
        })
        
        const startTime = Date.now()
        const promises = files.map(file => processor.processPDF(file))
        await Promise.all(promises)
        const totalTime = Date.now() - startTime
        
        const avgTime = totalTime / concurrency
        avgTimes.push(avgTime)
      }
      
      // Average time per request should not increase dramatically with concurrency
      const baseTime = avgTimes[0]
      avgTimes.forEach(time => {
        expect(time).toBeLessThan(baseTime * 2.5) // No more than 2.5x slower
      })
    }, 120000)
  })

  describe('Error Recovery Performance', () => {
    it('should recover quickly from service failures', async () => {
      // Mock intermittent failures
      let callCount = 0
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockImplementation(async () => {
          callCount++
          if (callCount % 3 === 0) {
            throw new Error('Intermittent service failure')
          }
          await new Promise(resolve => setTimeout(resolve, 200))
          return [{
            document: {
              text: generateMockCreditReportText('medium'),
              pages: [{ pageNumber: 1 }]
            }
          }]
        })
      }))

      const files = Array(6).fill(null).map((_, index) => {
        const content = Buffer.from(generateMockCreditReportText('medium'))
        return new File([content], `recovery-test-${index}.pdf`, {
          type: 'application/pdf'
        })
      })

      const startTime = Date.now()
      const promises = files.map(file => processor.processPDF(file))
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(6)
      
      // Some should succeed with Document AI, others should fallback
      const docAIResults = results.filter(r => r.processingMethod === 'google-documentai')
      const fallbackResults = results.filter(r => r.processingMethod !== 'google-documentai')
      
      expect(docAIResults.length).toBeGreaterThan(0)
      expect(fallbackResults.length).toBeGreaterThan(0)
      expect(totalTime).toBeLessThan(30000) // Should complete within 30 seconds
    }, 35000)

    it('should handle timeout scenarios efficiently', async () => {
      // Mock slow service that times out
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      DocumentProcessorServiceClient.mockImplementation(() => ({
        processDocument: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 2000)
          )
        )
      }))

      const testFile = new File([Buffer.from(generateMockCreditReportText('medium'))], 'timeout-test.pdf', {
        type: 'application/pdf'
      })

      const startTime = Date.now()
      const result = await processor.processPDF(testFile)
      const processingTime = Date.now() - startTime

      expect(result).toBeDefined()
      expect(result.processingMethod).not.toBe('google-documentai') // Should fallback
      expect(processingTime).toBeLessThan(10000) // Should not wait too long
    }, 15000)
  })

  describe('Resource Utilization', () => {
    it('should efficiently utilize CPU during processing', async () => {
      const files = Array(4).fill(null).map((_, index) => {
        const content = Buffer.from(generateMockCreditReportText('medium'))
        return new File([content], `cpu-test-${index}.pdf`, {
          type: 'application/pdf'
        })
      })

      const startTime = Date.now()
      const promises = files.map(file => processor.processPDF(file))
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(4)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.processingTime).toBeGreaterThan(0)
      })
      
      // Concurrent processing should be more efficient than sequential
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
      expect(totalTime).toBeLessThan(avgProcessingTime * 2) // Should be less than 2x sequential time
    }, 30000)
  })
})