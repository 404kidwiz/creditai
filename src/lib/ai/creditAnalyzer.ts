import { supabase } from '@/lib/supabase/client'

export interface CreditReportData {
  personalInfo: {
    name: string
    address: string
    ssn?: string
    dateOfBirth?: string
  }
  creditScore: {
    score: number
    bureau: 'experian' | 'equifax' | 'transunion'
    date: string
    scoreRange: { min: number; max: number }
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
  paymentHistory: string
  status: 'open' | 'closed' | 'paid' | 'charged_off'
  openDate: string
  lastReported: string
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
}

export interface DisputeRecommendation {
  negativeItemId: string
  priority: 'high' | 'medium' | 'low'
  disputeReason: string
  legalBasis: string
  expectedImpact: string
  letterTemplate: string
}

export interface ScoreAnalysis {
  currentScore: number
  factors: ScoreFactor[]
  improvementPotential: number
  timelineEstimate: string
}

export interface ScoreFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  weight: number
  description: string
}

export class CreditAnalyzer {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }
  }

  /**
   * Analyze credit report using AI
   */
  async analyzeReport(
    documentText: string,
    userId: string
  ): Promise<AIAnalysisResult> {
    try {
      // Extract structured data from credit report
      const extractedData = await this.extractCreditData(documentText)
      
      // Generate dispute recommendations
      const recommendations = await this.generateDisputeRecommendations(extractedData)
      
      // Analyze credit score factors
      const scoreAnalysis = await this.analyzeScoreFactors(extractedData)
      
      // Generate summary
      const summary = await this.generateSummary(extractedData, recommendations, scoreAnalysis)
      
      // Save analysis to database
      await this.saveAnalysis(userId, {
        extractedData,
        recommendations,
        scoreAnalysis,
        summary
      })

      return {
        extractedData,
        recommendations,
        scoreAnalysis,
        summary
      }
    } catch (error) {
      console.error('Credit analysis error:', error)
      throw new Error('Failed to analyze credit report')
    }
  }

  /**
   * Extract structured data from credit report text using AI
   */
  private async extractCreditData(documentText: string): Promise<CreditReportData> {
    const prompt = `
Analyze this credit report and extract structured data. Return a JSON object with the following structure:

{
  "personalInfo": {
    "name": "Full Name",
    "address": "Address",
    "ssn": "XXX-XX-XXXX (if present)",
    "dateOfBirth": "MM/DD/YYYY (if present)"
  },
  "creditScore": {
    "score": 750,
    "bureau": "experian|equifax|transunion",
    "date": "YYYY-MM-DD",
    "scoreRange": {"min": 300, "max": 850}
  },
  "accounts": [
    {
      "id": "unique_id",
      "creditorName": "Creditor Name",
      "accountNumber": "Account Number",
      "accountType": "credit_card|auto_loan|mortgage|personal_loan|student_loan|other",
      "balance": 1000,
      "creditLimit": 5000,
      "paymentHistory": "Description of payment history",
      "status": "open|closed|paid|charged_off",
      "openDate": "YYYY-MM-DD",
      "lastReported": "YYYY-MM-DD"
    }
  ],
  "negativeItems": [
    {
      "id": "unique_id",
      "type": "late_payment|collection|charge_off|bankruptcy|tax_lien|judgment|foreclosure",
      "creditorName": "Creditor Name",
      "accountNumber": "Account Number",
      "amount": 500,
      "date": "YYYY-MM-DD",
      "status": "Status",
      "description": "Description of negative item",
      "disputeReasons": ["inaccurate", "outdated", "not_mine"],
      "impactScore": 85
    }
  ],
  "inquiries": [
    {
      "id": "unique_id",
      "creditorName": "Creditor Name",
      "date": "YYYY-MM-DD",
      "type": "hard|soft",
      "purpose": "Purpose of inquiry"
    }
  ],
  "publicRecords": [
    {
      "id": "unique_id",
      "type": "bankruptcy|tax_lien|judgment|foreclosure",
      "amount": 10000,
      "date": "YYYY-MM-DD",
      "status": "Status",
      "court": "Court Name"
    }
  ]
}

Credit Report Text:
${documentText}

Extract all available information and return only valid JSON:
`

    const response = await this.callOpenAI(prompt)
    return JSON.parse(response)
  }

  /**
   * Generate dispute recommendations based on negative items
   */
  private async generateDisputeRecommendations(
    creditData: CreditReportData
  ): Promise<DisputeRecommendation[]> {
    const prompt = `
Based on this credit report data, generate dispute recommendations for negative items.
Focus on FCRA violations, inaccuracies, and outdated information.

Credit Data:
${JSON.stringify(creditData, null, 2)}

Return a JSON array of dispute recommendations with this structure:
[
  {
    "negativeItemId": "item_id",
    "priority": "high|medium|low",
    "disputeReason": "Specific reason for dispute",
    "legalBasis": "FCRA section or legal basis",
    "expectedImpact": "Expected impact on credit score",
    "letterTemplate": "brief_description|inaccurate_information|identity_theft|outdated_information"
  }
]

Prioritize items with highest credit score impact and strongest legal basis.
`

    const response = await this.callOpenAI(prompt)
    return JSON.parse(response)
  }

  /**
   * Analyze credit score factors
   */
  private async analyzeScoreFactors(creditData: CreditReportData): Promise<ScoreAnalysis> {
    const prompt = `
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
`

    const response = await this.callOpenAI(prompt)
    return JSON.parse(response)
  }

  /**
   * Generate analysis summary
   */
  private async generateSummary(
    creditData: CreditReportData,
    recommendations: DisputeRecommendation[],
    scoreAnalysis: ScoreAnalysis
  ): Promise<string> {
    const prompt = `
Generate a comprehensive but concise summary of this credit analysis:

Current Score: ${creditData.creditScore.score}
Negative Items: ${creditData.negativeItems.length}
Dispute Recommendations: ${recommendations.length}
Improvement Potential: ${scoreAnalysis.improvementPotential} points

Write a 2-3 paragraph summary explaining:
1. Current credit situation
2. Key issues identified
3. Recommended action plan
4. Expected timeline for improvement

Make it encouraging and actionable for the user.
`

    return await this.callOpenAI(prompt)
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert credit analyst with deep knowledge of FCRA regulations and credit reporting. Always return valid JSON when requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  /**
   * Save analysis to database
   */
  private async saveAnalysis(userId: string, analysis: AIAnalysisResult): Promise<void> {
    // Save to credit_reports table
    const { error: reportError } = await supabase
      .from('credit_reports')
      .insert({
        user_id: userId,
        bureau: analysis.extractedData.creditScore.bureau,
        report_date: analysis.extractedData.creditScore.date,
        score: analysis.extractedData.creditScore.score,
        raw_data: analysis.extractedData,
        ai_analysis: {
          recommendations: analysis.recommendations,
          scoreAnalysis: analysis.scoreAnalysis,
          summary: analysis.summary
        }
      })

    if (reportError) {
      console.error('Error saving credit report:', reportError)
    }

    // Save negative items
    for (const item of analysis.extractedData.negativeItems) {
      const recommendation = analysis.recommendations.find(r => r.negativeItemId === item.id)
      
      await supabase
        .from('negative_items')
        .insert({
          user_id: userId,
          creditor_name: item.creditorName,
          account_number: item.accountNumber,
          balance: item.amount,
          status: 'identified',
          dispute_reason: recommendation?.disputeReason,
          impact_score: item.impactScore
        })
    }
  }
}

// Singleton instance
export const creditAnalyzer = new CreditAnalyzer()