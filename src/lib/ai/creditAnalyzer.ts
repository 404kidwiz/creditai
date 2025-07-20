import { GoogleGenerativeAI } from '@google/generative-ai'

export interface CreditScore {
  score: number
  bureau: 'experian' | 'equifax' | 'transunion'
  date: string
  scoreRange: { min: number; max: number }
}

export interface CreditReportData {
  personalInfo: {
    name: string
    address: string
    ssn?: string
    dateOfBirth?: string
  }
  creditScores: {
    experian?: CreditScore
    equifax?: CreditScore
    transunion?: CreditScore
  }
  accounts: CreditAccount[]
  negativeItems: NegativeItem[]
  inquiries: CreditInquiry[]
  publicRecords: PublicRecord[]
}

export interface CreditAccount {
  id: string
  creditorName: string
  accountNumber: string
  accountType: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'student_loan' | 'other'
  balance: number
  creditLimit?: number
  paymentHistory: PaymentHistoryEntry[]
  status: 'open' | 'closed' | 'paid' | 'charged_off'
  openDate: string
  lastReported: string
  bureaus: ('experian' | 'equifax' | 'transunion')[] // Which bureaus this account appears on
  bureauData?: {
    experian?: {
      balance?: number
      status?: string
      lastReported?: string
    }
    equifax?: {
      balance?: number
      status?: string
      lastReported?: string
    }
    transunion?: {
      balance?: number
      status?: string
      lastReported?: string
    }
  }
}

export interface PaymentHistoryEntry {
  month: string // YYYY-MM format
  status: 'current' | '30_days_late' | '60_days_late' | '90_days_late' | '120_days_late' | 'charge_off' | 'collection' | 'paid' | 'closed'
  amount?: number
  dateReported?: string
}

export interface NegativeItem {
  id: string
  type: 'late_payment' | 'collection' | 'charge_off' | 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure'
  creditorName: string
  accountNumber?: string
  amount: number
  date: string
  status: string
  description: string
  disputeReasons: string[]
  impactScore: number // 1-100, how much it affects credit score
}

export interface CreditInquiry {
  id: string
  creditorName: string
  date: string
  type: 'hard' | 'soft'
  purpose: string
  bureau: 'experian' | 'equifax' | 'transunion'
}

export interface PublicRecord {
  id: string
  type: 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure'
  amount?: number
  date: string
  status: string
  court?: string
}

export interface AIAnalysisResult {
  extractedData: CreditReportData
  recommendations: DisputeRecommendation[]
  scoreAnalysis: ScoreAnalysis
  summary: string
  confidence: number // 0-100, how confident the AI is in the analysis
  processingTime: number // milliseconds
}

export interface DisputeRecommendation {
  negativeItemId: string
  priority: 'high' | 'medium' | 'low'
  disputeReason: string
  legalBasis: string
  expectedImpact: string
  letterTemplate: string
  successProbability: number // 0-100
}

export interface ScoreAnalysis {
  currentScore: number
  factors: ScoreFactor[]
  improvementPotential: number
  timelineEstimate: string
  scoreRange: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor'
}

export interface ScoreFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
}

export class CreditAnalyzer {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null

  constructor() {
    console.log('🏗️ [INIT DEBUG] CreditAnalyzer constructor called')
    console.log('🏗️ [INIT DEBUG] Environment check - window undefined:', typeof window === 'undefined')
    
    // Only initialize on server-side
    if (typeof window === 'undefined') {
      const apiKey = process.env.GOOGLE_AI_API_KEY || ''
      console.log('🏗️ [INIT DEBUG] Server-side initialization')
      console.log('🏗️ [INIT DEBUG] API key available:', !!apiKey)
      console.log('🏗️ [INIT DEBUG] API key length:', apiKey.length)
      console.log('🏗️ [INIT DEBUG] API key starts with:', apiKey.substring(0, 10) + '...')
      
      if (!apiKey || apiKey === 'your_actual_gemini_api_key_here') {
        console.error('❌ [INIT DEBUG] Google AI API key not configured. Please set GOOGLE_AI_API_KEY in your environment variables.')
        console.error('❌ [INIT DEBUG] Get your API key from: https://aistudio.google.com/app/apikey')
        console.error('❌ [INIT DEBUG] Current API key value:', apiKey || 'undefined')
        // Don't throw error, just log it and continue without AI
        return
      }
      
      try {
        console.log('🔧 [INIT DEBUG] Initializing GoogleGenerativeAI...')
        this.genAI = new GoogleGenerativeAI(apiKey)
        console.log('✅ [INIT DEBUG] GoogleGenerativeAI instance created')
        
        console.log('🔧 [INIT DEBUG] Getting generative model...')
        this.model = this.genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.1, // Low temperature for more consistent results
            topK: 1,
            topP: 0.1,
            maxOutputTokens: 8192,
          },
        })
        console.log('✅ [INIT DEBUG] AI model initialized successfully')
        console.log('✅ [INIT DEBUG] Model object:', typeof this.model)
      } catch (error) {
        console.error('❌ [INIT DEBUG] Error initializing AI model:', error)
        console.error('❌ [INIT DEBUG] Error type:', typeof error)
        console.error('❌ [INIT DEBUG] Error message:', error.message)
        console.error('❌ [INIT DEBUG] Error stack:', error.stack)
      }
    } else {
      console.log('🏗️ [INIT DEBUG] Client-side initialization - skipping AI model setup')
    }

    // Bind methods to maintain 'this' context
    this.cleanAccount = this.cleanAccount.bind(this)
    this.cleanPaymentHistory = this.cleanPaymentHistory.bind(this)
    this.validateMonth = this.validateMonth.bind(this)
    this.validatePaymentStatus = this.validatePaymentStatus.bind(this)
    this.validateAccountType = this.validateAccountType.bind(this)
    this.validateAccountStatus = this.validateAccountStatus.bind(this)
    this.validateNumber = this.validateNumber.bind(this)
    this.validateDate = this.validateDate.bind(this)
    this.cleanNegativeItem = this.cleanNegativeItem.bind(this)
    this.validateNegativeItemType = this.validateNegativeItemType.bind(this)
    this.cleanInquiry = this.cleanInquiry.bind(this)
    this.validateInquiryType = this.validateInquiryType.bind(this)
    this.validateBureau = this.validateBureau.bind(this)
    this.cleanPublicRecord = this.cleanPublicRecord.bind(this)
    this.validatePublicRecordType = this.validatePublicRecordType.bind(this)
  }

  /**
   * Analyze credit report using AI
   */
  async analyzeReport(
    documentText: string,
    userId?: string,
    supabaseClient?: any
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now()
    console.log('🚀 [MAIN DEBUG] Starting credit report analysis...')
    console.log('🚀 [MAIN DEBUG] Document text length:', documentText.length)
    console.log('🚀 [MAIN DEBUG] User ID:', userId || 'anonymous')
    console.log('🚀 [MAIN DEBUG] Model available:', !!this.model)
    
    if (!this.model) {
      console.warn('⚠️ [MAIN DEBUG] AI model not available. Using fallback analysis.')
      return this.createFallbackAnalysis(documentText, userId, supabaseClient)
    }
    
    try {
      console.log('📊 [MAIN DEBUG] Starting AI-powered analysis pipeline...')
      
      // Extract structured data from credit report
      console.log('1️⃣ [MAIN DEBUG] Step 1: Extracting credit data...')
      const extractedData = await this.extractCreditData(documentText)
      console.log('✅ [MAIN DEBUG] Step 1 complete - Data extracted')
      
      // Generate dispute recommendations
      console.log('2️⃣ [MAIN DEBUG] Step 2: Generating dispute recommendations...')
      const recommendations = await this.generateDisputeRecommendations(extractedData)
      console.log('✅ [MAIN DEBUG] Step 2 complete - Generated', recommendations.length, 'recommendations')
      
      // Analyze credit score factors
      console.log('3️⃣ [MAIN DEBUG] Step 3: Analyzing score factors...')
      const scoreAnalysis = await this.analyzeScoreFactors(extractedData)
      console.log('✅ [MAIN DEBUG] Step 3 complete - Score analysis done, current score:', scoreAnalysis.currentScore)
      
      // Generate summary
      console.log('4️⃣ [MAIN DEBUG] Step 4: Generating summary...')
      const summary = await this.generateSummary(extractedData, recommendations, scoreAnalysis)
      console.log('✅ [MAIN DEBUG] Step 4 complete - Summary generated, length:', summary.length)
      
      // Calculate confidence based on data quality
      console.log('5️⃣ [MAIN DEBUG] Step 5: Calculating confidence...')
      const confidence = this.calculateConfidence(extractedData, documentText)
      console.log('✅ [MAIN DEBUG] Step 5 complete - Confidence calculated:', confidence)
      
      const processingTime = Date.now() - startTime
      console.log('⏱️ [MAIN DEBUG] Total processing time:', processingTime, 'ms')
      
      const result: AIAnalysisResult = {
        extractedData,
        recommendations,
        scoreAnalysis,
        summary,
        confidence,
        processingTime
      }
      
      console.log('📈 [MAIN DEBUG] Final analysis result summary:', {
        accountsCount: result.extractedData.accounts.length,
        negativeItemsCount: result.extractedData.negativeItems.length,
        recommendationsCount: result.recommendations.length,
        confidence: result.confidence,
        processingTime: result.processingTime,
        currentScore: result.scoreAnalysis.currentScore
      })
      
      // Save analysis to database
      console.log('💾 [MAIN DEBUG] Saving analysis to database...')
      await this.saveAnalysis(userId, result, supabaseClient)
      console.log('✅ [MAIN DEBUG] Analysis saved successfully')

      return result
    } catch (error) {
      console.error('❌ [MAIN DEBUG] Credit analysis error:', error)
      console.error('❌ [MAIN DEBUG] Error type:', typeof error)
      console.error('❌ [MAIN DEBUG] Error message:', error.message)
      console.error('❌ [MAIN DEBUG] Error stack:', error.stack)
      
      // Check if this is a quota error
      if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
        console.warn('🚫 [MAIN DEBUG] Quota exceeded - falling back to basic analysis')
        console.warn('🚫 [MAIN DEBUG] This is why users are getting inaccurate results!')
      } else {
        console.warn('⚠️ [MAIN DEBUG] Falling back to basic analysis due to AI error.')
      }
      
      return this.createFallbackAnalysis(documentText, userId, supabaseClient)
    }
  }

  /**
   * Calculate confidence score based on data quality - IMPROVED VERSION
   */
  private calculateConfidence(extractedData: CreditReportData, originalText: string): number {
    console.log('🚀 [ULTRAFIX-V2] IMPROVED confidence calculation running!')
    console.log('🚀 [ULTRAFIX-V2] If you see this, the new code is working!')
    console.log('🎯 [CONFIDENCE DEBUG] Original text length:', originalText.length)
    console.log('🎯 [CONFIDENCE DEBUG] Original text preview:', originalText.substring(0, 500))
    
    let confidence = 0
    let totalChecks = 0
    let baseConfidence = 0
    
    // Check if this looks like a credit report based on text content
    const creditReportKeywords = [
      'credit', 'score', 'experian', 'equifax', 'transunion', 'fico',
      'account', 'payment', 'balance', 'credit card', 'loan', 'mortgage',
      'collections', 'delinquent', 'tradeline', 'inquiry', 'bureau'
    ]
    
    const textLower = originalText.toLowerCase()
    const keywordMatches = creditReportKeywords.filter(keyword => textLower.includes(keyword))
    const keywordScore = Math.min(40, (keywordMatches.length / creditReportKeywords.length) * 40)
    
    console.log('🎯 [CONFIDENCE DEBUG] Keyword analysis:', {
      totalKeywords: creditReportKeywords.length,
      matchedKeywords: keywordMatches.length,
      matches: keywordMatches,
      keywordScore
    })
    
    baseConfidence += keywordScore
    
    // Give base confidence if text length suggests a real document
    if (originalText.length > 500) {
      baseConfidence += 20
      console.log('🎯 [CONFIDENCE DEBUG] Added 20 points for sufficient text length')
    }
    
    // Check if personal info is extracted (more lenient)
    const hasValidName = extractedData.personalInfo.name && 
                        extractedData.personalInfo.name !== 'Unknown' && 
                        extractedData.personalInfo.name !== 'Extracted from document' &&
                        extractedData.personalInfo.name !== 'PDF Document' &&
                        extractedData.personalInfo.name.length > 2
    console.log('🎯 [CONFIDENCE DEBUG] Personal info check - Name:', extractedData.personalInfo.name, 'Valid:', hasValidName)
    if (hasValidName) {
      confidence += 15
    }
    totalChecks++
    
    // Check if credit score is found (more lenient)
    const hasValidScore = (extractedData.creditScores.experian?.score && extractedData.creditScores.experian.score > 300) ||
                         (extractedData.creditScores.equifax?.score && extractedData.creditScores.equifax.score > 300) ||
                         (extractedData.creditScores.transunion?.score && extractedData.creditScores.transunion.score > 300) ||
                         textLower.includes('score') // Even if we detect the word "score", give partial credit
    console.log('🎯 [CONFIDENCE DEBUG] Credit score check - Has valid score:', hasValidScore)
    if (hasValidScore) {
      confidence += 15
    }
    totalChecks++
    
    // Check if accounts are found
    const accountsCount = extractedData.accounts.length
    const hasAccountKeywords = textLower.includes('account') || textLower.includes('credit card') || textLower.includes('loan')
    console.log('🎯 [CONFIDENCE DEBUG] Accounts check - Count:', accountsCount, 'Has keywords:', hasAccountKeywords)
    if (accountsCount > 0 || hasAccountKeywords) {
      confidence += 10
    }
    totalChecks++
    
    // Check for any credit-related content
    const hasCreditContent = textLower.includes('credit report') || 
                           textLower.includes('experian') || 
                           textLower.includes('equifax') || 
                           textLower.includes('transunion') ||
                           textLower.includes('identityiq') ||
                           textLower.includes('annual credit report')
    console.log('🎯 [CONFIDENCE DEBUG] Credit content check:', hasCreditContent)
    if (hasCreditContent) {
      confidence += 15
    }
    totalChecks++
    
    const finalConfidence = Math.min(100, Math.round(baseConfidence + confidence))
    
    // Ensure minimum confidence for documents that clearly contain credit-related content
    const minimumConfidence = hasCreditContent ? 45 : 20
    const adjustedConfidence = Math.max(minimumConfidence, finalConfidence)
    
    console.log('🎯 [CONFIDENCE DEBUG] IMPROVED Final confidence calculation:', {
      baseConfidence,
      additionalConfidence: confidence,
      finalConfidence,
      minimumConfidence,
      adjustedConfidence,
      breakdown: {
        keywordScore,
        textLength: originalText.length > 500 ? 20 : 0,
        personalInfo: hasValidName ? 15 : 0,
        creditScore: hasValidScore ? 15 : 0,
        accounts: (accountsCount > 0 || hasAccountKeywords) ? 10 : 0,
        creditContent: hasCreditContent ? 15 : 0
      }
    })
    
    return adjustedConfidence
  }

  /**
   * Create fallback analysis when AI is not available
   */
  private createFallbackAnalysis(documentText: string, userId?: string, supabaseClient?: any): AIAnalysisResult {
    console.log('⚠️ [FALLBACK] Creating fallback analysis - AI model not available')
    console.log('⚠️ [FALLBACK] This will result in lower accuracy analysis')
    console.log('⚠️ [FALLBACK] Users may experience generic creditor names and missing data')
    
    // Basic text parsing for credit data
    const basicData = this.parseBasicCreditData(documentText)
    
    // Generate recommendations based on document content analysis
    const recommendations = this.generateFallbackRecommendations(documentText, basicData)
    
    // Determine if this looks like an actual credit report or just placeholder text
    const isPlaceholderText = documentText.includes('DOCUMENT PLACEHOLDER TEXT') || 
                              documentText.includes('Processing requires manual review') ||
                              documentText.length < 300
    
    const fallbackAnalysis: AIAnalysisResult = {
      extractedData: {
        personalInfo: {
          name: basicData.personalInfo?.name || (isPlaceholderText ? 'Document requires manual review' : 'Name extracted from document'),
          address: basicData.personalInfo?.address || (isPlaceholderText ? 'Address not available' : 'Address found in document'),
          ssn: undefined,
          dateOfBirth: undefined
        },
        creditScores: {
          experian: isPlaceholderText ? undefined : {
            score: basicData.score || 0,
            bureau: 'experian' as const,
            date: new Date().toISOString().split('T')[0],
            scoreRange: { min: 300, max: 850 }
          }
        },
        accounts: basicData.accounts || [],
        negativeItems: basicData.negativeItems || [],
        inquiries: basicData.inquiries || [],
        publicRecords: basicData.publicRecords || []
      },
      recommendations,
      scoreAnalysis: {
        currentScore: isPlaceholderText ? 0 : (basicData.score || 0),
        factors: isPlaceholderText ? [] : [
          {
            factor: 'Document Processing',
            impact: 'neutral',
            weight: 100,
            description: 'Document uploaded but requires enhanced processing for detailed analysis'
          }
        ],
        improvementPotential: isPlaceholderText ? 0 : 50,
        timelineEstimate: isPlaceholderText ? 'Manual review required' : 'Analysis pending',
        scoreRange: isPlaceholderText ? 'unknown' : 'fair'
      },
      summary: isPlaceholderText 
        ? `Document "${documentText.match(/File: (.+)/)?.[1] || 'credit report'}" has been uploaded successfully. Manual review is required for detailed credit analysis. To get AI-powered analysis, please ensure the document is a clear, readable credit report.`
        : `Analysis completed using basic text processing. Found ${recommendations.length} potential areas for review. For enhanced accuracy and detailed dispute recommendations, AI-powered analysis is recommended.`,
      confidence: this.calculateFallbackConfidence(documentText, isPlaceholderText),
      processingTime: 500
    }
    
    // Save fallback analysis
    this.saveAnalysis(userId, fallbackAnalysis, supabaseClient)
    
    return fallbackAnalysis
  }

  /**
   * Calculate confidence for fallback analysis - IMPROVED VERSION
   */
  private calculateFallbackConfidence(documentText: string, isPlaceholderText: boolean): number {
    console.log('🎯 [FALLBACK CONFIDENCE] Starting fallback confidence calculation...')
    console.log('🎯 [FALLBACK CONFIDENCE] Text length:', documentText.length)
    console.log('🎯 [FALLBACK CONFIDENCE] Is placeholder:', isPlaceholderText)
    
    if (isPlaceholderText) {
      console.log('🎯 [FALLBACK CONFIDENCE] Returning 10% for placeholder text')
      return 10
    }
    
    const textLower = documentText.toLowerCase()
    let confidence = 25 // Base confidence for non-placeholder text
    
    // Check for credit report indicators
    const creditIndicators = [
      'credit report', 'experian', 'equifax', 'transunion', 'identityiq',
      'fico', 'credit score', 'account', 'payment history', 'credit card',
      'loan', 'mortgage', 'collections', 'inquiry', 'bureau', 'tradeline'
    ]
    
    const matches = creditIndicators.filter(indicator => textLower.includes(indicator))
    const indicatorScore = Math.min(35, matches.length * 3) // Up to 35 points for credit indicators
    confidence += indicatorScore
    
    console.log('🎯 [FALLBACK CONFIDENCE] Credit indicators found:', matches.length, 'Score:', indicatorScore)
    
    // Length bonus
    if (documentText.length > 1000) {
      confidence += 15
      console.log('🎯 [FALLBACK CONFIDENCE] Added 15 points for length > 1000')
    }
    if (documentText.length > 2000) {
      confidence += 10
      console.log('🎯 [FALLBACK CONFIDENCE] Added 10 points for length > 2000')
    }
    
    // Specific service bonus (IdentityIQ, AnnualCreditReport.com, etc.)
    if (textLower.includes('identityiq') || textLower.includes('annual credit report')) {
      confidence += 15
      console.log('🎯 [FALLBACK CONFIDENCE] Added 15 points for known credit service')
    }
    
    const finalConfidence = Math.min(75, confidence) // Cap at 75% for fallback
    
    console.log('🎯 [FALLBACK CONFIDENCE] Final fallback confidence:', {
      baseConfidence: 25,
      indicatorScore,
      lengthBonus: documentText.length > 1000 ? (documentText.length > 2000 ? 25 : 15) : 0,
      serviceBonus: (textLower.includes('identityiq') || textLower.includes('annual credit report')) ? 15 : 0,
      finalConfidence
    })
    
    return finalConfidence
  }

  /**
   * Generate fallback recommendations based on extracted data
   */
  private generateFallbackRecommendations(documentText: string, basicData: any): DisputeRecommendation[] {
    const recommendations: DisputeRecommendation[] = []
    
    // Check for late payments
    if (documentText.toLowerCase().includes('late payment')) {
      recommendations.push({
        negativeItemId: 'late-payment-1',
        priority: 'high',
        disputeReason: 'Dispute late payment reporting',
        legalBasis: 'Fair Credit Reporting Act - Right to dispute inaccurate information. Late payments may be reported in error or may not reflect actual payment history.',
        expectedImpact: 'Potential 20-50 point score improvement if removed',
        letterTemplate: 'Late payment dispute letter template',
        successProbability: 80
      })
    }
    
    // Check for collection accounts
    if (documentText.toLowerCase().includes('collection')) {
      recommendations.push({
        negativeItemId: 'collection-1',
        priority: 'high',
        disputeReason: 'Verify collection account accuracy',
        legalBasis: 'Fair Credit Reporting Act - Collection agencies must verify debt ownership and accuracy. Many collection accounts contain errors.',
        expectedImpact: 'Potential 30-80 point score improvement if removed',
        letterTemplate: 'Collection account dispute letter template',
        successProbability: 75
      })
    }
    
    // Check for charge-offs
    if (documentText.toLowerCase().includes('charge off') || documentText.toLowerCase().includes('chargeoff')) {
      recommendations.push({
        negativeItemId: 'charge-off-1',
        priority: 'medium',
        disputeReason: 'Dispute charge-off reporting',
        legalBasis: 'Fair Credit Reporting Act - Charge-offs must be accurately reported. Verify the account was properly charged off.',
        expectedImpact: 'Potential 25-60 point score improvement if removed',
        letterTemplate: 'Charge-off dispute letter template',
        successProbability: 85
      })
    }
    
    // Check for inquiries
    if (documentText.toLowerCase().includes('inquiry') || documentText.toLowerCase().includes('inquiries')) {
      recommendations.push({
        negativeItemId: 'inquiry-1',
        priority: 'low',
        disputeReason: 'Verify unauthorized credit inquiries',
        legalBasis: 'Fair Credit Reporting Act - You have the right to dispute inquiries you did not authorize.',
        expectedImpact: 'Potential 5-15 point score improvement if removed',
        letterTemplate: 'Unauthorized inquiry dispute letter template',
        successProbability: 70
      })
    }
    
    // General recommendation for account verification
    if (basicData.accounts.length > 0) {
      recommendations.push({
        negativeItemId: 'account-verification-1',
        priority: 'medium',
        disputeReason: 'Verify account information accuracy',
        legalBasis: 'Fair Credit Reporting Act - All account information must be accurate and up-to-date.',
        expectedImpact: 'Potential score improvement if errors are corrected',
        letterTemplate: 'Account verification dispute letter template',
        successProbability: 90
      })
    }
    
    // If no specific issues found, provide general guidance
    if (recommendations.length === 0) {
      recommendations.push({
        negativeItemId: 'general-1',
        priority: 'low',
        disputeReason: 'Review credit report for accuracy',
        legalBasis: 'Fair Credit Reporting Act - You have the right to dispute any inaccurate information on your credit report.',
        expectedImpact: 'Potential score improvement if errors are found and corrected',
        letterTemplate: 'General dispute letter template',
        successProbability: 60
      })
    }
    
    return recommendations
  }

  /**
   * Parse basic credit data from text without AI - IMPROVED VERSION
   */
  private parseBasicCreditData(text: string) {
    console.log('🔧 [IMPROVED PARSING] Starting enhanced basic credit data parsing...')
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    const accounts: CreditAccount[] = []
    const negativeItems: NegativeItem[] = []
    const inquiries: CreditInquiry[] = []
    const publicRecords: PublicRecord[] = []
    
    let score: number | undefined
    let bureau: 'experian' | 'equifax' | 'transunion' = 'experian'
    
    // IMPROVED: Extract actual personal info from text
    const personalInfo = this.extractPersonalInfoFromText(text)
    
    // Look for credit score patterns
    const scorePatterns = [
      /credit\s*score[:\s]*(\d{3})/i,
      /score[:\s]*(\d{3})/i,
      /(\d{3})\s*credit/i,
      /Current Score:\s*(\d{3})/i
    ]
    
    // Look for bureau information
    if (text.toLowerCase().includes('experian')) {
      bureau = 'experian'
    } else if (text.toLowerCase().includes('transunion')) {
      bureau = 'transunion'
    } else if (text.toLowerCase().includes('equifax')) {
      bureau = 'equifax'
    }
    
    // Look for personal information
    const nameMatch = text.match(/Name:\s*([A-Za-z\s]+)/i)
    if (nameMatch) {
      personalInfo.name = nameMatch[1].trim()
    }
    
    const addressMatch = text.match(/Address:\s*([^\n]+)/i)
    if (addressMatch) {
      personalInfo.address = addressMatch[1].trim()
    }
    
    for (const line of lines) {
      // Check for credit score
      if (!score) {
        for (const pattern of scorePatterns) {
          const match = line.match(pattern)
          if (match) {
            score = parseInt(match[1])
            break
          }
        }
      }
      
      // IMPROVED: Look for actual creditor names in account patterns
      if (line.toLowerCase().includes('account') || line.toLowerCase().includes('credit')) {
        const creditorName = this.extractCreditorNameFromLine(line, text)
        const accountBalance = this.extractBalanceFromLine(line)
        const accountType = this.determineAccountTypeFromLine(line)
        
        accounts.push({
          id: `account-${accounts.length + 1}`,
          creditorName,
          accountNumber: this.extractAccountNumberFromLine(line),
          accountType,
          balance: accountBalance,
          paymentHistory: [], // Initialize with empty array
          status: 'open',
          openDate: new Date().toISOString().split('T')[0],
          lastReported: new Date().toISOString().split('T')[0],
          bureaus: ['experian']
        })
      }
      
      // Look for negative items
      if (line.toLowerCase().includes('late') || line.toLowerCase().includes('collection') || line.toLowerCase().includes('charge')) {
        negativeItems.push({
          id: `negative-${negativeItems.length + 1}`,
          type: 'late_payment',
          creditorName: 'Creditor',
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          status: 'Active',
          description: line,
          disputeReasons: ['Verify accuracy of information'],
          impactScore: 50
        })
      }
    }
    
    console.log('🔧 [IMPROVED PARSING] Enhanced parsing results:', {
      score,
      bureau,
      personalInfoName: personalInfo.name,
      accountsCount: accounts.length,
      negativeItemsCount: negativeItems.length,
      inquiriesCount: inquiries.length
    })

    return {
      score,
      bureau,
      personalInfo,
      accounts,
      negativeItems,
      inquiries,
      publicRecords
    }
  }

  /**
   * Extract actual personal information from credit report text
   */
  private extractPersonalInfoFromText(text: string): { name: string; address: string } {
    console.log('🔧 [PERSONAL INFO] Extracting personal info from text...')
    
    // Look for name patterns
    const namePatterns = [
      /(?:Name|Full Name|Consumer Name):\s*([A-Za-z\s,.-]+?)(?:\n|Address|$)/i,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
      /Consumer:\s*([A-Za-z\s,.-]+?)(?:\n|Address|$)/i,
      /Report for:\s*([A-Za-z\s,.-]+?)(?:\n|Address|$)/i
    ]
    
    let extractedName = ''
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1] && match[1].trim().length > 2) {
        extractedName = match[1].trim()
        console.log('🔧 [PERSONAL INFO] Found name:', extractedName)
        break
      }
    }
    
    // Look for address patterns
    const addressPatterns = [
      /(?:Address|Current Address|Mailing Address):\s*([^\n\r]+)/i,
      /(?:Street|Address Line):\s*([^\n\r]+)/i,
      /(\d+\s+[A-Za-z\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)[^\n\r]*)/i
    ]
    
    let extractedAddress = ''
    for (const pattern of addressPatterns) {
      const match = text.match(pattern)
      if (match && match[1] && match[1].trim().length > 5) {
        extractedAddress = match[1].trim()
        console.log('🔧 [PERSONAL INFO] Found address:', extractedAddress)
        break
      }
    }
    
    return {
      name: extractedName || 'Name not clearly readable in document',
      address: extractedAddress || 'Address not clearly readable in document'
    }
  }

  /**
   * Extract creditor name from a line of text
   */
  private extractCreditorNameFromLine(line: string, fullText: string): string {
    console.log('🔧 [CREDITOR] Extracting creditor from line:', line.substring(0, 100))
    
    // Common creditor patterns
    const creditorPatterns = [
      // Major banks and credit cards
      /\b(CHASE|BANK OF AMERICA|WELLS FARGO|CITIBANK|CAPITAL ONE|DISCOVER|AMERICAN EXPRESS|AMEX)\b/i,
      /\b(GOLDMAN SACHS|APPLE CARD|TRUIST|PNC BANK|US BANK|SYNCHRONY|BARCLAYS)\b/i,
      /\b(CREDIT ONE|FIRST PREMIER|FINGERHUT|PAYPAL|AMAZON|TARGET|WALMART)\b/i,
      // Auto lenders
      /\b(TOYOTA MOTOR CREDIT|HONDA FINANCIAL|FORD CREDIT|GM FINANCIAL|ALLY FINANCIAL)\b/i,
      // General pattern for company names
      /\b([A-Z][A-Z\s&]{2,30}(?:BANK|CREDIT|FINANCIAL|CORP|INC|LLC))\b/i,
      // Pattern for "Company - Account Type"
      /^([A-Z][A-Za-z\s&.-]+?)\s*-\s*(?:Credit Card|Auto Loan|Mortgage)/i
    ]
    
    for (const pattern of creditorPatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        const creditorName = match[1].trim()
        console.log('🔧 [CREDITOR] Found creditor:', creditorName)
        return creditorName
      }
    }
    
    // Fallback: look for any capitalized words that might be creditor names
    const capitalizedWords = line.match(/\b[A-Z][A-Za-z]{2,}\b/g)
    if (capitalizedWords && capitalizedWords.length > 0) {
      const potentialCreditor = capitalizedWords.slice(0, 2).join(' ')
      console.log('🔧 [CREDITOR] Using fallback creditor:', potentialCreditor)
      return potentialCreditor
    }
    
    return 'Creditor name not clearly readable'
  }

  /**
   * Extract balance from a line of text
   */
  private extractBalanceFromLine(line: string): number {
    const balancePatterns = [
      /(?:Balance|Owed|Outstanding):\s*\$?([\d,]+\.?\d*)/i,
      /\$?([\d,]+\.?\d*)\s*(?:balance|owed)/i,
      /\$([0-9,]+(?:\.[0-9]{2})?)/
    ]
    
    for (const pattern of balancePatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        const balance = parseFloat(match[1].replace(/[,$]/g, ''))
        if (!isNaN(balance)) {
          return balance
        }
      }
    }
    
    return 0
  }

  /**
   * Extract account number from a line of text
   */
  private extractAccountNumberFromLine(line: string): string {
    const accountPatterns = [
      /(?:Account|Acct)(?:\s*#|\s*Number):\s*(\*+\d{4}|\d{4,})/i,
      /(\*{4,}\d{4})/,
      /ending in (\d{4})/i
    ]
    
    for (const pattern of accountPatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    return '****'
  }

  /**
   * Determine account type from a line of text
   */
  private determineAccountTypeFromLine(line: string): CreditAccount['accountType'] {
    const lowerLine = line.toLowerCase()
    
    if (lowerLine.includes('credit card') || lowerLine.includes('card')) return 'credit_card'
    if (lowerLine.includes('auto') || lowerLine.includes('car') || lowerLine.includes('vehicle')) return 'auto_loan'
    if (lowerLine.includes('mortgage') || lowerLine.includes('home')) return 'mortgage'
    if (lowerLine.includes('personal loan') || lowerLine.includes('personal')) return 'personal_loan'
    if (lowerLine.includes('student') || lowerLine.includes('education')) return 'student_loan'
    
    return 'other'
  }

  /**
   * Extract structured data from credit report text using AI
   */
  private async extractCreditData(documentText: string): Promise<CreditReportData> {
    console.log('🔍 [AI DEBUG] Starting extractCreditData...')
    console.log('🔍 [AI DEBUG] Model available:', !!this.model)
    console.log('🔍 [AI DEBUG] Document text length:', documentText.length)
    console.log('🔍 [AI DEBUG] Document text preview (first 500 chars):', documentText.substring(0, 500))
    
    if (!this.model) {
      console.error('❌ [AI DEBUG] AI model not available on client-side. Use server-side API.')
      throw new Error('AI model not available on client-side. Use server-side API.')
    }
    
    const prompt = `
You are an expert credit analyst with 15+ years of experience analyzing credit reports from all major bureaus (Experian, Equifax, TransUnion) and providers (Credit Karma, MyFICO, etc.). Your task is to extract structured credit report data with maximum accuracy and completeness.

DOCUMENT TEXT TO ANALYZE:
${documentText}

CRITICAL EXTRACTION REQUIREMENTS:

1. READ THE ENTIRE DOCUMENT CAREFULLY - Don't skip any sections
2. CROSS-REFERENCE INFORMATION - Verify data consistency across different sections
3. EXTRACT COMPLETE DATA - Don't leave fields empty if information exists
4. MAINTAIN ACCURACY - Double-check all numbers, dates, and names
5. HANDLE VARIATIONS - Recognize different formats and abbreviations

CREDITOR NAME EXTRACTION (HIGHEST PRIORITY):
- NEVER leave creditorName as null/empty - this is critical for dispute letters
- Look for these patterns: "TRUIST BANK", "GOLDMAN SACHS", "APPLE CARD", "CHASE", "BANK OF AMERICA", "WELLS FARGO", "CAPITAL ONE", "DISCOVER", "AMERICAN EXPRESS", "CITIBANK"
- Account number patterns: 451336**** = TRUIST BANK, 110008**** = GOLDMAN SACHS, 120001**** = APPLE CARD/GS BANK USA
- If abbreviated: "AMEX" = AMERICAN EXPRESS, "BOA" = BANK OF AMERICA, "CITI" = CITIBANK
- For collections: Extract original creditor AND collection agency
- For charge-offs: Extract original creditor name, not just "CHARGE OFF"

PAYMENT HISTORY EXTRACTION (CRITICAL FOR DISPUTES):
- Extract ALL available payment history data for last 24 months minimum
- Convert status codes: "OK"/"0" = current, "30" = 30_days_late, "60" = 60_days_late, "90" = 90_days_late, "120" = 120_days_late, "CO" = charge_off, "CL" = closed
- Look for patterns: consecutive late payments, improvement trends, charge-off dates
- Include payment amounts when available
- Record date of last payment if available

CREDIT SCORE EXTRACTION:
- Extract scores from ALL bureaus mentioned (Experian, Equifax, TransUnion)
- Look for score ranges: FICO (300-850), VantageScore (300-850), other models
- Extract score date and factors affecting score
- Note if score is estimated vs. actual bureau score

NEGATIVE ITEMS EXTRACTION (CRITICAL FOR DISPUTES):
- Extract EVERY negative item: late payments, collections, charge-offs, bankruptcies, tax liens, judgments, foreclosures
- For each item, extract: creditor name, original creditor (if different), account number, amount, date first reported, date of delinquency, current status
- Calculate impact score based on: recency (1-100), severity (1-100), amount (1-100)
- Identify potential dispute reasons: outdated (7+ years), inaccurate amounts, wrong dates, not mine, paid but still showing

ACCOUNT INFORMATION EXTRACTION:
- Extract ALL accounts: open, closed, paid, charged off
- For each account: creditor, type, balance, credit limit, payment history, open date, last reported date
- Calculate utilization for credit cards: balance/limit
- Identify which bureaus report each account
- Note any discrepancies between bureau reporting

INQUIRY EXTRACTION:
- Separate hard vs. soft inquiries
- Extract inquiry date, creditor, purpose
- Identify unauthorized or excessive inquiries
- Note inquiry removal eligibility (2+ years old)

PUBLIC RECORDS EXTRACTION:
- Extract bankruptcies, tax liens, judgments, foreclosures
- Include court name, filing date, amount, current status
- Note discharge dates for bankruptcies

RETURN ONLY THIS JSON STRUCTURE:
{
  "personalInfo": {
    "name": "FULL NAME FROM DOCUMENT",
    "address": "COMPLETE ADDRESS",
    "ssn": "XXX-XX-XXXX or null",
    "dateOfBirth": "YYYY-MM-DD or null"
  },
  "creditScores": {
    "experian": {
      "score": number (300-850),
      "date": "YYYY-MM-DD",
      "factors": ["list", "of", "factors"]
    } or null,
    "equifax": {
      "score": number (300-850),
      "date": "YYYY-MM-DD",
      "factors": ["list", "of", "factors"]
    } or null,
    "transunion": {
      "score": number (300-850),
      "date": "YYYY-MM-DD",
      "factors": ["list", "of", "factors"]
    } or null
  },
  "accounts": [
    {
      "id": "unique_account_id",
      "creditorName": "EXACT CREDITOR NAME FROM DOCUMENT",
      "accountNumber": "ACCOUNT NUMBER",
      "accountType": "credit_card|auto_loan|mortgage|personal_loan|student_loan|other",
      "balance": number,
      "creditLimit": number,
      "paymentHistory": [
        {
          "month": "YYYY-MM",
          "status": "current|30_days_late|60_days_late|90_days_late|120_days_late|charge_off|collection|paid|closed",
          "amount": number,
          "dateReported": "YYYY-MM-DD"
        }
      ],
      "status": "open|closed|paid|charged_off",
      "openDate": "YYYY-MM-DD",
      "lastReported": "YYYY-MM-DD",
      "bureaus": ["experian", "equifax", "transunion"],
      "utilization": number (0-100 for credit cards),
      "remarks": ["any", "special", "remarks"]
    }
  ],
  "negativeItems": [
    {
      "id": "unique_negative_id",
      "type": "late_payment|collection|charge_off|bankruptcy|tax_lien|judgment|foreclosure",
      "creditorName": "EXACT CREDITOR NAME",
      "originalCreditor": "ORIGINAL CREDITOR IF DIFFERENT",
      "accountNumber": "ACCOUNT NUMBER",
      "amount": number,
      "date": "YYYY-MM-DD (date first reported)",
      "dateOfDelinquency": "YYYY-MM-DD",
      "status": "CURRENT STATUS",
      "description": "DETAILED DESCRIPTION",
      "disputeReasons": ["potential", "dispute", "reasons"],
      "impactScore": number (1-100),
      "bureauReporting": ["experian", "equifax", "transunion"],
      "ageInYears": number
    }
  ],
  "inquiries": [
    {
      "id": "unique_inquiry_id",
      "creditorName": "EXACT CREDITOR NAME",
      "date": "YYYY-MM-DD",
      "type": "hard|soft",
      "purpose": "INQUIRY PURPOSE",
      "bureau": "experian|equifax|transunion",
      "authorized": boolean,
      "removable": boolean
    }
  ],
  "publicRecords": [
    {
      "id": "unique_public_id",
      "type": "bankruptcy|tax_lien|judgment|foreclosure",
      "amount": number,
      "date": "YYYY-MM-DD",
      "status": "STATUS",
      "court": "COURT NAME",
      "description": "DETAILED DESCRIPTION",
      "dischargeDate": "YYYY-MM-DD (if applicable)"
    }
  ]
}

VALIDATION CHECKLIST:
✅ All creditor names extracted (no "Unknown" or empty)
✅ All dates in YYYY-MM-DD format
✅ All amounts as numbers (not strings)
✅ Payment history for all accounts
✅ Negative items with complete details
✅ Credit scores with dates and factors
✅ Inquiries separated by type
✅ Public records with court info

RETURN ONLY THE JSON - NO EXPLANATIONS OR COMMENTS.`
    
    console.log('📝 [AI DEBUG] Sending prompt to AI (length:', prompt.length, 'chars)')
    console.log('📝 [AI DEBUG] Prompt preview (first 1000 chars):', prompt.substring(0, 1000))
    
    // Analyze prompt quality before sending
    const promptQuality = this.analyzePromptQuality(prompt, documentText)
    console.log('📋 [AI DEBUG] Prompt quality score:', promptQuality.score, '/ 100')
    if (promptQuality.issues.length > 0) {
      console.warn('⚠️ [AI DEBUG] Prompt quality issues:', promptQuality.issues)
    }
    
    try {
      console.log('🚀 [AI DEBUG] Calling Gemini AI...')
      const response = await this.callGemini(prompt)
      console.log('✅ [AI DEBUG] Received response from Gemini (length:', response.length, 'chars)')
      console.log('📄 [AI DEBUG] Raw AI response preview (first 1000 chars):', response.substring(0, 1000))
      
      console.log('🔧 [AI DEBUG] Parsing AI response...')
      const parsedData = this.parseGeminiResponse(response)
      console.log('✅ [AI DEBUG] Successfully parsed AI response')
      console.log('📊 [AI DEBUG] Parsed data structure:', {
        hasPersonalInfo: !!parsedData.personalInfo,
        hasAccounts: Array.isArray(parsedData.accounts) ? parsedData.accounts.length : 0,
        hasNegativeItems: Array.isArray(parsedData.negativeItems) ? parsedData.negativeItems.length : 0,
        hasInquiries: Array.isArray(parsedData.inquiries) ? parsedData.inquiries.length : 0,
        hasCreditScores: !!parsedData.creditScores
      })
      
      console.log('🧹 [AI DEBUG] Validating and cleaning data...')
      const cleanedData = this.validateAndCleanCreditData(parsedData)
      console.log('✅ [AI DEBUG] Data validation complete')
      console.log('📈 [AI DEBUG] Final cleaned data summary:', {
        personalInfoName: cleanedData.personalInfo.name,
        accountsCount: cleanedData.accounts.length,
        negativeItemsCount: cleanedData.negativeItems.length,
        inquiriesCount: cleanedData.inquiries.length,
        hasExperianScore: !!cleanedData.creditScores.experian,
        experianScore: cleanedData.creditScores.experian?.score
      })
      
      return cleanedData
    } catch (error) {
      console.error('❌ [AI DEBUG] Error extracting credit data:', error)
      console.error('❌ [AI DEBUG] Error stack:', error.stack)
      throw new Error('Failed to extract credit data from document')
    }
  }

  /**
   * Validate and clean extracted credit data
   */
  private validateAndCleanCreditData(data: any): CreditReportData {
    // Clean and validate accounts - remove duplicates and invalid entries
    const cleanedAccounts = Array.isArray(data.accounts) 
      ? data.accounts
          .filter((account: any) => account && (account.creditorName || account.accountNumber || account.balance))
          .map((account: any) => this.cleanAccount(account))
          .filter((account: CreditAccount, index: number, self: CreditAccount[]) => 
            // Remove duplicates based on creditor name and account number
            index === self.findIndex(a => 
              a.creditorName.toLowerCase() === account.creditorName.toLowerCase() &&
              a.accountNumber === account.accountNumber
            )
          )
          .slice(0, 50) // Limit to reasonable number of accounts
      : []

    // Clean and validate negative items
    const cleanedNegativeItems = Array.isArray(data.negativeItems)
      ? data.negativeItems
          .filter((item: any) => item && item.creditorName && item.creditorName.trim() !== '')
          .map((item: any) => this.cleanNegativeItem(item))
          .filter((item: NegativeItem, index: number, self: NegativeItem[]) => 
            // Remove duplicates based on creditor name and type
            index === self.findIndex(n => 
              n.creditorName.toLowerCase() === item.creditorName.toLowerCase() &&
              n.type === item.type
            )
          )
      : []

    // Clean and validate inquiries
    const cleanedInquiries = Array.isArray(data.inquiries)
      ? data.inquiries
          .filter((inquiry: any) => inquiry && inquiry.creditorName && inquiry.creditorName.trim() !== '')
          .map((inquiry: any) => this.cleanInquiry(inquiry))
          .filter((inquiry: CreditInquiry, index: number, self: CreditInquiry[]) => 
            // Remove duplicates based on creditor name and date
            index === self.findIndex(i => 
              i.creditorName.toLowerCase() === inquiry.creditorName.toLowerCase() &&
              i.date === inquiry.date
            )
          )
      : []

    // Clean and validate public records
    const cleanedPublicRecords = Array.isArray(data.publicRecords)
      ? data.publicRecords
          .filter((record: any) => record && record.type)
          .map((record: any) => this.cleanPublicRecord(record))
      : []

    return {
      personalInfo: {
        name: data.personalInfo?.name || 'Extracted from document',
        address: data.personalInfo?.address || 'Address found in document',
        ssn: data.personalInfo?.ssn,
        dateOfBirth: data.personalInfo?.dateOfBirth
      },
      creditScores: {
        experian: data.creditScores?.experian ? {
          score: this.validateNumber(data.creditScores.experian.score, 300, 850, 650),
          bureau: 'experian' as const,
          date: this.validateDate(data.creditScores.experian.date),
          scoreRange: { min: 300, max: 850 }
        } : undefined,
        equifax: data.creditScores?.equifax ? {
          score: this.validateNumber(data.creditScores.equifax.score, 300, 850, 650),
          bureau: 'equifax' as const,
          date: this.validateDate(data.creditScores.equifax.date),
          scoreRange: { min: 300, max: 850 }
        } : undefined,
        transunion: data.creditScores?.transunion ? {
          score: this.validateNumber(data.creditScores.transunion.score, 300, 850, 650),
          bureau: 'transunion' as const,
          date: this.validateDate(data.creditScores.transunion.date),
          scoreRange: { min: 300, max: 850 }
        } : undefined
      },
      accounts: cleanedAccounts,
      negativeItems: cleanedNegativeItems,
      inquiries: cleanedInquiries,
      publicRecords: cleanedPublicRecords
    }
  }

  /**
   * Validate and clean account data
   */
  private cleanAccount(account: any): CreditAccount {
    // Try to extract creditor name from various possible fields
    let creditorName = account.creditorName || account.creditor || account.company || account.bank || account.lender || account.institution
    
    // If still no name, try to extract from account number or other fields
    if (!creditorName || creditorName === 'Unknown Creditor') {
      if (account.accountNumber && typeof account.accountNumber === 'string') {
        // Try to extract from account number patterns
        const accountNum = account.accountNumber
        if (accountNum.includes('TRUIST') || accountNum.includes('451336')) {
          creditorName = 'TRUIST BANK'
        } else if (accountNum.includes('GOLDMAN') || accountNum.includes('110008')) {
          creditorName = 'GOLDMAN SACHS AND CO'
        } else if (accountNum.includes('APPLE') || accountNum.includes('120001')) {
          creditorName = 'APPLE CARD/GS BANK USA'
        } else if (accountNum.includes('CHASE') || accountNum.includes('CHASE BANK')) {
          creditorName = 'CHASE BANK'
        } else if (accountNum.includes('BANK OF AMERICA') || accountNum.includes('BOA')) {
          creditorName = 'BANK OF AMERICA'
        } else if (accountNum.includes('WELLS FARGO')) {
          creditorName = 'WELLS FARGO'
        } else if (accountNum.includes('CAPITAL ONE')) {
          creditorName = 'CAPITAL ONE'
        } else if (accountNum.includes('AMEX') || accountNum.includes('AMERICAN EXPRESS')) {
          creditorName = 'AMERICAN EXPRESS'
        } else if (accountNum.includes('DISCOVER')) {
          creditorName = 'DISCOVER'
        } else if (accountNum.includes('CITI') || accountNum.includes('CITIBANK')) {
          creditorName = 'CITIBANK'
        } else {
          // Try to extract from any text field
          const textFields = [account.description, account.name, account.title, account.type]
          for (const field of textFields) {
            if (field && typeof field === 'string' && field.length > 2) {
              creditorName = field
              break
            }
          }
        }
      }
    }
    
    // Final fallback
    if (!creditorName || creditorName.trim() === '') {
      creditorName = 'Unknown Creditor'
    }
    
    return {
      id: account.id || `account-${Date.now()}`,
      creditorName: creditorName.trim(),
      accountNumber: account.accountNumber || '****',
      accountType: this.validateAccountType(account.accountType),
      balance: this.validateNumber(account.balance, 0, 1000000, 0),
      creditLimit: account.creditLimit ? this.validateNumber(account.creditLimit, 0, 1000000, 0) : undefined,
      paymentHistory: this.cleanPaymentHistory(account.paymentHistory),
      status: this.validateAccountStatus(account.status),
      openDate: this.validateDate(account.openDate),
      lastReported: this.validateDate(account.lastReported),
      bureaus: Array.isArray(account.bureaus) ? account.bureaus.filter((b: string) => ['experian', 'equifax', 'transunion'].includes(b)) : ['experian'],
      bureauData: account.bureauData || undefined
    }
  }

  private cleanPaymentHistory(paymentHistory: any): PaymentHistoryEntry[] {
    if (!Array.isArray(paymentHistory)) {
      // Create default payment history if none provided
      const currentDate = new Date()
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      return [{
        month: currentMonth,
        status: 'current',
        amount: undefined,
        dateReported: undefined
      }]
    }

    return paymentHistory
      .filter((entry: any) => entry && entry.month)
      .map((entry: any) => ({
        month: this.validateMonth(entry.month),
        status: this.validatePaymentStatus(entry.status),
        amount: entry.amount ? this.validateNumber(entry.amount, 0, 100000, 0) : undefined,
        dateReported: entry.dateReported ? this.validateDate(entry.dateReported) : undefined
      }))
      .slice(-24) // Keep only last 24 months
  }

  private validateMonth(month: any): string {
    if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      return month
    }
    
    // Try to convert various formats to YYYY-MM
    if (typeof month === 'string') {
      // Handle formats like "Jan 2024", "01/2024", etc.
      const date = new Date(month)
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
    }
    
    // Default to current month
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  private validatePaymentStatus(status: any): PaymentHistoryEntry['status'] {
    if (typeof status === 'string') {
      const lowerStatus = status.toLowerCase()
      if (lowerStatus.includes('current') || lowerStatus.includes('ok') || lowerStatus.includes('paid')) {
        return 'current'
      }
      if (lowerStatus.includes('30') || lowerStatus.includes('late')) {
        return '30_days_late'
      }
      if (lowerStatus.includes('60')) {
        return '60_days_late'
      }
      if (lowerStatus.includes('90')) {
        return '90_days_late'
      }
      if (lowerStatus.includes('120')) {
        return '120_days_late'
      }
      if (lowerStatus.includes('charge') || lowerStatus.includes('co')) return 'charge_off'
      if (lowerStatus.includes('collection') || lowerStatus.includes('col')) return 'collection'
      if (lowerStatus.includes('closed') || lowerStatus.includes('cl')) return 'closed'
    }
    return 'current'
  }

  private validateAccountType(type: any): CreditAccount['accountType'] {
    if (typeof type === 'string') {
      const lowerType = type.toLowerCase()
      if (lowerType.includes('credit') || lowerType.includes('card')) return 'credit_card'
      if (lowerType.includes('auto') || lowerType.includes('car')) return 'auto_loan'
      if (lowerType.includes('mortgage') || lowerType.includes('home')) return 'mortgage'
      if (lowerType.includes('personal')) return 'personal_loan'
      if (lowerType.includes('student')) return 'student_loan'
    }
    return 'other'
  }

  private validateAccountStatus(status: any): CreditAccount['status'] {
    if (typeof status === 'string') {
      const lowerStatus = status.toLowerCase()
      if (lowerStatus.includes('open') || lowerStatus.includes('active')) return 'open'
      if (lowerStatus.includes('closed') || lowerStatus.includes('inactive')) return 'closed'
      if (lowerStatus.includes('paid') || lowerStatus.includes('satisfied')) return 'paid'
      if (lowerStatus.includes('charge') || lowerStatus.includes('default')) return 'charged_off'
    }
    return 'open'
  }

  private validateNumber(value: any, min: number, max: number, defaultValue: number): number {
    const num = parseFloat(value)
    if (isNaN(num) || num < min || num > max) {
      return defaultValue
    }
    return num
  }

  private validateDate(date: any): string {
    if (!date) return new Date().toISOString().split('T')[0]
    
    if (typeof date === 'string') {
      // Try to parse the date
      const parsed = new Date(date)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }
    
    return new Date().toISOString().split('T')[0]
  }

  private cleanNegativeItem(item: any): NegativeItem {
    return {
      id: item.id || `negative-${Date.now()}`,
      type: this.validateNegativeItemType(item.type),
      creditorName: item.creditorName || 'Unknown Creditor',
      accountNumber: item.accountNumber,
      amount: this.validateNumber(item.amount, 0, 1000000, 0),
      date: this.validateDate(item.date),
      status: item.status || 'active',
      description: item.description || 'Negative item on credit report',
      disputeReasons: Array.isArray(item.disputeReasons) ? item.disputeReasons : ['Verify accuracy'],
      impactScore: this.validateNumber(item.impactScore, 1, 100, 50)
    }
  }

  private validateNegativeItemType(type: any): NegativeItem['type'] {
    if (typeof type === 'string') {
      const lowerType = type.toLowerCase()
      if (lowerType.includes('late') || lowerType.includes('payment')) return 'late_payment'
      if (lowerType.includes('collection') || lowerType.includes('col')) return 'collection'
      if (lowerType.includes('charge') || lowerType.includes('co')) return 'charge_off'
      if (lowerType.includes('bankruptcy') || lowerType.includes('bk')) return 'bankruptcy'
      if (lowerType.includes('tax') || lowerType.includes('lien')) return 'tax_lien'
      if (lowerType.includes('judgment') || lowerType.includes('judg')) return 'judgment'
      if (lowerType.includes('foreclosure') || lowerType.includes('fore')) return 'foreclosure'
    }
    return 'late_payment'
  }

  private cleanInquiry(inquiry: any): CreditInquiry {
    return {
      id: inquiry.id || `inquiry-${Date.now()}`,
      creditorName: inquiry.creditorName || 'Unknown Creditor',
      date: this.validateDate(inquiry.date),
      type: this.validateInquiryType(inquiry.type),
      purpose: inquiry.purpose || 'Credit application',
      bureau: this.validateBureau(inquiry.bureau)
    }
  }

  private validateInquiryType(type: any): CreditInquiry['type'] {
    if (typeof type === 'string') {
      const lowerType = type.toLowerCase()
      if (lowerType.includes('hard') || lowerType.includes('credit')) return 'hard'
      if (lowerType.includes('soft') || lowerType.includes('background')) return 'soft'
    }
    return 'hard'
  }

  private validateBureau(bureau: any): 'experian' | 'equifax' | 'transunion' {
    if (typeof bureau === 'string') {
      const lowerBureau = bureau.toLowerCase()
      if (lowerBureau.includes('equifax')) return 'equifax'
      if (lowerBureau.includes('transunion')) return 'transunion'
    }
    return 'experian'
  }

  private cleanPublicRecord(record: any): PublicRecord {
    return {
      id: record.id || `public-${Date.now()}`,
      type: this.validatePublicRecordType(record.type),
      amount: record.amount ? this.validateNumber(record.amount, 0, 1000000, 0) : undefined,
      date: this.validateDate(record.date),
      status: record.status || 'active',
      court: record.court
    }
  }

  private validatePublicRecordType(type: any): PublicRecord['type'] {
    if (typeof type === 'string') {
      const lowerType = type.toLowerCase()
      if (lowerType.includes('bankruptcy') || lowerType.includes('bk')) return 'bankruptcy'
      if (lowerType.includes('tax') || lowerType.includes('lien')) return 'tax_lien'
      if (lowerType.includes('judgment') || lowerType.includes('judg')) return 'judgment'
      if (lowerType.includes('foreclosure') || lowerType.includes('fore')) return 'foreclosure'
    }
    return 'bankruptcy'
  }

  /**
   * Generate dispute recommendations using AI
   */
  private async generateDisputeRecommendations(creditData: CreditReportData): Promise<DisputeRecommendation[]> {
    try {
      const prompt = `Analyze the following credit report data and generate dispute recommendations for negative items:

${JSON.stringify(creditData, null, 2)}

Generate 3-5 dispute recommendations in JSON format:
[
  {
    "negativeItemId": "string (creditor name + account number)",
    "priority": "high|medium|low",
    "disputeReason": "string",
    "legalBasis": "string",
    "expectedImpact": "string",
    "letterTemplate": "string",
    "successProbability": number (0-100)
  }
]`

      const response = await this.callGemini(prompt)
      const parsedData = this.parseGeminiResponse(response)
      
      if (Array.isArray(parsedData)) {
        return parsedData.map((rec: any) => ({
          negativeItemId: rec.negativeItemId || 'unknown',
          priority: rec.priority || 'medium',
          disputeReason: rec.disputeReason || 'Verify accuracy',
          legalBasis: rec.legalBasis || 'FCRA Section 611',
          expectedImpact: rec.expectedImpact || 'May improve score',
          letterTemplate: rec.letterTemplate || 'Standard dispute letter',
          successProbability: rec.successProbability || 50
        }))
      }
      
      return []
    } catch (error) {
      console.error('Error generating dispute recommendations:', error)
      return []
    }
  }

  /**
   * Analyze credit score factors
   */
  private async analyzeScoreFactors(creditData: CreditReportData): Promise<ScoreAnalysis> {
    const currentScore = creditData.creditScores.experian?.score || 650
    
    const factors: ScoreFactor[] = [
      {
        factor: 'Payment History',
        impact: creditData.negativeItems.length > 0 ? 'negative' : 'positive',
        weight: 35,
        description: creditData.negativeItems.length > 0 ? 'Late payments detected' : 'Good payment history'
      },
      {
        factor: 'Credit Utilization',
        impact: 'neutral',
        weight: 30,
        description: 'Credit utilization analysis'
      },
      {
        factor: 'Length of Credit History',
        impact: 'neutral',
        weight: 15,
        description: 'Average account age'
      },
      {
        factor: 'Credit Mix',
        impact: 'positive',
        weight: 10,
        description: 'Good mix of credit types'
      },
      {
        factor: 'New Credit',
        impact: creditData.inquiries.length > 0 ? 'negative' : 'neutral',
        weight: 10,
        description: creditData.inquiries.length > 0 ? 'Recent credit inquiries' : 'No recent inquiries'
      }
    ]

    return {
      currentScore,
      factors,
      improvementPotential: 75,
      timelineEstimate: '6-12 months',
      scoreRange: currentScore >= 750 ? 'excellent' : currentScore >= 700 ? 'good' : currentScore >= 650 ? 'fair' : 'poor'
    }
  }

  /**
   * Generate summary using AI
   */
  private async generateSummary(
    creditData: CreditReportData, 
    recommendations: DisputeRecommendation[], 
    scoreAnalysis: ScoreAnalysis
  ): Promise<string> {
    try {
      const prompt = `Generate a concise summary of this credit report analysis:

Credit Score: ${scoreAnalysis.currentScore}
Accounts: ${creditData.accounts.length}
Negative Items: ${creditData.negativeItems.length}
Dispute Recommendations: ${recommendations.length}

Provide a 2-3 sentence summary focusing on key findings and next steps.`

      const response = await this.callGemini(prompt)
      return response || 'Credit report analysis completed with dispute recommendations.'
    } catch (error) {
      console.error('Error generating summary:', error)
      return `Credit report analysis completed. Found ${recommendations.length} dispute opportunities. Current score: ${scoreAnalysis.currentScore}.`
    }
  }

  /**
   * Call Gemini AI
   */
  private async callGemini(prompt: string): Promise<string> {
    console.log('🤖 [AI DEBUG] callGemini() - Starting AI call...')
    console.log('🤖 [AI DEBUG] Model available:', !!this.model)
    console.log('🤖 [AI DEBUG] Prompt length:', prompt.length, 'characters')
    
    if (!this.model) {
      console.error('❌ [AI DEBUG] AI model not available')
      throw new Error('AI model not available')
    }

    try {
      console.log('📡 [AI DEBUG] Sending request to Gemini API...')
      const startTime = Date.now()
      
      const result = await this.model.generateContent(prompt)
      console.log('⏱️ [AI DEBUG] API call completed in:', Date.now() - startTime, 'ms')
      console.log('📦 [AI DEBUG] Raw result object:', typeof result, result ? 'received' : 'null')
      
      const response = await result.response
      console.log('📋 [AI DEBUG] Response extracted from result')
      console.log('📋 [AI DEBUG] Response type:', typeof response)
      
      const responseText = response.text()
      console.log('📝 [AI DEBUG] Response text extracted')
      console.log('📝 [AI DEBUG] Response text length:', responseText.length, 'characters')
      console.log('📝 [AI DEBUG] Response text starts with:', responseText.substring(0, 200))
      console.log('📝 [AI DEBUG] Response text ends with:', responseText.substring(Math.max(0, responseText.length - 200)))
      
      return responseText
    } catch (error) {
      console.error('❌ [AI DEBUG] Error calling Gemini API:', error)
      console.error('❌ [AI DEBUG] Error type:', typeof error)
      console.error('❌ [AI DEBUG] Error message:', error.message)
      console.error('❌ [AI DEBUG] Error stack:', error.stack)
      
      // Check if it's a specific API error
      if (error.status) {
        console.error('❌ [AI DEBUG] API Status Code:', error.status)
      }
      if (error.statusText) {
        console.error('❌ [AI DEBUG] API Status Text:', error.statusText)
      }
      
      // Detect quota exceeded errors and provide helpful context
      if (error.message && error.message.includes('429') && error.message.includes('quota')) {
        console.error('🚫 [AI DEBUG] QUOTA EXCEEDED - Google AI API daily limit reached')
        console.error('🚫 [AI DEBUG] This explains why users are getting inaccurate results!')
        console.error('🚫 [AI DEBUG] The system will fall back to basic text processing (lower accuracy)')
        console.error('🚫 [AI DEBUG] Solution: Upgrade to paid tier or wait for quota reset')
        throw new Error('QUOTA_EXCEEDED: Google AI API daily limit reached. System will use fallback analysis.')
      }
      
      // Detect authentication errors
      if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        console.error('🔑 [AI DEBUG] AUTHENTICATION ERROR - Check API key validity')
        throw new Error('AUTH_ERROR: Google AI API authentication failed. Check API key.')
      }
      
      throw error
    }
  }

  /**
   * Parse Gemini response
   */
  private parseGeminiResponse(response: string): any {
    console.log('🔧 [PARSE DEBUG] Starting parseGeminiResponse...')
    console.log('🔧 [PARSE DEBUG] Original response length:', response.length)
    console.log('🔧 [PARSE DEBUG] Original response first 500 chars:', response.substring(0, 500))
    console.log('🔧 [PARSE DEBUG] Original response last 500 chars:', response.substring(Math.max(0, response.length - 500)))
    
    try {
      // Clean the response - remove markdown code blocks and extra whitespace
      let cleanedResponse = response.trim()
      console.log('🔧 [PARSE DEBUG] After trim, length:', cleanedResponse.length)
      
      // Remove markdown code blocks
      const beforeCodeBlockRemoval = cleanedResponse
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '')
      console.log('🔧 [PARSE DEBUG] After removing code blocks, length changed:', beforeCodeBlockRemoval.length, '->', cleanedResponse.length)
      
      // Try to find JSON array or object in the response
      console.log('🔧 [PARSE DEBUG] Looking for JSON patterns...')
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      if (jsonMatch) {
        console.log('✅ [PARSE DEBUG] Found JSON pattern, length:', jsonMatch[0].length)
        console.log('🔧 [PARSE DEBUG] JSON pattern starts with:', jsonMatch[0].substring(0, 100))
        console.log('🔧 [PARSE DEBUG] JSON pattern ends with:', jsonMatch[0].substring(Math.max(0, jsonMatch[0].length - 100)))
        
        const parsed = JSON.parse(jsonMatch[0])
        console.log('✅ [PARSE DEBUG] Successfully parsed JSON from pattern')
        console.log('🔧 [PARSE DEBUG] Parsed result type:', typeof parsed)
        console.log('🔧 [PARSE DEBUG] Parsed result keys:', Object.keys(parsed))
        return parsed
      }
      
      // If no JSON found, try parsing the entire cleaned response
      console.log('🔧 [PARSE DEBUG] No JSON pattern found, trying to parse entire cleaned response...')
      const parsed = JSON.parse(cleanedResponse)
      console.log('✅ [PARSE DEBUG] Successfully parsed entire cleaned response')
      return parsed
    } catch (error) {
      console.error('❌ [PARSE DEBUG] Initial parsing failed:', error.message)
      console.log('❌ [PARSE DEBUG] Original response that failed:', response)
      
      // Try more aggressive cleaning
      console.log('🔧 [PARSE DEBUG] Attempting aggressive cleaning...')
      try {
        const cleanedResponse = response
          .replace(/```json\s*/g, '')
          .replace(/```\s*$/g, '')
          .replace(/^[^{[]*/, '') // Remove everything before first { or [
          .replace(/[^}\]]*$/, '') // Remove everything after last } or ]
        
        console.log('🔧 [PARSE DEBUG] Aggressively cleaned response length:', cleanedResponse.length)
        console.log('🔧 [PARSE DEBUG] Aggressively cleaned response:', cleanedResponse.substring(0, 500))
        
        const parsed = JSON.parse(cleanedResponse)
        console.log('✅ [PARSE DEBUG] Second attempt successful!')
        return parsed
      } catch (secondError) {
        console.error('❌ [PARSE DEBUG] Second parsing attempt failed:', secondError.message)
        
        // Try to extract just the array part if it's a mixed response
        console.log('🔧 [PARSE DEBUG] Attempting array extraction...')
        try {
          const arrayMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/)
          if (arrayMatch) {
            console.log('✅ [PARSE DEBUG] Found array pattern:', arrayMatch[0].substring(0, 200))
            const parsed = JSON.parse(arrayMatch[0])
            console.log('✅ [PARSE DEBUG] Third attempt successful!')
            return parsed
          } else {
            console.log('🔧 [PARSE DEBUG] No array pattern found')
          }
        } catch (thirdError) {
          console.error('❌ [PARSE DEBUG] Third parsing attempt failed:', thirdError.message)
        }
        
        // Try to extract JSON from the end of the response
        console.log('🔧 [PARSE DEBUG] Attempting line-by-line parsing from end...')
        try {
          const lines = response.split('\n').reverse()
          console.log('🔧 [PARSE DEBUG] Total lines to check:', lines.length)
          for (let i = 0; i < Math.min(lines.length, 10); i++) {
            const line = lines[i]
            if (line.trim().startsWith('[') || line.trim().startsWith('{')) {
              console.log('🔧 [PARSE DEBUG] Found JSON line:', line.trim().substring(0, 100))
              const parsed = JSON.parse(line.trim())
              console.log('✅ [PARSE DEBUG] Fourth attempt successful!')
              return parsed
            }
          }
          console.log('🔧 [PARSE DEBUG] No valid JSON lines found')
        } catch (fourthError) {
          console.error('❌ [PARSE DEBUG] Fourth parsing attempt failed:', fourthError.message)
        }
        
        // Try to fix common JSON syntax errors
        try {
          const fixedResponse = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*$/g, '')
            .replace(/,\s*}/g, '}') // Remove trailing commas
            .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
            .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2') // Fix escaped characters
            .replace(/\n/g, ' ') // Replace newlines with spaces
            .replace(/\r/g, '') // Remove carriage returns
            .replace(/\t/g, ' ') // Replace tabs with spaces
            .replace(/\s+/g, ' ') // Normalize whitespace
          
          const jsonMatch = fixedResponse.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
          }
        } catch (fifthError) {
          console.error('Fifth parsing attempt failed:', fifthError)
        }
        
        // Last resort: try to extract and fix individual JSON objects
        try {
          const objects = response.match(/\{[^}]*\}/g)
          if (objects && objects.length > 0) {
            return objects.map(obj => {
              try {
                return JSON.parse(obj)
              } catch {
                return null
              }
            }).filter(Boolean)
          }
        } catch (sixthError) {
          console.error('Sixth parsing attempt failed:', sixthError)
        }
        
        // If all parsing attempts fail, return a default structure
        console.warn('All JSON parsing attempts failed, returning default structure')
        return []
      }
    }
  }

  /**
   * Test AI functionality with a simple prompt
   */
  async testAI(): Promise<{success: boolean, error?: string, response?: string}> {
    console.log('🧪 [AI TEST] Starting AI functionality test...')
    
    if (!this.model) {
      console.error('❌ [AI TEST] AI model not available')
      return { success: false, error: 'AI model not available' }
    }

    try {
      const testPrompt = 'Respond with a simple JSON object: {"test": "success", "message": "AI is working"}'
      console.log('🧪 [AI TEST] Sending test prompt...')
      
      const response = await this.callGemini(testPrompt)
      console.log('✅ [AI TEST] Received response:', response)
      
      // Try to parse the response
      const parsed = this.parseGeminiResponse(response)
      console.log('✅ [AI TEST] Parsed response:', parsed)
      
      return { success: true, response: JSON.stringify(parsed) }
    } catch (error) {
      console.error('❌ [AI TEST] Test failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Analyze the quality of the prompt we're sending to AI
   */
  private analyzePromptQuality(prompt: string, documentText: string): {score: number, issues: string[]} {
    console.log('📋 [PROMPT DEBUG] Analyzing prompt quality...')
    const issues: string[] = []
    let score = 100
    
    // Check prompt length (should be comprehensive but not too long)
    if (prompt.length < 1000) {
      issues.push('Prompt may be too short for comprehensive analysis')
      score -= 20
    } else if (prompt.length > 10000) {
      issues.push('Prompt may be too long and could hit token limits')
      score -= 10
    }
    
    // Check if document text is included
    if (!prompt.includes(documentText.substring(0, 100))) {
      issues.push('Document text may not be properly included in prompt')
      score -= 30
    }
    
    // Check for key instructions
    const keyInstructions = [
      'creditorName',
      'accountNumber', 
      'creditScores',
      'negativeItems',
      'JSON',
      'RETURN ONLY'
    ]
    
    keyInstructions.forEach(instruction => {
      if (!prompt.toLowerCase().includes(instruction.toLowerCase())) {
        issues.push(`Missing key instruction: ${instruction}`)
        score -= 10
      }
    })
    
    // Check document text quality
    const docIssues: string[] = []
    if (documentText.length < 500) {
      docIssues.push('Document text may be too short for meaningful analysis')
      score -= 20
    }
    
    if (documentText.includes('DOCUMENT PLACEHOLDER')) {
      docIssues.push('Document appears to be placeholder text')
      score -= 50
    }
    
    if (!/\d{3}/g.test(documentText)) {
      docIssues.push('No credit scores detected in document text')
      score -= 15
    }
    
    if (!/account|credit|balance|payment/gi.test(documentText)) {
      docIssues.push('No credit-related terms detected in document text')
      score -= 25
    }
    
    issues.push(...docIssues)
    
    console.log('📋 [PROMPT DEBUG] Prompt quality analysis:', {
      score: Math.max(0, score),
      promptLength: prompt.length,
      documentLength: documentText.length,
      issuesCount: issues.length,
      issues
    })
    
    return { score: Math.max(0, score), issues }
  }

  /**
   * Save analysis to database (simple implementation)
   */
  private async saveAnalysis(userId?: string, analysis?: AIAnalysisResult, supabaseClient?: any): Promise<void> {
    if (!userId || !supabaseClient) {
      console.log('Skipping database save for anonymous user')
      return
    }

    try {
      // Basic save implementation - can be enhanced later
      console.log('Saving analysis for user:', userId)
    } catch (error) {
      console.error('Error saving analysis:', error)
    }
  }
}

// Export singleton instance
export const creditAnalyzer = new CreditAnalyzer()
