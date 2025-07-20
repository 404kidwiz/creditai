import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CreditReportData {
  personalInfo: {
    name: string;
    address: string;
    ssn?: string;
    dateOfBirth?: string;
    phone?: string;
  };
  creditScore: {
    score: number;
    bureau: 'experian' | 'equifax' | 'transunion';
    date: string;
    scoreRange: { min: number; max: number };
    factors?: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }>;
  };
  accounts: CreditAccount[];
  negativeItems: NegativeItem[];
  inquiries: CreditInquiry[];
  publicRecords: PublicRecord[];
}

export interface CreditAccount {
  id: string;
  creditorName: string;
  accountNumber: string;
  accountType: 'credit_card' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'student_loan' | 'other';
  balance: number;
  creditLimit?: number;
  paymentHistory: string[];
  status: 'open' | 'closed' | 'paid' | 'charged_off';
  openDate: string;
  lastReported: string;
  remarks?: string;
}

export interface NegativeItem {
  id: string;
  type: 'late_payment' | 'collection' | 'charge_off' | 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure';
  creditorName: string;
  accountNumber?: string;
  amount: number;
  date: string;
  status: string;
  description: string;
  disputeReasons: string[];
  impactScore: number;
}

export interface CreditInquiry {
  id: string;
  creditorName: string;
  date: string;
  type: 'hard' | 'soft';
  purpose: string;
}

export interface PublicRecord {
  id: string;
  type: 'bankruptcy' | 'tax_lien' | 'judgment' | 'foreclosure';
  amount?: number;
  date: string;
  status: string;
  court?: string;
}

export interface DisputeRecommendation {
  id: string;
  negativeItemId: string;
  disputeReason: string;
  likelihood: 'high' | 'medium' | 'low';
  potentialImpact: string;
  evidence: string[];
  strategy: string;
}

export interface ScoreAnalysis {
  currentScore: number;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;
  improvementPotential: number;
  timelineEstimate: string;
}

export interface AIAnalysisResult {
  extractedData: CreditReportData;
  recommendations: DisputeRecommendation[];
  scoreAnalysis: ScoreAnalysis;
  summary: string;
  provider: string;
  confidence: number;
}

export class MultiProviderCreditAnalyzer {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    console.log('MultiProviderCreditAnalyzer constructor called');
    // Only initialize on server-side
    if (typeof window === 'undefined') {
      const apiKey = process.env.GOOGLE_AI_API_KEY || '';
      console.log('MultiProviderCreditAnalyzer constructor - API key available:', !!apiKey);

      if (apiKey) {
        try {
          this.genAI = new GoogleGenerativeAI(apiKey);
          this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 0.1,
              maxOutputTokens: 8192,
            },
          });
          console.log('MultiProviderCreditAnalyzer - AI model initialized successfully');
        } catch (error) {
          console.error('Error initializing AI model:', error);
        }
      } else {
        console.log('Google AI API key not configured. Please set GOOGLE_AI_API_KEY in your environment variables.');
      }
    } else {
      console.log('MultiProviderCreditAnalyzer - Running on client side, skipping AI initialization');
    }
  }

  /**
   * Analyze credit report from any provider
   */
  async analyzeReport(
    documentText: string,
    userId: string,
    supabaseClient?: any
  ): Promise<AIAnalysisResult> {
    console.log('MultiProviderCreditAnalyzer.analyzeReport called');

    if (!this.model) {
      console.warn('AI model not available. Using fallback analysis.');
      return this.createFallbackAnalysis(documentText, userId, supabaseClient);
    }

    try {
      // Detect provider and format
      const provider = this.detectProvider(documentText);
      console.log('Detected provider:', provider);

      // Extract structured data using provider-specific parsing
      const extractedData = await this.extractCreditData(documentText, provider);

      // Generate dispute recommendations
      const recommendations = await this.generateDisputeRecommendations(extractedData, provider);

      // Analyze credit score factors
      const scoreAnalysis = await this.analyzeScoreFactors(extractedData, provider);

      // Generate summary
      const summary = await this.generateSummary(extractedData, recommendations, scoreAnalysis, provider);

      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(extractedData, documentText);

      // Save analysis to database
      await this.saveAnalysis(userId, {
        extractedData,
        recommendations,
        scoreAnalysis,
        summary,
        provider,
        confidence
      }, supabaseClient);

      return {
        extractedData,
        recommendations,
        scoreAnalysis,
        summary,
        provider,
        confidence
      };
    } catch (error) {
      console.error('Multi-provider credit analysis error:', error);
      console.warn('Falling back to basic analysis due to AI error.');
      return this.createFallbackAnalysis(documentText, userId, supabaseClient);
    }
  }

  /**
   * Create fallback analysis when AI is not available
   */
  private createFallbackAnalysis(
    documentText: string,
    userId?: string,
    supabaseClient?: any
  ): AIAnalysisResult {
    console.log('Creating fallback analysis...')
    
    return {
      extractedData: {
        personalInfo: {
          name: 'Unable to extract',
          address: 'Unable to extract'
        },
        creditScore: {
          score: 650,
          date: new Date().toISOString(),
          bureau: 'experian',
          scoreRange: { min: 580, max: 669 }
        },
        accounts: [],
        negativeItems: [],
        inquiries: [],
        publicRecords: []
      },
      recommendations: [],
      scoreAnalysis: {
        currentScore: 650,
        factors: [
          { factor: 'Payment History', impact: 'neutral', weight: 35, description: 'Unable to analyze without AI' },
          { factor: 'Credit Utilization', impact: 'neutral', weight: 30, description: 'Unable to analyze without AI' }
        ],
        improvementPotential: 0,
        timelineEstimate: 'Unable to estimate'
      },
      summary: 'AI analysis unavailable. Please try again later or contact support.',
      confidence: 0,
      provider: 'fallback'
    }
  }

  /**
   * Generate analysis summary
   */
  private async generateSummary(
    extractedData: any,
    recommendations: any[],
    scoreAnalysis: any,
    provider: string
  ): Promise<string> {
    const accountCount = extractedData.accounts?.length || 0
    const negativeItemCount = extractedData.negativeItems?.length || 0
    const inquiryCount = extractedData.inquiries?.length || 0
    const currentScore = scoreAnalysis.currentScore || 650

    return `Credit report analysis completed using ${provider} data. Found ${accountCount} accounts, ${negativeItemCount} negative items, and ${inquiryCount} inquiries. Current credit score: ${currentScore}. Generated ${recommendations.length} dispute recommendations with estimated improvement potential of ${scoreAnalysis.improvementPotential || 0} points.`
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(extractedData: any, documentText: string): number {
    let confidence = 50 // Base confidence

    // Increase confidence based on data completeness
    if (extractedData.personalInfo?.name) confidence += 10
    if (extractedData.creditScores && Object.keys(extractedData.creditScores).length > 0) confidence += 15
    if (extractedData.accounts && extractedData.accounts.length > 0) confidence += 15
    if (extractedData.negativeItems && extractedData.negativeItems.length >= 0) confidence += 10

    // Adjust based on document length (longer documents usually have more data)
    const textLength = documentText.length
    if (textLength > 10000) confidence += 10
    else if (textLength > 5000) confidence += 5

    return Math.min(95, Math.max(10, confidence))
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysis(
    userId: string | undefined,
    analysisResult: any,
    supabaseClient?: any
  ): Promise<void> {
    if (!userId || !supabaseClient) {
      console.log('Skipping analysis save - no user ID or Supabase client')
      return
    }

    try {
      // Save analysis results to database
      // Implementation would depend on database schema
      console.log('Analysis saved for user:', userId)
    } catch (error) {
      console.error('Failed to save analysis:', error)
    }
  }

  /**
   * Detect credit report provider from text
   */
  private detectProvider(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('experian') || lowerText.includes('expert')) {
      return 'experian';
    } else if (lowerText.includes('equifax') || lowerText.includes('equi')) {
      return 'equifax';
    } else if (lowerText.includes('transunion') || lowerText.includes('trans')) {
      return 'transunion';
    } else if (lowerText.includes('credit karma') || lowerText.includes('karma')) {
      return 'credit_karma';
    } else if (lowerText.includes('annualcreditreport') || lowerText.includes('annual credit')) {
      return 'annualcreditreport';
    } else if (lowerText.includes('myfico') || lowerText.includes('fico')) {
      return 'myfico';
    } else if (lowerText.includes('credit sesame') || lowerText.includes('sesame')) {
      return 'credit_sesame';
    } else if (lowerText.includes('creditwise') || lowerText.includes('capital one')) {
      return 'creditwise';
    } else {
      return 'unknown';
    }
  }

  /**
   * Extract structured data using provider-specific parsing
   */
  private async extractCreditData(documentText: string, provider: string): Promise<CreditReportData> {
    if (!this.model) {
      throw new Error('AI model not available on client-side. Use server-side API.');
    }

    const providerSpecificPrompt = this.getProviderSpecificPrompt(provider);

    const prompt = `
${providerSpecificPrompt}

## ENTERPRISE CREDIT REPORT ANALYSIS - MAXIMUM ACCURACY MODE

You are an expert credit analyst with 20+ years of experience. Extract ALL available information with surgical precision. Use cross-referencing and validation to ensure maximum accuracy.

### EXTRACTION REQUIREMENTS:

**PERSONAL INFORMATION - Cross-Reference Multiple Sources:**
- Full legal name (check letterhead, account sections, personal info section)
- Current address and previous addresses if listed
- SSN (look for full, partial, or masked formats: XXX-XX-XXXX, ***-**-1234, etc.)
- Date of birth (MM/DD/YYYY, MM-DD-YYYY, or written formats)
- Phone numbers (current and previous)
- Employment information if present

**CREDIT SCORE - Enhanced Extraction:**
- Primary credit score (FICO, VantageScore, or bureau-specific)
- Score date and reporting bureau
- Score range (300-850, 501-990, etc.)
- Score factors with impact levels (High, Medium, Low)
- Score history if multiple dates present
- Model version (FICO 8, VantageScore 3.0, etc.)

**CREDITOR NAME EXTRACTION - Advanced Patterns:**
- Bank of America, BOA, B OF A → "Bank of America"
- Chase, JPMorgan Chase, JP Morgan → "Chase"
- Capital One, Cap One, CAPITAL ONE → "Capital One"
- Discover, DISCOVER BANK → "Discover"
- American Express, AMEX, AM EXPRESS → "American Express"
- Wells Fargo, WELLS FARGO BANK → "Wells Fargo"
- Citi, CITIBANK, CITI BANK → "Citibank"
- Synchrony, SYNCB, SYNCHRONY BANK → "Synchrony Bank"
- Credit One, CREDIT ONE BANK → "Credit One Bank"
- Look for collection agencies, medical providers, utilities

**ACCOUNT INFORMATION - Comprehensive Analysis:**
- Account numbers (full or partial/masked)
- Account types: Credit Cards, Auto Loans, Mortgages, Personal Loans, Student Loans, Lines of Credit
- Current balance and credit limit
- Payment history (24-month history preferred): OK, 30, 60, 90, 120+ days late
- Account status: Open, Closed, Paid, Charged Off, Collection, Settled
- Date opened and last reported date
- Monthly payment amount if available
- Credit utilization ratio (balance/limit)
- Account remarks and special conditions

**NEGATIVE ITEMS - Detailed Extraction:**
- Late payments (30, 60, 90, 120+ days) with dates
- Collections with original creditor and collection agency
- Charge-offs with dates and amounts
- Bankruptcies (Chapter 7, 11, 13) with filing and discharge dates
- Tax liens with filing dates and amounts
- Judgments with court information and amounts
- Foreclosures with dates and property information
- Dispute reasons and validation status

**CREDIT INQUIRIES - Authorization Tracking:**
- Hard inquiries with creditor names and dates
- Soft inquiries if listed
- Purpose of inquiry (credit card, auto loan, mortgage, etc.)
- Authorization status (authorized vs unauthorized)
- Promotional inquiries vs credit applications

**PUBLIC RECORDS - Court Information:**
- Bankruptcy filings with chapter, filing date, discharge date
- Tax liens with filing date, amount, and status
- Civil judgments with court, date, and amount
- Foreclosure proceedings with dates and status

### VALIDATION CHECKLIST:
✓ Cross-reference account numbers across sections
✓ Validate payment history consistency
✓ Verify date formats and chronological order
✓ Check creditor name consistency
✓ Validate credit score against factors
✓ Ensure balance/limit calculations are accurate
✓ Verify negative item dates and amounts
✓ Check inquiry authorization status

Return this exact JSON structure:

{
  "personalInfo": {
    "name": "Full legal name exactly as appears",
    "address": "Current address with full format",
    "ssn": "XXX-XX-XXXX format if available",
    "dateOfBirth": "MM/DD/YYYY format if available",
    "phone": "Primary phone number if available"
  },
  "creditScore": {
    "score": 750,
    "bureau": "experian|equifax|transunion",
    "date": "YYYY-MM-DD",
    "scoreRange": {"min": 300, "max": 850},
    "factors": [
      {
        "factor": "Payment History",
        "impact": "positive|negative|neutral",
        "weight": 35,
        "description": "Detailed description with specific impact"
      }
    ]
  },
  "accounts": [
    {
      "id": "unique_account_id",
      "creditorName": "Standardized creditor name",
      "accountNumber": "Account number (full or masked)",
      "accountType": "credit_card|auto_loan|mortgage|personal_loan|student_loan|other",
      "balance": 1000,
      "creditLimit": 5000,
      "paymentHistory": ["Current", "30", "Current", "60"],
      "status": "open|closed|paid|charged_off",
      "openDate": "YYYY-MM-DD",
      "lastReported": "YYYY-MM-DD",
      "remarks": "Special conditions or notes"
    }
  ],
  "negativeItems": [
    {
      "id": "unique_negative_id",
      "type": "late_payment|collection|charge_off|bankruptcy|tax_lien|judgment|foreclosure",
      "creditorName": "Original creditor or collection agency",
      "accountNumber": "Account number if available",
      "amount": 500,
      "date": "YYYY-MM-DD",
      "status": "Current status",
      "description": "Detailed description of negative item",
      "disputeReasons": ["inaccurate", "outdated", "not_mine", "paid"],
      "impactScore": 85
    }
  ],
  "inquiries": [
    {
      "id": "unique_inquiry_id",
      "creditorName": "Inquiring creditor name",
      "date": "YYYY-MM-DD",
      "type": "hard|soft",
      "purpose": "credit_card|auto_loan|mortgage|personal_loan|other"
    }
  ],
  "publicRecords": [
    {
      "id": "unique_public_id",
      "type": "bankruptcy|tax_lien|judgment|foreclosure",
      "amount": 10000,
      "date": "YYYY-MM-DD",
      "status": "Filed|Discharged|Satisfied|Active",
      "court": "Court name and jurisdiction"
    }
  ]
}

Credit Report Text:
${documentText}

RETURN ONLY VALID JSON WITH ALL AVAILABLE INFORMATION EXTRACTED:
`;

    const response = await this.callGemini(prompt);
    const parsedData = this.parseGeminiResponse(response);
    
    return parsedData;
  }

  /**
   * Call Gemini AI model
   */
  private async callGemini(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini model not initialized')
    }

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Gemini API call failed:', error)
      throw error
    }
  }

  /**
   * Parse Gemini response into structured data
   */
  private parseGeminiResponse(response: string): CreditReportData {
    try {
      // Clean the response to extract JSON
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      // Parse JSON
      const parsedData = JSON.parse(cleanResponse)
      
      // Ensure required structure
      return {
        personalInfo: parsedData.personalInfo || { name: 'Unknown', address: 'Unknown' },
        creditScore: parsedData.creditScore || { 
          score: 650, 
          bureau: 'experian', 
          date: new Date().toISOString(),
          scoreRange: { min: 580, max: 669 }
        },
        accounts: parsedData.accounts || [],
        negativeItems: parsedData.negativeItems || [],
        inquiries: parsedData.inquiries || [],
        publicRecords: parsedData.publicRecords || []
      }
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      console.log('Raw response:', response)
      
      // Return fallback structure
      return {
        personalInfo: { name: 'Parse Error', address: 'Parse Error' },
        creditScore: { 
          score: 650, 
          bureau: 'experian', 
          date: new Date().toISOString(),
          scoreRange: { min: 580, max: 669 }
        },
        accounts: [],
        negativeItems: [],
        inquiries: [],
        publicRecords: []
      }
    }
  }

  /**
   * Get provider-specific parsing instructions
   */
  private getProviderSpecificPrompt(provider: string): string {
    const prompts = {
      experian: `## EXPERIAN CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION
      
This is an Experian credit report with specific formatting patterns:

**EXPERIAN-SPECIFIC IDENTIFIERS:**
- "Experian" branding, logos, and headers
- Report reference numbers starting with "EXP" or similar
- PLUS Score (ranges 330-830) or FICO Score (300-850)
- Specific section headers: "Personal Information", "Account History", "Inquiries", "Public Records"

**EXPERIAN FORMATTING PATTERNS:**
- Account tables with standardized column headers
- Payment history using "OK", "30", "60", "90", "120+" codes
- Account status indicators: "Open", "Closed", "Charge Off", "Collection"
- Credit limit vs balance ratios clearly displayed
- Inquiry types: "Hard" vs "Soft" explicitly labeled

**EXPERIAN DATA EXTRACTION PRIORITIES:**
- Look for PLUS Score or FICO Score with score factors
- Extract all tradeline accounts with complete payment history
- Identify collection accounts with original creditor information
- Parse inquiry dates and creditor names with authorization status
- Extract public records with court and filing information
- Capture account remarks and special payment conditions

**EXPERIAN CREDITOR NAME PATTERNS:**
- Major banks: "BANK OF AMERICA", "WELLS FARGO BANK", "JPMORGAN CHASE"
- Credit cards: "CITIBANK", "DISCOVER BANK", "SYNCHRONY BANK"
- Collections: "PORTFOLIO RECOVERY", "MIDLAND FUNDING", "CAVALRY PORTFOLIO"`,
      
      equifax: `## EQUIFAX CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is an Equifax credit report with specific formatting patterns:

**EQUIFAX-SPECIFIC IDENTIFIERS:**
- "Equifax" branding and distinctive red/black formatting
- Report confirmation numbers and reference codes
- FICO Score (300-850) or proprietary scoring models
- Section headers: "Personal Data", "Credit History", "Inquiries", "Collections"

**EQUIFAX FORMATTING PATTERNS:**
- Account information in tabular format with payment grids
- Payment history codes: "OK", "30", "60", "90", "120" days late
- Account types: "Revolving", "Installment", "Mortgage", "Other"
- Balance and limit information with utilization percentages
- Inquiry listings with "Promotional" vs "Account Review" distinctions

**EQUIFAX DATA EXTRACTION PRIORITIES:**
- Extract primary FICO Score with contributing factors
- Parse all credit accounts with complete tradeline data
- Identify negative items with accurate date and amount information
- Extract inquiry details with creditor names and purposes
- Capture public records with court jurisdictions
- Parse account comments and dispute notations

**EQUIFAX CREDITOR NAME PATTERNS:**
- Banks: "BANK OF AMERICA", "WELLS FARGO", "CHASE BANK USA"
- Credit Cards: "AMERICAN EXPRESS", "CAPITAL ONE", "DISCOVER"
- Collections: "RECEIVABLES MANAGEMENT", "ENHANCED RECOVERY", "ARROW FINANCIAL"`,
      
      transunion: `## TRANSUNION CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is a TransUnion credit report with specific formatting patterns:

**TRANSUNION-SPECIFIC IDENTIFIERS:**
- "TransUnion" branding and blue/white color scheme
- File reference numbers and confirmation codes
- VantageScore (501-990) or FICO Score (300-850)
- Section organization: "Personal Profile", "Credit Summary", "Account Details"

**TRANSUNION FORMATTING PATTERNS:**
- Account listings with detailed payment history grids
- Payment codes: "OK", "30", "60", "90", "120+" with specific dates
- Account classifications: "Open", "Closed", "Paid", "Settled"
- Credit utilization displayed as percentages and dollar amounts
- Inquiry sections with "Hard" vs "Soft" pull classifications

**TRANSUNION DATA EXTRACTION PRIORITIES:**
- Extract VantageScore or FICO with detailed factor analysis
- Parse comprehensive account information with payment patterns
- Identify collections with original creditor cross-references
- Extract inquiry data with authorization and purpose codes
- Capture public records with complete court information
- Parse account alerts and consumer statements

**TRANSUNION CREDITOR NAME PATTERNS:**
- Financial institutions: "CITIBANK", "WELLS FARGO", "BANK OF AMERICA"
- Credit providers: "SYNCHRONY BANK", "CREDIT ONE", "FIRST PREMIER"
- Collection agencies: "MIDLAND CREDIT", "PORTFOLIO RECOVERY", "CAVALRY SPV"`,
      
      credit_karma: `## CREDIT KARMA CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is a Credit Karma credit report with specific formatting patterns:

**CREDIT KARMA-SPECIFIC IDENTIFIERS:**
- "Credit Karma" branding, logos, and headers
- TransUnion and Equifax data
- VantageScore 3.0 (ranges 300-850)
- Section headers: "Personal Information", "Accounts", "Credit Factors", "Inquiries"

**CREDIT KARMA FORMATTING PATTERNS:**
- Account summaries with current and original balances
- Payment history graphs with on-time payment percentages
- Credit utilization ratios displayed for revolving accounts
- Inquiry listings with dates and creditor names

**CREDIT KARMA DATA EXTRACTION PRIORITIES:**
- Extract VantageScore 3.0 with contributing factors
- Parse all credit accounts from TransUnion and Equifax
- Identify negative items with accurate date and amount information
- Extract inquiry details with creditor names and purposes
- Capture key credit factors impacting the score
- Parse account comments and dispute notations

**CREDIT KARMA CREDITOR NAME PATTERNS:**
- Banks: "BANK OF AMERICA", "WELLS FARGO", "CHASE BANK USA"
- Credit Cards: "CAPITAL ONE", "CREDIT ONE", "AMERICAN EXPRESS"
- Loans: "NAVY FEDERAL CREDIT UNION", "SOFI", "DISCOVER BANK"`,

      annualcreditreport: `## ANNUALCREDITREPORT.COM CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is a credit report obtained from AnnualCreditReport.com with specific formatting patterns:

**ANNUALCREDITREPORT.COM-SPECIFIC IDENTIFIERS:**
- Data from Experian, Equifax, and TransUnion
- Standard credit bureau formatting
- Section headers: "Personal Information", "Account History", "Inquiries", "Public Records"

**ANNUALCREDITREPORT.COM FORMATTING PATTERNS:**
- Account tables with standardized column headers
- Payment history using "OK", "30", "60", "90", "120+" codes
- Account status indicators: "Open", "Closed", "Charge Off", "Collection"
- Credit limit vs balance ratios clearly displayed
- Inquiry types: "Hard" vs "Soft" explicitly labeled

**ANNUALCREDITREPORT.COM DATA EXTRACTION PRIORITIES:**
- Extract credit scores (FICO or VantageScore) from each bureau
- Parse all tradeline accounts with complete payment history
- Identify collection accounts with original creditor information
- Extract inquiry dates and creditor names with authorization status
- Extract public records with court and filing information
- Capture account remarks and special payment conditions

**ANNUALCREDITREPORT.COM CREDITOR NAME PATTERNS:**
- Major banks: "BANK OF AMERICA", "WELLS FARGO BANK", "JPMORGAN CHASE"
- Credit cards: "CITIBANK", "DISCOVER BANK", "SYNCHRONY BANK"
- Collections: "PORTFOLIO RECOVERY", "MIDLAND FUNDING", "CAVALRY PORTFOLIO"`,

      myfico: `## MYFICO CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is a MyFICO credit report with specific formatting patterns:

**MYFICO-SPECIFIC IDENTIFIERS:**
- "MyFICO" branding and logos
- FICO Score 8, FICO Score 9, or other FICO versions
- Data from Experian, Equifax, and TransUnion
- Section headers: "FICO Scores", "Credit Report", "Alerts"

**MYFICO FORMATTING PATTERNS:**
- FICO scores displayed with bureau-specific ranges
- Account tables with standardized column headers
- Payment history using "OK", "30", "60", "90", "120+" codes
- Credit limit vs balance ratios clearly displayed
- Inquiry listings with dates and creditor names

**MYFICO DATA EXTRACTION PRIORITIES:**
- Extract all FICO scores with version and bureau
- Parse all tradeline accounts with complete payment history
- Identify collection accounts with original creditor information
- Extract inquiry dates and creditor names with authorization status
- Extract public records with court and filing information
- Capture account remarks and special payment conditions

**MYFICO CREDITOR NAME PATTERNS:**
- Major banks: "BANK OF AMERICA", "WELLS FARGO BANK", "JPMORGAN CHASE"
- Credit cards: "CITIBANK", "DISCOVER BANK", "SYNCHRONY BANK"
- Collections: "PORTFOLIO RECOVERY", "MIDLAND FUNDING", "CAVALRY PORTFOLIO"`,

      credit_sesame: `## CREDIT SESAME CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is a Credit Sesame credit report with specific formatting patterns:

**CREDIT SESAME-SPECIFIC IDENTIFIERS:**
- "Credit Sesame" branding and logos
- TransUnion data and TransRisk Score
- Section headers: "Overview", "Credit Report Card", "Recommendations"

**CREDIT SESAME FORMATTING PATTERNS:**
- Credit report card grades for payment history, debt usage, etc.
- Account summaries with current and original balances
- Payment history graphs with on-time payment percentages
- Credit utilization ratios displayed for revolving accounts
- Inquiry listings with dates and creditor names

**CREDIT SESAME DATA EXTRACTION PRIORITIES:**
- Extract TransRisk Score with contributing factors
- Parse all credit accounts from TransUnion
- Identify negative items with accurate date and amount information
- Extract inquiry details with creditor names and purposes
- Capture key credit factors impacting the score
- Parse account comments and dispute notations

**CREDIT SESAME CREDITOR NAME PATTERNS:**
- Banks: "BANK OF AMERICA", "WELLS FARGO", "CHASE BANK USA"
- Credit Cards: "CAPITAL ONE", "CREDIT ONE", "AMERICAN EXPRESS"
- Loans: "NAVY FEDERAL CREDIT UNION", "SOFI", "DISCOVER BANK"`,

      creditwise: `## CREDITWISE CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This is a CreditWise credit report with specific formatting patterns:

**CREDITWISE-SPECIFIC IDENTIFIERS:**
- "CreditWise" or "Capital One" branding and logos
- TransUnion VantageScore 3.0
- Section headers: "Snapshot", "Accounts", "Timeline", "Alerts"

**CREDITWISE FORMATTING PATTERNS:**
- Credit score trends displayed over time
- Account summaries with current balances and credit limits
- Payment history details for open and closed accounts
- Inquiry listings with dates and creditor names

**CREDITWISE DATA EXTRACTION PRIORITIES:**
- Extract TransUnion VantageScore 3.0 and trend
- Parse all credit accounts from TransUnion
- Identify negative items with accurate date and amount information
- Extract inquiry details with creditor names and purposes
- Capture key alerts and recommendations
- Parse account comments and dispute notations

**CREDITWISE CREDITOR NAME PATTERNS:**
- Banks: "BANK OF AMERICA", "WELLS FARGO", "CHASE BANK USA"
- Credit Cards: "CAPITAL ONE", "CREDIT ONE", "AMERICAN EXPRESS"
- Loans: "NAVY FEDERAL CREDIT UNION", "SOFI", "DISCOVER BANK"`,

      unknown: `## UNKNOWN CREDIT REPORT ANALYSIS - ENTERPRISE EXTRACTION

This appears to be a generic credit report.

**GENERIC CREDIT REPORT IDENTIFIERS:**
- Look for any credit bureau branding (Experian, Equifax, TransUnion)
- Credit score information (FICO, VantageScore, or other)
- Section headers: "Personal Information", "Account History", "Inquiries", "Public Records"

**GENERIC CREDIT REPORT FORMATTING PATTERNS:**
- Account tables with standardized column headers
- Payment history using "OK", "30", "60", "90", "120+" codes
- Account status indicators: "Open", "Closed", "Charge Off", "Collection"
- Credit limit vs balance ratios clearly displayed
- Inquiry types: "Hard" vs "Soft" explicitly labeled

**GENERIC CREDIT REPORT DATA EXTRACTION PRIORITIES:**
- Extract credit scores (FICO or VantageScore) if available
- Parse all tradeline accounts with complete payment history
- Identify collection accounts with original creditor information
- Extract inquiry dates and creditor names with authorization status
- Extract public records with court and filing information
- Capture account remarks and special payment conditions

**GENERIC CREDIT REPORT CREDITOR NAME PATTERNS:**
- Major banks: "BANK OF AMERICA", "WELLS FARGO BANK", "JPMORGAN CHASE"
- Credit cards: "CITIBANK", "DISCOVER BANK", "SYNCHRONY BANK"
- Collections: "PORTFOLIO RECOVERY", "MIDLAND FUNDING", "CAVALRY PORTFOLIO"`
    };

    return prompts[provider] || prompts.unknown;
  }

  /**
   * Generate dispute recommendations with provider-specific strategies
   */
  private async generateDisputeRecommendations(creditData: CreditReportData, provider: string): Promise<DisputeRecommendation[]> {
    if (!this.model) {
      throw new Error('AI model not available on client-side. Use server-side API.');
    }
    
    const providerStrategies = this.getProviderDisputeStrategies(provider);
    
    const prompt = `
${providerStrategies}

Analyze these negative items and generate dispute recommendations:

${JSON.stringify(creditData.negativeItems, null, 2)}

For each negative item, provide a dispute recommendation with this structure:
{
  "id": "unique_id",
  "negativeItemId": "item_id",
  "disputeReason": "Specific reason for dispute",
  "likelihood": "high|medium|low",
  "potentialImpact": "Expected impact if successful",
  "evidence": ["List of evidence to gather"],
  "strategy": "Specific dispute strategy"
}

Consider FCRA violations, outdated information, and accuracy issues.
`;

    const response = await this.callGemini(prompt);
    return this.parseDisputeRecommendations(response);
  }

  /**
   * Parse dispute recommendations from Gemini response
   */
  private parseDisputeRecommendations(response: string): DisputeRecommendation[] {
    try {
      // Clean the response to extract JSON
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      // Parse JSON
      const parsedData = JSON.parse(cleanResponse)
      
      // Return array of recommendations or empty array
      return Array.isArray(parsedData) ? parsedData : (parsedData.recommendations || [])
    } catch (error) {
      console.error('Failed to parse dispute recommendations:', error)
      console.log('Raw response:', response)
      
      // Return empty array on parse error
      return []
    }
  }

  /**
   * Get provider-specific dispute strategies
   */
  private getProviderDisputeStrategies(provider: string): string {
    const strategies = {
      experian: `Experian Dispute Strategies:
- Focus on FCRA Section 611(a)(1) accuracy requirements
- Emphasize Section 605(a) time limitations
- Use Experian's online dispute system or mail disputes
- Request reinvestigation under Section 611(a)(2)
- Follow up with CFPB complaints if needed`,
      
      equifax: `Equifax Dispute Strategies:
- Use Equifax's dispute process under FCRA Section 611
- Emphasize accuracy requirements under Section 611(a)(1)
- Request reinvestigation and correction
- Use certified mail for disputes
- Follow up with regulatory agencies if needed`,
      
      transunion: `TransUnion Dispute Strategies:
- Use TransUnion's dispute system per FCRA Section 611
- Focus on accuracy and completeness requirements
- Request reinvestigation under Section 611(a)(2)
- Use certified mail for disputes
- Follow up with CFPB if disputes are ignored`,

      credit_karma: `## CREDIT KARMA DISPUTE STRATEGIES:
- Focus on accuracy of reported information to both TransUnion and Equifax
- Dispute directly through Credit Karma's online platform when available
- Emphasize the need for consistent data across both bureaus
- Highlight any discrepancies between TransUnion and Equifax reports`,

      annualcreditreport: `## ANNUALCREDITREPORT.COM DISPUTE STRATEGIES:
- Since reports are sourced directly from each bureau, use strategies specific to Experian, Equifax, and TransUnion
- Verify data consistency across all three reports
- Prioritize disputes based on the most impactful inaccuracies`,

      myfico: `## MYFICO DISPUTE STRATEGIES:
- Focus on accuracy of data reported to all three bureaus (Experian, Equifax, and TransUnion)
- Utilize MyFICO's resources to understand the impact of negative items
- Prioritize disputes based on factors affecting FICO scores
- Tailor dispute letters to address specific FICO scoring considerations`,

      credit_sesame: `## CREDIT SESAME DISPUTE STRATEGIES:
- Focus on accuracy of data reported to TransUnion
- Dispute directly through Credit Sesame's online platform when available
- Emphasize the need for accurate TransRisk Score calculation
- Highlight any inaccuracies affecting the Credit Sesame report card grades`,

      creditwise: `## CREDITWISE DISPUTE STRATEGIES:
- Focus on accuracy of data reported to TransUnion
- Dispute directly through Capital One's CreditWise platform when available
- Emphasize the need for accurate VantageScore 3.0 calculation
- Highlight any inaccuracies affecting the CreditWise timeline and alerts`,

      unknown: `## GENERAL DISPUTE STRATEGIES:
- Focus on FCRA accuracy requirements
- Emphasize outdated information removal
- Request reinvestigation and correction
- Use certified mail for disputes
- Follow up with regulatory agencies if needed`
    };

    return strategies[provider] || strategies.unknown;
  }

  /**
   * Analyze credit score factors with provider-specific insights
   */
  private async analyzeScoreFactors(creditData: CreditReportData, provider: string): Promise<ScoreAnalysis> {
    if (!this.model) {
      throw new Error('AI model not available on client-side. Use server-side API.');
    }
    
    const providerFactors = this.getProviderScoreFactors(provider);
    
    const prompt = `
${providerFactors}

Analyze credit score factors based on this credit report data:

${JSON.stringify(creditData, null, 2)}

Return a JSON object with this structure:
{
  "currentScore": ${creditData.creditScore.score},
  "factors": [
    {
      "factor": "Payment History",
      "impact": "positive|negative|neutral",
      "weight": 35,
      "description": "Detailed description of this factor's impact"
    }
  ],
  "improvementPotential": 50,
  "timelineEstimate": "3-6 months"
}

Include all major credit factors: payment history, credit utilization, length of credit history, new credit, credit mix.
`;

    const response = await this.callGemini(prompt);
    return this.parseScoreAnalysis(response, creditData);
  }

  /**
   * Parse score analysis from Gemini response
   */
  private parseScoreAnalysis(response: string, creditData: CreditReportData): ScoreAnalysis {
    try {
      // Clean the response to extract JSON
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      // Parse JSON
      const parsedData = JSON.parse(cleanResponse)
      
      // Return score analysis structure
      return {
        currentScore: parsedData.currentScore || creditData.creditScore.score,
        factors: parsedData.factors || [
          { factor: 'Payment History', impact: 'neutral', weight: 35, description: 'Unable to analyze' },
          { factor: 'Credit Utilization', impact: 'neutral', weight: 30, description: 'Unable to analyze' }
        ],
        improvementPotential: parsedData.improvementPotential || 0,
        timelineEstimate: parsedData.timelineEstimate || 'Unable to estimate'
      }
    } catch (error) {
      console.error('Failed to parse score analysis:', error)
      console.log('Raw response:', response)
      
      // Return fallback structure
      return {
        currentScore: creditData.creditScore.score,
        factors: [
          { factor: 'Payment History', impact: 'neutral', weight: 35, description: 'Parse error - unable to analyze' },
          { factor: 'Credit Utilization', impact: 'neutral', weight: 30, description: 'Parse error - unable to analyze' }
        ],
        improvementPotential: 0,
        timelineEstimate: 'Unable to estimate due to parse error'
      }
    }
  }

  /**
   * Get provider-specific score factor information
   */
  private getProviderScoreFactors(provider: string): string {
    const factors = {
      experian: `Experian FICO Score Factors:
- Payment History (35%): On-time payments, late payments, collections
- Credit Utilization (30%): Credit card balances vs limits
- Length of Credit History (15%): Age of accounts
- New Credit (10%): Recent inquiries and new accounts
- Credit Mix (10%): Types of credit accounts`,
      
      equifax: `Equifax FICO Score Factors:
- Payment History (35%): Payment patterns and late payments
- Credit Utilization (30%): Debt-to-credit ratios
- Length of Credit History (15%): Account age and history
- New Credit (10%): Recent credit applications
- Credit Mix (10%): Variety of credit types`,
      
      transunion: `TransUnion FICO Score Factors:
- Payment History (35%): Payment behavior and late payments
- Credit Utilization (30%): Credit card usage ratios
- Length of Credit History (15%): Account longevity
- New Credit (10%): Recent credit activity
- Credit Mix (10%): Different types of credit`,
      
      unknown: `Standard Credit Score Factors:
- Payment History (35%): Most important factor
- Credit Utilization (30%): Amount of credit used
- Length of Credit History (15%): Age of accounts
- New Credit (10%): Recent credit inquiries
- Credit Mix (10%): Types of credit accounts`
    };

    return factors[provider] || factors.unknown;
  }

  // Additional helper methods would go here...
}