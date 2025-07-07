import { supabase } from '@/lib/supabase/client'
import { DisputeRecommendation } from '@/lib/ai/creditAnalyzer'

export interface DisputeLetter {
  id: string
  userId: string
  negativeItemId: string
  letterType: 'inaccurate_information' | 'identity_theft' | 'outdated_information' | 'not_mine' | 'paid_in_full' | 'settled' | 'validation_request'
  creditorName: string
  creditorAddress?: string
  disputeReason: string
  legalBasis: string
  supportingDocuments: string[]
  letterContent: string
  createdAt: Date
  status: 'draft' | 'generated' | 'sent' | 'responded'
}

export interface DisputeLetterTemplate {
  type: string
  title: string
  description: string
  template: string
  legalBasis: string
  requiredFields: string[]
}

export class DisputeLetterGenerator {
  private templates: Map<string, DisputeLetterTemplate> = new Map()

  constructor() {
    this.initializeTemplates()
  }

  /**
   * Initialize dispute letter templates based on FCRA regulations
   */
  private initializeTemplates(): void {
    // Template 1: Inaccurate Information
    this.templates.set('inaccurate_information', {
      type: 'inaccurate_information',
      title: 'Inaccurate Information Dispute',
      description: 'For disputing factually incorrect information on credit reports',
      legalBasis: 'Fair Credit Reporting Act Section 611 - Procedure in case of disputed accuracy',
      requiredFields: ['creditorName', 'accountNumber', 'disputeReason', 'correctInformation'],
      template: `
[Date]

[Bureau Name]
[Bureau Address]

Re: Dispute of Inaccurate Information
Reference Number: [Reference Number]

Dear Credit Bureau Representative,

I am writing to dispute inaccurate information appearing on my credit report. Under the Fair Credit Reporting Act Section 611, I have the right to dispute any inaccurate, incomplete, or unverifiable information on my credit report.

DISPUTED ITEM DETAILS:
- Creditor: [Creditor Name]
- Account Number: [Account Number]
- Date of Last Activity: [Date]
- Current Status: [Current Status]

DISPUTE REASON:
[Dispute Reason]

CORRECT INFORMATION:
[Correct Information]

This information is inaccurate because [Detailed Explanation]. I have attached supporting documentation that proves this information is incorrect.

I request that you investigate this matter within 30 days as required by law and remove this inaccurate information from my credit report. Please send me a written confirmation of the results of your investigation.

Thank you for your prompt attention to this matter.

Sincerely,
[Your Name]
[Your Address]
[Your Phone Number]
[Your Email]

Attachments:
- Copy of ID
- Supporting Documentation
      `
    })

    // Template 2: Identity Theft
    this.templates.set('identity_theft', {
      type: 'identity_theft',
      title: 'Identity Theft Dispute',
      description: 'For disputing fraudulent accounts opened without authorization',
      legalBasis: 'Fair Credit Reporting Act Section 605B - Identity theft prevention',
      requiredFields: ['creditorName', 'accountNumber', 'fraudulentDetails'],
      template: `
[Date]

[Bureau Name]
[Bureau Address]

Re: Identity Theft Dispute - Fraudulent Account
Reference Number: [Reference Number]

Dear Credit Bureau Representative,

I am writing to dispute fraudulent information on my credit report resulting from identity theft. Under the Fair Credit Reporting Act Section 605B, I have the right to dispute fraudulent accounts and have them blocked from my credit report.

FRAUDULENT ITEM DETAILS:
- Creditor: [Creditor Name]
- Account Number: [Account Number]
- Date Account Opened: [Date]
- Balance: [Balance]

IDENTITY THEFT DETAILS:
This account was opened fraudulently without my knowledge or authorization. I have never:
- Applied for credit with this company
- Received goods or services from this company
- Authorized anyone to open this account on my behalf

[Fraudulent Details]

I have filed a police report (Report #[Police Report Number]) and submitted an identity theft report to the Federal Trade Commission. Copies of these reports are attached.

Under FCRA Section 605B, I request that you:
1. Block this fraudulent information from appearing on my credit report
2. Provide written confirmation of the blocking within 5 business days
3. Notify the furnisher that the information is blocked

This is a serious matter involving identity theft, and I request your immediate attention and compliance with federal law.

Sincerely,
[Your Name]
[Your Address]
[Your Phone Number]
[Your Email]

Attachments:
- Copy of ID
- Police Report
- FTC Identity Theft Report
- Supporting Documentation
      `
    })

    // Template 3: Outdated Information
    this.templates.set('outdated_information', {
      type: 'outdated_information',
      title: 'Outdated Information Dispute',
      description: 'For disputing information that has exceeded statutory reporting periods',
      legalBasis: 'Fair Credit Reporting Act Section 605 - Requirements relating to information contained in consumer reports',
      requiredFields: ['creditorName', 'accountNumber', 'originalDate', 'reportingPeriod'],
      template: `
[Date]

[Bureau Name]
[Bureau Address]

Re: Dispute of Outdated Information
Reference Number: [Reference Number]

Dear Credit Bureau Representative,

I am writing to dispute outdated information on my credit report that exceeds the maximum reporting period allowed under the Fair Credit Reporting Act Section 605.

OUTDATED ITEM DETAILS:
- Creditor: [Creditor Name]
- Account Number: [Account Number]
- Date of First Delinquency: [Original Date]
- Current Status: [Current Status]

LEGAL BASIS FOR REMOVAL:
This negative information has exceeded the [Reporting Period] year reporting period established by FCRA Section 605. The date of first delinquency was [Original Date], which is more than [Reporting Period] years ago.

Under federal law, this information must be removed from my credit report as it violates the maximum reporting periods:
- Most negative information: 7 years
- Bankruptcies: 10 years
- Unpaid tax liens: Indefinite
- Paid tax liens: 7 years

I request that you immediately remove this outdated information from my credit report and provide written confirmation of the removal.

Thank you for your compliance with federal law.

Sincerely,
[Your Name]
[Your Address]
[Your Phone Number]
[Your Email]

Attachments:
- Copy of ID
- Documentation showing original date
      `
    })

    // Template 4: Validation Request
    this.templates.set('validation_request', {
      type: 'validation_request',
      title: 'Debt Validation Request',
      description: 'For requesting validation of debt information',
      legalBasis: 'Fair Credit Reporting Act Section 611 - Procedure in case of disputed accuracy',
      requiredFields: ['creditorName', 'accountNumber', 'claimedAmount'],
      template: `
[Date]

[Bureau Name]
[Bureau Address]

Re: Request for Validation of Debt Information
Reference Number: [Reference Number]

Dear Credit Bureau Representative,

I am writing to dispute the following information on my credit report and request validation of this debt under the Fair Credit Reporting Act Section 611.

DISPUTED ITEM DETAILS:
- Creditor: [Creditor Name]
- Account Number: [Account Number]
- Claimed Amount: [Claimed Amount]
- Date of Last Activity: [Date]

VALIDATION REQUEST:
I dispute the accuracy and validity of this debt. I request that you provide me with:

1. Proof that I have any obligation to pay this debt
2. Proof of the original creditor and the amount owed to the original creditor
3. Proof that you have the right to collect this debt
4. Verification or copy of any judgment (if applicable)
5. Copy of the original signed contract or agreement
6. Itemization of how the amount was calculated
7. Proof that the statute of limitations has not expired

Until you can validate this debt, I request that you cease all collection activities and remove this information from my credit report.

Under FCRA Section 611, you have 30 days to investigate and respond to this dispute. If you cannot validate this debt, it must be removed from my credit report immediately.

Sincerely,
[Your Name]
[Your Address]
[Your Phone Number]
[Your Email]

Attachments:
- Copy of ID
      `
    })
  }

  /**
   * Generate dispute letter based on recommendation
   */
  async generateLetter(
    userId: string,
    recommendation: DisputeRecommendation,
    userInfo: {
      name: string
      address: string
      phone: string
      email: string
    },
    creditorInfo: {
      name: string
      address?: string
      accountNumber?: string
    },
    additionalInfo?: Record<string, any>
  ): Promise<DisputeLetter> {
    const template = this.templates.get(recommendation.letterTemplate)
    if (!template) {
      throw new Error(`Template not found: ${recommendation.letterTemplate}`)
    }

    // Generate letter content
    const letterContent = this.fillTemplate(template.template, {
      ...userInfo,
      ...creditorInfo,
      ...additionalInfo,
      disputeReason: recommendation.disputeReason,
      legalBasis: recommendation.legalBasis,
      date: new Date().toLocaleDateString(),
      bureauName: 'Credit Bureau', // This would be dynamic based on bureau
      bureauAddress: 'Bureau Address', // This would be dynamic based on bureau
      referenceNumber: this.generateReferenceNumber()
    })

    // Create dispute letter object
    const disputeLetter: DisputeLetter = {
      id: this.generateId(),
      userId,
      negativeItemId: recommendation.negativeItemId,
      letterType: recommendation.letterTemplate as DisputeLetter['letterType'],
      creditorName: creditorInfo.name,
      creditorAddress: creditorInfo.address,
      disputeReason: recommendation.disputeReason,
      legalBasis: recommendation.legalBasis,
      supportingDocuments: [],
      letterContent,
      createdAt: new Date(),
      status: 'generated'
    }

    // Save to database
    await this.saveDisputeLetter(disputeLetter)

    return disputeLetter
  }

  /**
   * Fill template with provided data
   */
  private fillTemplate(template: string, data: Record<string, any>): string {
    let filledTemplate = template

    // Replace placeholders with actual data
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `[${key.charAt(0).toUpperCase() + key.slice(1)}]`
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value || '[Please Fill]')
    })

    return filledTemplate
  }

  /**
   * Get available templates
   */
  getTemplates(): DisputeLetterTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Get specific template
   */
  getTemplate(type: string): DisputeLetterTemplate | undefined {
    return this.templates.get(type)
  }

  /**
   * Generate unique reference number
   */
  private generateReferenceNumber(): string {
    return `CR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `dispute-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Save dispute letter to database
   */
  private async saveDisputeLetter(disputeLetter: DisputeLetter): Promise<void> {
    const { error } = await supabase
      .from('dispute_letters')
      .insert({
        id: disputeLetter.id,
        user_id: disputeLetter.userId,
        negative_item_id: disputeLetter.negativeItemId,
        letter_type: disputeLetter.letterType,
        creditor_name: disputeLetter.creditorName,
        creditor_address: disputeLetter.creditorAddress,
        dispute_reason: disputeLetter.disputeReason,
        legal_basis: disputeLetter.legalBasis,
        supporting_documents: disputeLetter.supportingDocuments,
        letter_content: disputeLetter.letterContent,
        status: disputeLetter.status,
        created_at: disputeLetter.createdAt.toISOString()
      })

    if (error) {
      console.error('Error saving dispute letter:', error)
      throw new Error('Failed to save dispute letter')
    }
  }

  /**
   * Get user's dispute letters
   */
  async getUserDisputeLetters(userId: string): Promise<DisputeLetter[]> {
    const { data, error } = await supabase
      .from('dispute_letters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching dispute letters:', error)
      throw new Error('Failed to fetch dispute letters')
    }

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      negativeItemId: row.negative_item_id,
      letterType: row.letter_type,
      creditorName: row.creditor_name,
      creditorAddress: row.creditor_address,
      disputeReason: row.dispute_reason,
      legalBasis: row.legal_basis,
      supportingDocuments: row.supporting_documents || [],
      letterContent: row.letter_content,
      createdAt: new Date(row.created_at),
      status: row.status
    }))
  }

  /**
   * Update dispute letter status
   */
  async updateDisputeLetterStatus(
    disputeLetterId: string,
    status: DisputeLetter['status']
  ): Promise<void> {
    const { error } = await supabase
      .from('dispute_letters')
      .update({ status })
      .eq('id', disputeLetterId)

    if (error) {
      console.error('Error updating dispute letter status:', error)
      throw new Error('Failed to update dispute letter status')
    }
  }
}

// Singleton instance
export const disputeLetterGenerator = new DisputeLetterGenerator()