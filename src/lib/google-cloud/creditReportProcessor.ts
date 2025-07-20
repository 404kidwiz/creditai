import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { configManager, EnhancedGoogleCloudConfig } from './enhancedConfig'
import * as pdfPoppler from 'pdf-poppler'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface CreditReportAnalysis {
  personalInfo: {
    name: string
    address: string
    ssn?: string
    dateOfBirth?: string
    phone?: string
    email?: string
  }
  creditScores: Array<{
    bureau: string
    score: number
    date: string
    factors: string[]
    range: { min: number; max: number }
  }>
  accounts: Array<{
    id: string
    creditor: string
    accountNumber: string
    type: string
    status: string
    balance: number
    limit?: number
    opened: string
    lastActivity: string
    paymentHistory: Array<{
      date: string
      status: string
      amount?: number
    }>
    remarks: string[]
  }>
  negativeItems: Array<{
    id: string
    type: 'late_payment' | 'collection' | 'charge_off' | 'judgment' | 'bankruptcy' | 'foreclosure'
    creditor: string
    accountNumber?: string
    amount: number
    dateReported: string
    dateOccurred?: string
    status: string
    impact: 'high' | 'medium' | 'low'
    disputeReasons: string[]
  }>
  inquiries: Array<{
    id: string
    creditor: string
    date: string
    type: 'hard' | 'soft'
    purpose: string
  }>
  publicRecords: Array<{
    id: string
    type: string
    court?: string
    dateFiled: string
    amount?: number
    status: string
    description: string
  }>
  summary: {
    totalAccounts: number
    openAccounts: number
    closedAccounts: number
    totalDebt: number
    availableCredit: number
    utilization: number
    oldestAccount: string
    newestAccount: string
  }
}

export interface ProcessingResult {
  analysis: CreditReportAnalysis
  confidence: number
  processingTime: number
  method: 'document-ai' | 'vision-ai' | 'hybrid'
  extractedText: string
  rawEntities: any[]
  violations: FCRAViolation[]
}

export interface FCRAViolation {
  type: 'inaccurate' | 'incomplete' | 'outdated' | 'unverifiable'
  item: string
  description: string
  legalBasis: string
  disputeLikelihood: 'high' | 'medium' | 'low'
  potentialImpact: number
}

export class EnhancedCreditReportProcessor {
  private documentClient: DocumentProcessorServiceClient
  private visionClient: ImageAnnotatorClient
  private gemini: GoogleGenerativeAI

  private constructor(config: EnhancedGoogleCloudConfig) {
    this.documentClient = new DocumentProcessorServiceClient({
      keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS,
    })

    this.visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS,
    })

    this.gemini = new GoogleGenerativeAI(config.gemini.apiKey)
  }

  public static async create(): Promise<EnhancedCreditReportProcessor> {
    await configManager.initialize()
    const config = configManager.getConfig()
    return new EnhancedCreditReportProcessor(config)
  }

  async processCreditReport(
    fileBuffer: Buffer,
    fileName: string,
    options: {
      useDocumentAI: boolean
      useVisionFallback: boolean
      enableAdvancedAnalysis: boolean
    } = {
      useDocumentAI: true,
      useVisionFallback: true,
      enableAdvancedAnalysis: true
    }
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      let result: ProcessingResult
      
      const config = configManager.getConfig();
      if (options.useDocumentAI && config.documentAi.processorId) {
        result = await this.processWithDocumentAI(fileBuffer, options)
      } else if (options.useVisionFallback) {
        result = await this.processWithVisionAPI(fileBuffer, options)
      } else {
        throw new Error('No processing method enabled')
      }
      
      result.processingTime = Date.now() - startTime
      return result
      
    } catch (error) {
      console.error('Credit report processing failed:', error)
      throw error
    }
  }

  private async processWithDocumentAI(
    fileBuffer: Buffer,
    options: any
  ): Promise<ProcessingResult> {
    const config = configManager.getConfig()
    
    const request = {
      name: `projects/${config.projectId}/locations/${config.location}/processors/${config.documentAi.processorId}`,
      rawDocument: {
        content: fileBuffer,
        mimeType: 'application/pdf'
      }
    }

    const [result] = await this.documentClient.processDocument(request)
    
    if (!result.document) {
      throw new Error('No document returned from Document AI')
    }

    const document = result.document
    
    // Use Gemini to analyze the structured data
    const analysis = await this.analyzeWithGemini(document.text || '')
    const violations = await this.detectFCRAViolations(analysis)
    
    return {
      analysis,
      confidence: this.calculateConfidence(document),
      processingTime: 0,
      method: 'document-ai',
      extractedText: document.text || '',
      rawEntities: document.entities || [],
      violations
    }
  }

  private async processWithVisionAPI(
    fileBuffer: Buffer,
    options: any
  ): Promise<ProcessingResult> {
    console.log('🔍 Starting Vision API processing...')
    console.log('📄 PDF Buffer size:', fileBuffer.length, 'bytes')
    
    try {
      // Convert PDF to images first
      const imageBuffers = await this.convertPdfToImages(fileBuffer)
      console.log('🖼️ PDF converted to', imageBuffers.length, 'images')
      
      // Process each image with Vision API
      let allText = ''
      for (let i = 0; i < imageBuffers.length; i++) {
        console.log(`📄 Processing page ${i + 1}/${imageBuffers.length}...`)
        const [result] = await this.visionClient.documentTextDetection(imageBuffers[i])
        
        console.log('📋 Vision API Response received for page', i + 1)
        console.log('🔍 Response keys:', Object.keys(result))
        console.log('📝 Has fullTextAnnotation:', !!result.fullTextAnnotation)
        
        if (result.fullTextAnnotation) {
          console.log('📄 Text length:', result.fullTextAnnotation.text?.length || 0)
          console.log('📝 First 200 chars:', result.fullTextAnnotation.text?.substring(0, 200))
        }
        
        if (result.textAnnotations) {
          console.log('📋 Text annotations count:', result.textAnnotations.length)
        }
        
        if (result.error) {
          console.log('❌ Vision API error:', result.error)
          continue // Skip this page but continue with others
        }
        
        if (!result.fullTextAnnotation) {
          console.log('❌ No fullTextAnnotation in response for page', i + 1)
          continue // Skip this page but continue with others
        }

        const pageText = result.fullTextAnnotation.text
        
        if (pageText && pageText.trim().length > 0) {
          allText += pageText + '\n\n'
          console.log('✅ Page', i + 1, 'text extraction successful')
          console.log('📄 Page text length:', pageText.length)
        } else {
          console.log('⚠️ Empty text extracted from page', i + 1)
        }
      }
      
      if (!allText || allText.trim().length === 0) {
        console.log('❌ No text extracted from any pages')
        throw new Error('No text extracted from Vision API')
      }
      
      console.log('✅ Vision API text extraction successful')
      console.log('📄 Total extracted text length:', allText.length)
      
      // Use Gemini to analyze the extracted text
      const analysis = await this.analyzeWithGemini(allText)
      const violations = await this.detectFCRAViolations(analysis)
      
      return {
        analysis,
        confidence: 0.75,
        processingTime: 0,
        method: 'vision-ai',
        extractedText: allText,
        rawEntities: [],
        violations
      }
    } catch (error) {
      console.error('❌ Vision API processing failed:', error)
      throw error
    }
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    console.log('🔄 Converting PDF to images...')
    
    const tempDir = os.tmpdir()
    const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`)
    const tempOutputDir = path.join(tempDir, `output_${Date.now()}`)
    
    try {
      // Write PDF buffer to temporary file
      fs.writeFileSync(tempPdfPath, pdfBuffer)
      
      // Create output directory
      fs.mkdirSync(tempOutputDir, { recursive: true })
      
      // Convert PDF to images using pdf-poppler
      const options = {
        format: 'png',
        out_dir: tempOutputDir,
        out_prefix: 'page',
        page: null // Convert all pages
      }
      
      await pdfPoppler.convert(tempPdfPath, options)
      
      // Read all generated images
      const imageBuffers: Buffer[] = []
      const files = fs.readdirSync(tempOutputDir)
      
      for (const file of files.sort()) {
        if (file.endsWith('.png')) {
          const imagePath = path.join(tempOutputDir, file)
          const imageBuffer = fs.readFileSync(imagePath)
          imageBuffers.push(imageBuffer)
          console.log(`📸 Loaded image: ${file} (${imageBuffer.length} bytes)`)
        }
      }
      
      console.log(`✅ Successfully converted PDF to ${imageBuffers.length} images`)
      return imageBuffers
      
    } catch (error) {
      console.error('❌ PDF to image conversion failed:', error)
      throw error
    } finally {
      // Clean up temporary files
      try {
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath)
        }
        if (fs.existsSync(tempOutputDir)) {
          const files = fs.readdirSync(tempOutputDir)
          for (const file of files) {
            fs.unlinkSync(path.join(tempOutputDir, file))
          }
          fs.rmdirSync(tempOutputDir)
        }
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup failed:', cleanupError)
      }
    }
  }

  private async analyzeWithGemini(text: string): Promise<CreditReportAnalysis> {
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const prompt = `Analyze this credit report and extract all relevant information in JSON format.
    
Extract:
1. Personal info (name, address, SSN, DOB, phone, email)
2. Credit scores (Experian, Equifax, TransUnion)
3. All accounts (creditor, type, status, balance, dates)
4. Negative items (late payments, collections, etc.)
5. Inquiries (hard/soft)
6. Public records
7. Summary stats

Return JSON with exact structure:
{"personalInfo":{"name":"","address":"","ssn":"","dateOfBirth":"","phone":"","email":""},"creditScores":[{"bureau":"","score":0,"date":"","factors":[],"range":{"min":0,"max":0}}],"accounts":[{"id":"","creditor":"","accountNumber":"","type":"","status":"","balance":0,"limit":0,"opened":"","lastActivity":"","paymentHistory":[],"remarks":[]}],"negativeItems":[],"inquiries":[],"publicRecords":[],"summary":{"totalAccounts":0,"openAccounts":0,"closedAccounts":0,"totalDebt":0,"availableCredit":0,"utilization":0,"oldestAccount":"","newestAccount":""}}

Text: ${text.substring(0, 10000)}...`

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Gemini analysis failed:', error)
      return this.getDefaultAnalysis()
    }
  }

  private async detectFCRAViolations(analysis: CreditReportAnalysis): Promise<FCRAViolation[]> {
    const violations: FCRAViolation[] = []
    
    // Check for outdated negative items (7+ years)
    const sevenYearsAgo = new Date()
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7)
    
    for (const item of analysis.negativeItems) {
      const reportedDate = new Date(item.dateReported)
      
      if (reportedDate < sevenYearsAgo) {
        violations.push({
          type: 'outdated',
          item: `${item.type} from ${item.creditor}`,
          description: `Item reported more than 7 years ago`,
          legalBasis: 'FCRA Section 605(a)',
          disputeLikelihood: 'high',
          potentialImpact: 50
        })
      }
      
      // Check for incomplete information
      if (!item.accountNumber || item.amount <= 0) {
        violations.push({
          type: 'incomplete',
          item: `${item.type} from ${item.creditor}`,
          description: 'Missing required account information',
          legalBasis: 'FCRA Section 611',
          disputeLikelihood: 'medium',
          potentialImpact: 25
        })
      }
    }
    
    // Check for duplicate inquiries
    const inquiryMap = new Map()
    for (const inquiry of analysis.inquiries) {
      const key = `${inquiry.creditor}-${inquiry.date}`
      if (inquiryMap.has(key)) {
        violations.push({
          type: 'inaccurate',
          item: `Duplicate inquiry from ${inquiry.creditor}`,
          description: 'Multiple inquiries for same creditor on same date',
          legalBasis: 'FCRA Section 611',
          disputeLikelihood: 'high',
          potentialImpact: 10
        })
      }
      inquiryMap.set(key, true)
    }
    
    return violations
  }

  private calculateConfidence(document: any): number {
    if (!document.entities) return 0.5
    
    const totalEntities = document.entities.length
    const highConfidenceEntities = document.entities.filter(
      (entity: any) => entity.confidence && entity.confidence > 0.8
    ).length
    
    return totalEntities > 0 ? highConfidenceEntities / totalEntities : 0.5
  }

  private getDefaultAnalysis(): CreditReportAnalysis {
    return {
      personalInfo: { name: '', address: '' },
      creditScores: [],
      accounts: [],
      negativeItems: [],
      inquiries: [],
      publicRecords: [],
      summary: {
        totalAccounts: 0,
        openAccounts: 0,
        closedAccounts: 0,
        totalDebt: 0,
        availableCredit: 0,
        utilization: 0,
        oldestAccount: '',
        newestAccount: ''
      }
    }
  }
}

// No longer exporting a singleton instance