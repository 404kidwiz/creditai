import { GoogleGenerativeAI } from '@google/generative-ai'
import { DisputeRecommendation } from './creditAnalyzer'

export interface DisputeLetter {
  id: string
  type: 'dispute' | 'follow-up' | 'escalation'
  recipient: 'credit-bureau' | 'creditor' | 'collection-agency'
  subject: string
  content: string
  attachments: string[]
  legalReferences: string[]
  createdAt: string
  recommendation: DisputeRecommendation
}

export interface DisputeLetterRequest {
  recommendation: DisputeRecommendation
  personalInfo: {
    name: string
    address: string
    ssn?: string
    dateOfBirth?: string
  }
  accountInfo?: {
    accountNumber: string
    creditorName: string
    originalAmount?: number
    currentBalance?: number
    dateOpened?: string
    lastActivity?: string
  }
  disputeType: 'inaccuracy' | 'identity-theft' | 'mixed-file' | 'outdated' | 'duplicate' | 'never-late' | 'paid-in-full'
  customDetails?: string
}

export class AIDisputeLetterGenerator {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null

  constructor() {
    // Only initialize on server-side
    if (typeof window === 'undefined') {
      const apiKey = process.env.GOOGLE_AI_API_KEY || ''
      
      if (!apiKey) {
        console.warn('Google AI API key not configured. Dispute letter generation will use templates.')
        return
      }
      
      try {
        this.genAI = new GoogleGenerativeAI(apiKey)
        this.model = this.genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent legal language
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 2048,
          },
        })
        console.log('AI Dispute Letter Generator initialized successfully')
      } catch (error) {
        console.error('Error initializing AI model:', error)
      }
    }
  }

  /**
   * Generate a personalized dispute letter using AI
   */
  async generateDisputeLetter(request: DisputeLetterRequest): Promise<DisputeLetter> {
    if (!this.model) {
      console.warn('AI model not available. Using template-based letter generation.')
      return this.generateTemplateBasedLetter(request)
    }

    try {
      const prompt = this.createDisputeLetterPrompt(request)
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const letterContent = response.text()

      // Parse the AI response
      const parsedLetter = this.parseAIResponse(letterContent, request)
      
      return {
        id: this.generateId(),
        type: 'dispute',
        recipient: this.determineRecipient(request),
        subject: parsedLetter.subject,
        content: parsedLetter.content,
        attachments: parsedLetter.attachments,
        legalReferences: parsedLetter.legalReferences,
        createdAt: new Date().toISOString(),
        recommendation: request.recommendation
      }
    } catch (error) {
      console.error('AI letter generation failed:', error)
      return this.generateTemplateBasedLetter(request)
    }
  }

  /**
   * Generate multiple dispute letters for different bureaus
   */
  async generateMultipleBureauLetters(request: DisputeLetterRequest): Promise<DisputeLetter[]> {
    const bureaus = ['experian', 'equifax', 'transunion']
    const letters: DisputeLetter[] = []

    for (const bureau of bureaus) {
      const bureauRequest = {
        ...request,
        customDetails: `${request.customDetails || ''} This dispute is being sent to ${bureau.charAt(0).toUpperCase() + bureau.slice(1)}.`
      }
      
      const letter = await this.generateDisputeLetter(bureauRequest)
      letter.subject = `Credit Report Dispute - ${bureau.charAt(0).toUpperCase() + bureau.slice(1)} - ${request.personalInfo.name}`
      letters.push(letter)
    }

    return letters
  }

  /**
   * Generate a follow-up letter for unresolved disputes
   */
  async generateFollowUpLetter(originalRequest: DisputeLetterRequest, daysElapsed: number): Promise<DisputeLetter> {
    const followUpRequest = {
      ...originalRequest,
      customDetails: `This is a follow-up to my dispute letter sent ${daysElapsed} days ago. According to the Fair Credit Reporting Act, you have 30 days to investigate and respond to disputes. I have not received a response or seen the disputed item removed from my credit report.`
    }

    const letter = await this.generateDisputeLetter(followUpRequest)
    letter.type = 'follow-up'
    letter.subject = `FOLLOW-UP: Credit Report Dispute - ${originalRequest.personalInfo.name}`
    
    return letter
  }

  /**
   * Create a comprehensive prompt for AI letter generation
   */
  private createDisputeLetterPrompt(request: DisputeLetterRequest): string {
    return `
You are an expert credit repair specialist and legal writer. Generate a professional, legally sound credit dispute letter based on the following information:

PERSONAL INFORMATION:
- Name: ${request.personalInfo.name}
- Address: ${request.personalInfo.address}
- SSN: ${request.personalInfo.ssn ? `***-**-${request.personalInfo.ssn.slice(-4)}` : 'Not provided'}

DISPUTE DETAILS:
- Dispute Type: ${request.disputeType}
- Account/Item: ${request.accountInfo?.creditorName || 'Credit report item'}
- Account Number: ${request.accountInfo?.accountNumber || 'Not specified'}
- Legal Basis: ${request.recommendation.legalBasis}
- Expected Impact: ${request.recommendation.expectedImpact}

ADDITIONAL CONTEXT:
${request.customDetails || 'Standard dispute for inaccurate information'}

REQUIREMENTS:
1. Write a formal business letter format
2. Include proper legal references (Fair Credit Reporting Act, etc.)
3. Be specific about what needs to be corrected or removed
4. Request investigation within 30 days as required by law
5. Maintain professional, assertive tone
6. Include request for documentation if item is verified
7. Reference consumer rights under FCRA Section 611

RESPONSE FORMAT:
Return the response in this JSON format:
{
  "subject": "Brief subject line for the letter",
  "content": "Full letter content with proper formatting",
  "legalReferences": ["List of specific legal references cited"],
  "attachments": ["List of recommended attachments to include"]
}

Generate a compelling, legally sound dispute letter that maximizes the chance of successful resolution.
`
  }

  /**
   * Parse AI response and extract structured data
   */
  private parseAIResponse(response: string, request: DisputeLetterRequest): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // If JSON parsing fails, extract manually
    }

    // Fallback: manual extraction
    const subjectMatch = response.match(/Subject:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Credit Report Dispute - ${request.personalInfo.name}`;

    // Extract the main letter content
    let content = response;
    if (response.includes('Content:') || response.includes('Letter:')) {
      const contentMatch = response.match(/(?:Content:|Letter:)\s*([\s\S]+)/i);
      content = contentMatch ? contentMatch[1].trim() : response;
    }

    return {
      subject,
      content,
      legalReferences: ['Fair Credit Reporting Act Section 611', 'FCRA Section 623'],
      attachments: ['Copy of ID', 'Copy of utility bill', 'Supporting documentation']
    };
  }

  /**
   * Generate template-based letter when AI is not available
   */
  private generateTemplateBasedLetter(request: DisputeLetterRequest): DisputeLetter {
    const templates = {
      'inaccuracy': this.getInaccuracyTemplate(request),
      'identity-theft': this.getIdentityTheftTemplate(request),
      'mixed-file': this.getMixedFileTemplate(request),
      'outdated': this.getOutdatedTemplate(request),
      'duplicate': this.getDuplicateTemplate(request),
      'never-late': this.getNeverLateTemplate(request),
      'paid-in-full': this.getPaidInFullTemplate(request)
    };

    const template = templates[request.disputeType] || templates['inaccuracy'];

    return {
      id: this.generateId(),
      type: 'dispute',
      recipient: this.determineRecipient(request),
      subject: `Credit Report Dispute - ${request.personalInfo.name}`,
      content: template,
      attachments: ['Copy of ID', 'Copy of utility bill', 'Supporting documentation'],
      legalReferences: ['Fair Credit Reporting Act Section 611', 'FCRA Section 623'],
      createdAt: new Date().toISOString(),
      recommendation: request.recommendation
    };
  }

  /**
   * Template for inaccuracy disputes
   */
  private getInaccuracyTemplate(request: DisputeLetterRequest): string {
    const date = new Date().toLocaleDateString();
    
    return `
${date}

${request.personalInfo.name}
${request.personalInfo.address}

[Credit Bureau Address]

Re: Dispute of Inaccurate Information on Credit Report

Dear Sir or Madam,

I am writing to dispute inaccurate information on my credit report. Under the Fair Credit Reporting Act (FCRA) Section 611, I have the right to dispute any information that I believe to be inaccurate, incomplete, or unverifiable.

PERSONAL INFORMATION:
Name: ${request.personalInfo.name}
Address: ${request.personalInfo.address}
${request.personalInfo.ssn ? `SSN: ***-**-${request.personalInfo.ssn.slice(-4)}` : ''}

DISPUTED ITEM:
${request.accountInfo ? `
Creditor: ${request.accountInfo.creditorName}
Account Number: ${request.accountInfo.accountNumber}
` : ''}

REASON FOR DISPUTE:
${request.recommendation.disputeReason}

LEGAL BASIS:
${request.recommendation.legalBasis}

I am requesting that this item be investigated and removed from my credit report if it cannot be verified as accurate and complete. According to FCRA Section 611, you have 30 days to investigate this dispute.

If this item is verified as accurate, please provide me with the method of verification and contact information for the original creditor.

Please send me an updated copy of my credit report after the investigation is complete.

Thank you for your prompt attention to this matter.

Sincerely,

${request.personalInfo.name}

Enclosures: Copy of ID, Copy of utility bill
    `.trim();
  }

  /**
   * Template for identity theft disputes
   */
  private getIdentityTheftTemplate(request: DisputeLetterRequest): string {
    const date = new Date().toLocaleDateString();
    
    return `
${date}

${request.personalInfo.name}
${request.personalInfo.address}

[Credit Bureau Address]

Re: Identity Theft Dispute - Fraudulent Account

Dear Sir or Madam,

I am writing to report fraudulent activity on my credit report and dispute accounts that were opened as a result of identity theft.

PERSONAL INFORMATION:
Name: ${request.personalInfo.name}
Address: ${request.personalInfo.address}
${request.personalInfo.ssn ? `SSN: ***-**-${request.personalInfo.ssn.slice(-4)}` : ''}

FRAUDULENT ACCOUNT:
${request.accountInfo ? `
Creditor: ${request.accountInfo.creditorName}
Account Number: ${request.accountInfo.accountNumber}
` : ''}

I did not open this account, authorize its opening, or receive any benefit from it. This account is the result of identity theft. Under the Fair Credit Reporting Act Section 605B, information resulting from identity theft should be blocked from my credit report.

I have filed a police report and an identity theft report with the Federal Trade Commission. I am requesting that you:

1. Block this fraudulent information from my credit report immediately
2. Notify the furnisher that this information is disputed as fraudulent
3. Provide me with confirmation that this information has been blocked

Please send me an updated copy of my credit report after the fraudulent information has been removed.

Sincerely,

${request.personalInfo.name}

Enclosures: Copy of ID, Copy of utility bill, Police report, FTC Identity Theft Report
    `.trim();
  }

  /**
   * Generate additional templates for other dispute types
   */
  private getMixedFileTemplate(request: DisputeLetterRequest): string {
    return this.getInaccuracyTemplate(request).replace(
      'REASON FOR DISPUTE:',
      'REASON FOR DISPUTE:\nThis information belongs to another person with a similar name or SSN. This is a mixed file error.'
    );
  }

  private getOutdatedTemplate(request: DisputeLetterRequest): string {
    return this.getInaccuracyTemplate(request).replace(
      'REASON FOR DISPUTE:',
      'REASON FOR DISPUTE:\nThis information is outdated and should be removed according to FCRA reporting time limits.'
    );
  }

  private getDuplicateTemplate(request: DisputeLetterRequest): string {
    return this.getInaccuracyTemplate(request).replace(
      'REASON FOR DISPUTE:',
      'REASON FOR DISPUTE:\nThis is a duplicate listing of the same account. Only one entry should appear on my credit report.'
    );
  }

  private getNeverLateTemplate(request: DisputeLetterRequest): string {
    return this.getInaccuracyTemplate(request).replace(
      'REASON FOR DISPUTE:',
      'REASON FOR DISPUTE:\nI have never been late on this account. The payment history shown is inaccurate.'
    );
  }

  private getPaidInFullTemplate(request: DisputeLetterRequest): string {
    return this.getInaccuracyTemplate(request).replace(
      'REASON FOR DISPUTE:',
      'REASON FOR DISPUTE:\nThis account has been paid in full but is not showing the correct status on my credit report.'
    );
  }

  /**
   * Determine the appropriate recipient for the dispute letter
   */
  private determineRecipient(request: DisputeLetterRequest): 'credit-bureau' | 'creditor' | 'collection-agency' {
    if (request.recommendation.disputeReason.toLowerCase().includes('collection')) {
      return 'collection-agency';
    }
    if (request.recommendation.disputeReason.toLowerCase().includes('creditor')) {
      return 'creditor';
    }
    return 'credit-bureau';
  }

  /**
   * Generate a unique ID for the dispute letter
   */
  private generateId(): string {
    return `dispute-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const aiDisputeLetterGenerator = new AIDisputeLetterGenerator(); 