/**
 * EOSCAR Format Engine
 * 
 * This module implements the Electronic Online Solution for Complete and Accurate Reporting (EOSCAR)
 * format for credit bureau dispute letters. EOSCAR is the industry standard format that enables
 * automated processing by credit bureaus, resulting in faster and more accurate dispute resolution.
 */

import { supabase } from '@/lib/supabase/client'
import {
  EOSCARLetter,
  EOSCARHeader,
  EOSCARConsumerInfo,
  EOSCARDisputeItem,
  EOSCARAttachment,
  EOSCARFooter,
  EOSCARSignature,
  EOSCARReasonCode,
  EOSCARAction,
  EOSCARItemType,
  ComplianceStatus,
  SubmitterInfo,
  EOSCARAddress,
  EOSCARPhoneNumber,
  EOSCARIdentification
} from '@/types/enhanced-credit'
import { EOSCARTemplateManager } from './eoscarTemplates'

// ===================================
// EOSCAR Format Specifications
// ===================================

export interface EOSCARFormatConfig {
  version: string
  maxDisputeItems: number
  maxAttachments: number
  requiredFields: string[]
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  field: string
  type: 'required' | 'format' | 'length' | 'enum'
  constraint: any
  message: string
}

export interface EOSCARGenerationRequest {
  consumerInfo: ConsumerInformation
  disputeItems: DisputeItemRequest[]
  submitterInfo: SubmitterInfo
  bureau: 'experian' | 'equifax' | 'transunion'
  attachments?: AttachmentRequest[]
  options?: GenerationOptions
}

export interface ConsumerInformation {
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string
  ssn: string
  dateOfBirth: Date
  currentAddress: AddressInfo
  previousAddresses?: AddressInfo[]
  phoneNumbers: PhoneInfo[]
  identification?: IdentificationInfo
}

export interface AddressInfo {
  street: string
  city: string
  state: string
  zipCode: string
  country?: string
  addressType: 'current' | 'previous' | 'mailing'
  dateRange?: {
    from: Date
    to?: Date
  }
}

export interface PhoneInfo {
  number: string
  type: 'home' | 'work' | 'mobile' | 'other'
  isPrimary: boolean
}

export interface IdentificationInfo {
  driversLicense?: {
    number: string
    state: string
    expirationDate: Date
  }
  passport?: {
    number: string
    country: string
    expirationDate: Date
  }
  other?: {
    type: string
    number: string
    issuingAuthority: string
  }
}

export interface DisputeItemRequest {
  itemType: EOSCARItemType
  creditorName: string
  creditorCode?: string
  accountNumber: string
  disputeReasonCode: EOSCARReasonCode
  disputeDescription: string
  requestedAction: EOSCARAction
  supportingDocuments?: string[]
  originalBalance?: number
  currentBalance?: number
  dateOpened?: Date
  dateReported?: Date
  dateOfFirstDelinquency?: Date
  legalBasis?: string
  specificInaccuracy?: string
  correctInformation?: string
  impactOnScore?: number
}

export interface AttachmentRequest {
  fileName: string
  fileType: string
  description: string
  relatedDisputeItems: number[]
  base64Content?: string
  fileUrl?: string
}

export interface GenerationOptions {
  includeOptionalFields: boolean
  validateCompliance: boolean
  formatForBureau: boolean
  includeSignature: boolean
  customFields?: { [key: string]: any }
}

// ===================================
// EOSCAR Formatter Class
// ===================================

export class EOSCARFormatter {
  private formatConfig: EOSCARFormatConfig
  private templates: Map<string, string> = new Map()

  constructor() {
    this.formatConfig = this.initializeFormatConfig()
    this.loadTemplates()
  }

  /**
   * Initialize EOSCAR format configuration
   */
  private initializeFormatConfig(): EOSCARFormatConfig {
    return {
      version: '1.0',
      maxDisputeItems: 50,
      maxAttachments: 20,
      requiredFields: [
        'consumerInfo.firstName',
        'consumerInfo.lastName',
        'consumerInfo.ssn',
        'consumerInfo.dateOfBirth',
        'consumerInfo.currentAddress',
        'disputeItems',
        'submitterInfo'
      ],
      validationRules: [
        {
          field: 'consumerInfo.ssn',
          type: 'format',
          constraint: /^\d{3}-\d{2}-\d{4}$/,
          message: 'SSN must be in format XXX-XX-XXXX'
        },
        {
          field: 'consumerInfo.firstName',
          type: 'length',
          constraint: { min: 1, max: 50 },
          message: 'First name must be 1-50 characters'
        },
        {
          field: 'consumerInfo.lastName',
          type: 'length',
          constraint: { min: 1, max: 50 },
          message: 'Last name must be 1-50 characters'
        },
        {
          field: 'disputeItems',
          type: 'required',
          constraint: true,
          message: 'At least one dispute item is required'
        }
      ]
    }
  }

  /**
   * Load EOSCAR templates from database
   */
  private async loadTemplates(): Promise<void> {
    try {
      const { data: templates, error } = await supabase
        .from('eoscar_templates')
        .select('*')
        .eq('compliance_validated', true)

      if (error) {
        console.error('Error loading EOSCAR templates:', error)
        this.loadDefaultTemplates()
        return
      }

      templates?.forEach(template => {
        this.templates.set(
          `${template.template_type}_${template.bureau}`,
          template.template_content
        )
      })

      console.log(`Loaded ${templates?.length || 0} EOSCAR templates`)

    } catch (error) {
      console.error('Failed to load EOSCAR templates:', error)
      this.loadDefaultTemplates()
    }
  }

  /**
   * Load default EOSCAR templates using template manager
   */
  private loadDefaultTemplates(): void {
    // Load templates from the template manager
    const allTemplates = EOSCARTemplateManager.getAllTemplates()
    
    allTemplates.forEach(template => {
      const key = template.bureau === 'all' 
        ? `${template.disputeType}_all`
        : `${template.disputeType}_${template.bureau}`
      
      this.templates.set(key, template.template)
    })

    console.log(`Loaded ${allTemplates.length} default EOSCAR templates`)
  }

  /**
   * Generate EOSCAR-compliant dispute letter
   */
  async generateEOSCARLetter(request: EOSCARGenerationRequest): Promise<EOSCARLetter> {
    console.log('Generating EOSCAR letter for bureau:', request.bureau)

    // Validate request
    const validationResult = this.validateRequest(request)
    if (!validationResult.isValid) {
      throw new Error(`EOSCAR validation failed: ${validationResult.errors.join(', ')}`)
    }

    // Generate transmission ID
    const transmissionId = this.generateTransmissionId()

    // Create EOSCAR header
    const header = this.createEOSCARHeader(transmissionId, request)

    // Create consumer information
    const consumerInfo = this.createEOSCARConsumerInfo(request.consumerInfo)

    // Create dispute items
    const disputeItems = this.createEOSCARDisputeItems(request.disputeItems)

    // Create attachments
    const attachments = this.createEOSCARAttachments(request.attachments || [])

    // Create footer
    const footer = this.createEOSCARFooter(request, disputeItems.length)

    // Generate letter content
    const rawContent = await this.generateLetterContent(
      header,
      consumerInfo,
      disputeItems,
      attachments,
      footer,
      request
    )

    // Validate compliance
    const complianceStatus = await this.validateCompliance(rawContent, request)

    const eoscarLetter: EOSCARLetter = {
      header,
      consumerInfo,
      disputeItems,
      supportingDocs: attachments,
      footer,
      rawContent,
      complianceStatus,
      generatedAt: new Date(),
      version: this.formatConfig.version,
      bureau: request.bureau,
      submissionMethod: 'online'
    }

    // Save to database for tracking
    await this.saveEOSCARLetter(eoscarLetter)

    console.log(`EOSCAR letter generated successfully with ${disputeItems.length} dispute items`)

    return eoscarLetter
  }

  /**
   * Validate EOSCAR request
   */
  private validateRequest(request: EOSCARGenerationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    this.formatConfig.requiredFields.forEach(field => {
      if (!this.getNestedValue(request, field)) {
        errors.push(`Required field missing: ${field}`)
      }
    })

    // Apply validation rules
    this.formatConfig.validationRules.forEach(rule => {
      const value = this.getNestedValue(request, rule.field)
      
      switch (rule.type) {
        case 'required':
          if (!value) {
            errors.push(rule.message)
          }
          break
        case 'format':
          if (value && !rule.constraint.test(value)) {
            errors.push(rule.message)
          }
          break
        case 'length':
          if (value && (value.length < rule.constraint.min || value.length > rule.constraint.max)) {
            errors.push(rule.message)
          }
          break
      }
    })

    // Check dispute items count
    if (request.disputeItems.length > this.formatConfig.maxDisputeItems) {
      errors.push(`Too many dispute items (max: ${this.formatConfig.maxDisputeItems})`)
    }

    // Check attachments count
    if (request.attachments && request.attachments.length > this.formatConfig.maxAttachments) {
      errors.push(`Too many attachments (max: ${this.formatConfig.maxAttachments})`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get nested object value by dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Generate unique transmission ID
   */
  private generateTransmissionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 6).toUpperCase()
    return `EOSCAR-${timestamp}-${random}`
  }

  /**
   * Create EOSCAR header
   */
  private createEOSCARHeader(
    transmissionId: string,
    request: EOSCARGenerationRequest
  ): EOSCARHeader {
    return {
      transmissionId,
      submissionDate: new Date(),
      submitterInfo: request.submitterInfo,
      bureauDestination: request.bureau,
      formatVersion: this.formatConfig.version,
      recordCount: request.disputeItems.length
    }
  }

  /**
   * Create EOSCAR consumer information
   */
  private createEOSCARConsumerInfo(consumerInfo: ConsumerInformation): EOSCARConsumerInfo {
    return {
      firstName: consumerInfo.firstName,
      lastName: consumerInfo.lastName,
      middleName: consumerInfo.middleName,
      suffix: consumerInfo.suffix,
      ssn: consumerInfo.ssn,
      dateOfBirth: consumerInfo.dateOfBirth,
      currentAddress: this.convertToEOSCARAddress(consumerInfo.currentAddress),
      previousAddresses: consumerInfo.previousAddresses?.map(addr => 
        this.convertToEOSCARAddress(addr)
      ),
      phoneNumbers: consumerInfo.phoneNumbers.map(phone => 
        this.convertToEOSCARPhone(phone)
      ),
      identification: consumerInfo.identification ? 
        this.convertToEOSCARIdentification(consumerInfo.identification) : undefined
    }
  }

  /**
   * Convert address to EOSCAR format
   */
  private convertToEOSCARAddress(address: AddressInfo): EOSCARAddress {
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country || 'USA',
      addressType: address.addressType,
      dateRange: address.dateRange
    }
  }

  /**
   * Convert phone to EOSCAR format
   */
  private convertToEOSCARPhone(phone: PhoneInfo): EOSCARPhoneNumber {
    return {
      number: this.formatPhoneNumber(phone.number),
      type: phone.type,
      isPrimary: phone.isPrimary
    }
  }

  /**
   * Format phone number to standard format
   */
  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.substr(0, 3)}) ${cleaned.substr(3, 3)}-${cleaned.substr(6, 4)}`
    }
    return phone // Return as-is if not standard format
  }

  /**
   * Convert identification to EOSCAR format
   */
  private convertToEOSCARIdentification(id: IdentificationInfo): EOSCARIdentification {
    return {
      driversLicense: id.driversLicense,
      passport: id.passport,
      other: id.other
    }
  }

  /**
   * Create EOSCAR dispute items
   */
  private createEOSCARDisputeItems(disputeItems: DisputeItemRequest[]): EOSCARDisputeItem[] {
    return disputeItems.map((item, index) => ({
      sequenceNumber: index + 1,
      itemType: item.itemType,
      creditorName: item.creditorName,
      creditorCode: item.creditorCode,
      accountNumber: this.formatAccountNumber(item.accountNumber),
      disputeReasonCode: item.disputeReasonCode,
      disputeDescription: item.disputeDescription,
      requestedAction: item.requestedAction,
      supportingDocuments: item.supportingDocuments || [],
      originalBalance: item.originalBalance,
      currentBalance: item.currentBalance,
      dateOpened: item.dateOpened,
      dateReported: item.dateReported,
      dateOfFirstDelinquency: item.dateOfFirstDelinquency,
      legalBasis: item.legalBasis,
      specificInaccuracy: item.specificInaccuracy,
      correctInformation: item.correctInformation,
      impactOnScore: item.impactOnScore
    }))
  }

  /**
   * Format account number for EOSCAR
   */
  private formatAccountNumber(accountNumber: string): string {
    // EOSCAR typically requires last 4 digits visible
    if (accountNumber.length > 4) {
      return '****' + accountNumber.slice(-4)
    }
    return accountNumber
  }

  /**
   * Create EOSCAR attachments
   */
  private createEOSCARAttachments(attachments: AttachmentRequest[]): EOSCARAttachment[] {
    return attachments.map((attachment, index) => ({
      id: `att_${index + 1}`,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      description: attachment.description,
      relatedDisputeItems: attachment.relatedDisputeItems,
      base64Content: attachment.base64Content,
      fileUrl: attachment.fileUrl
    }))
  }

  /**
   * Create EOSCAR footer
   */
  private createEOSCARFooter(
    request: EOSCARGenerationRequest,
    totalItems: number
  ): EOSCARFooter {
    const submissionDate = new Date()
    const expectedResponseDate = new Date()
    expectedResponseDate.setDate(submissionDate.getDate() + 30) // 30 days for response

    return {
      totalItems,
      submissionDate,
      expectedResponseDate,
      contactInfo: request.submitterInfo,
      legalNotices: [
        'This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.',
        'The consumer has the right to dispute inaccurate, incomplete, or unverifiable information.',
        'Credit reporting agencies must investigate and respond within 30 days.',
        'Failure to respond within the required timeframe may result in regulatory action.'
      ],
      signature: {
        signerName: `${request.consumerInfo.firstName} ${request.consumerInfo.lastName}`,
        signatureDate: submissionDate,
        electronicSignature: true,
        ipAddress: undefined, // Would be filled by client
        deviceInfo: undefined // Would be filled by client
      }
    }
  }

  /**
   * Generate letter content using templates
   */
  private async generateLetterContent(
    header: EOSCARHeader,
    consumerInfo: EOSCARConsumerInfo,
    disputeItems: EOSCARDisputeItem[],
    attachments: EOSCARAttachment[],
    footer: EOSCARFooter,
    request: EOSCARGenerationRequest
  ): Promise<string> {
    // Determine dispute type based on dispute items
    const disputeType = this.determineDisputeType(request.disputeItems)
    
    // Get the best template for this dispute type and bureau
    const templateConfig = EOSCARTemplateManager.getBestTemplate(disputeType, request.bureau)
    let template = templateConfig.template

    if (!template) {
      throw new Error(`No template found for dispute type: ${disputeType}, bureau: ${request.bureau}`)
    }

    // Prepare template data
    const templateData = {
      // Header data
      transmissionId: header.transmissionId,
      submissionDate: header.submissionDate.toISOString().split('T')[0],
      formatVersion: header.formatVersion,
      bureauDestination: header.bureauDestination.toUpperCase(),
      recordCount: header.recordCount,

      // Submitter data
      submitterName: header.submitterInfo.name,
      submitterAddress: this.formatAddress(header.submitterInfo.address),
      submitterPhone: header.submitterInfo.phone,
      submitterEmail: header.submitterInfo.email,
      organizationType: header.submitterInfo.organizationType || 'Individual',

      // Consumer data
      firstName: consumerInfo.firstName,
      lastName: consumerInfo.lastName,
      middleName: consumerInfo.middleName || '',
      suffix: consumerInfo.suffix || '',
      ssn: consumerInfo.ssn,
      dateOfBirth: consumerInfo.dateOfBirth.toISOString().split('T')[0],

      // Address data
      currentAddressStreet: consumerInfo.currentAddress.street,
      currentAddressCity: consumerInfo.currentAddress.city,
      currentAddressState: consumerInfo.currentAddress.state,
      currentAddressZipCode: consumerInfo.currentAddress.zipCode,

      // Phone numbers
      phoneNumbers: consumerInfo.phoneNumbers,

      // Dispute items
      disputeItems: disputeItems,

      // Attachments
      attachments: attachments,

      // Footer data
      totalItems: footer.totalItems,
      expectedResponseDate: footer.expectedResponseDate.toISOString().split('T')[0],
      contactInfo: `${footer.contactInfo.name} - ${footer.contactInfo.phone}`,
      signerName: footer.signature.signerName,
      signatureDate: footer.signature.signatureDate.toISOString().split('T')[0],
      electronicSignature: footer.signature.electronicSignature
    }

    // Simple template replacement (in production, use a proper template engine like Handlebars)
    let content = template
    Object.entries(templateData).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      }
    })

    // Handle arrays (simplified - in production use proper template engine)
    content = this.processArrayTemplates(content, templateData)

    return content
  }

  /**
   * Process array templates (simplified implementation)
   */
  private processArrayTemplates(content: string, data: any): string {
    // Process phone numbers
    if (data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
      const phoneSection = data.phoneNumbers
        .map(phone => `${phone.type}: ${phone.number}${phone.isPrimary ? ' (Primary)' : ''}`)
        .join('\n')
      content = content.replace(/{{#phoneNumbers}}[\s\S]*?{{\/phoneNumbers}}/g, phoneSection)
    }

    // Process dispute items
    if (data.disputeItems && Array.isArray(data.disputeItems)) {
      const disputeSection = data.disputeItems
        .map(item => this.formatDisputeItem(item))
        .join('\n\n')
      content = content.replace(/{{#disputeItems}}[\s\S]*?{{\/disputeItems}}/g, disputeSection)
    }

    // Process attachments
    if (data.attachments && Array.isArray(data.attachments)) {
      const attachmentSection = data.attachments
        .map(att => `- ${att.fileName}: ${att.description}`)
        .join('\n')
      content = content.replace(/{{#attachments}}[\s\S]*?{{\/attachments}}/g, attachmentSection)
    }

    return content
  }

  /**
   * Determine dispute type based on dispute items
   */
  private determineDisputeType(disputeItems: DisputeItemRequest[]): string {
    // Analyze dispute items to determine the primary dispute type
    const reasonCodes = disputeItems.map(item => item.disputeReasonCode)
    
    // Check for identity theft
    if (reasonCodes.includes(EOSCARReasonCode.IDENTITY_THEFT)) {
      return 'identity_theft'
    }
    
    // Check for payment history disputes
    if (reasonCodes.includes(EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY)) {
      return 'payment_history'
    }
    
    // Check for balance disputes
    if (reasonCodes.includes(EOSCARReasonCode.INACCURATE_BALANCE)) {
      return 'balance_dispute'
    }
    
    // Check for account status disputes
    if (reasonCodes.some(code => [
      EOSCARReasonCode.ACCOUNT_CLOSED,
      EOSCARReasonCode.PAID_IN_FULL,
      EOSCARReasonCode.SETTLED
    ].includes(code))) {
      return 'account_status'
    }
    
    // Default to general dispute
    return 'general'
  }

  /**
   * Format dispute item for template
   */
  private formatDisputeItem(item: EOSCARDisputeItem): string {
    let formatted = `Item ${item.sequenceNumber}: ${item.itemType}\n`
    formatted += `Creditor: ${item.creditorName}\n`
    
    if (item.creditorCode) {
      formatted += `Creditor Code: ${item.creditorCode}\n`
    }
    
    formatted += `Account Number: ${item.accountNumber}\n`
    formatted += `Dispute Reason Code: ${item.disputeReasonCode}\n`
    formatted += `Dispute Description: ${item.disputeDescription}\n`
    formatted += `Requested Action: ${item.requestedAction}\n`
    
    if (item.originalBalance) {
      formatted += `Original Balance: $${item.originalBalance}\n`
    }
    
    if (item.currentBalance) {
      formatted += `Current Balance: $${item.currentBalance}\n`
    }
    
    if (item.dateOpened) {
      formatted += `Date Opened: ${item.dateOpened.toISOString().split('T')[0]}\n`
    }
    
    if (item.dateReported) {
      formatted += `Date Reported: ${item.dateReported.toISOString().split('T')[0]}\n`
    }
    
    if (item.legalBasis) {
      formatted += `Legal Basis: ${item.legalBasis}\n`
    }
    
    if (item.specificInaccuracy) {
      formatted += `Specific Inaccuracy: ${item.specificInaccuracy}\n`
    }
    
    if (item.correctInformation) {
      formatted += `Correct Information: ${item.correctInformation}\n`
    }

    return formatted
  }

  /**
   * Format address for display
   */
  private formatAddress(address: any): string {
    if (!address) return ''
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`
  }

  /**
   * Validate EOSCAR compliance
   */
  private async validateCompliance(
    content: string,
    request: EOSCARGenerationRequest
  ): Promise<ComplianceStatus> {
    const issues: string[] = []
    const warnings: string[] = []

    // Check required sections
    const requiredSections = [
      'TRANSMISSION HEADER',
      'SUBMITTER INFORMATION',
      'CONSUMER INFORMATION',
      'CURRENT ADDRESS',
      'DISPUTE ITEMS',
      'LEGAL NOTICES',
      'SIGNATURE',
      'TRANSMISSION FOOTER'
    ]

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        issues.push(`Missing required section: ${section}`)
      }
    })

    // Check dispute items format
    request.disputeItems.forEach((item, index) => {
      if (!item.disputeReasonCode || !Object.values(EOSCARReasonCode).includes(item.disputeReasonCode)) {
        issues.push(`Invalid dispute reason code for item ${index + 1}`)
      }
      
      if (!item.requestedAction || !Object.values(EOSCARAction).includes(item.requestedAction)) {
        issues.push(`Invalid requested action for item ${index + 1}`)
      }
      
      if (!item.disputeDescription || item.disputeDescription.length < 10) {
        warnings.push(`Dispute description may be too brief for item ${index + 1}`)
      }
    })

    // Check consumer information completeness
    if (!request.consumerInfo.ssn.match(/^\d{3}-\d{2}-\d{4}$/)) {
      issues.push('SSN format invalid - must be XXX-XX-XXXX')
    }

    if (!request.consumerInfo.currentAddress.zipCode.match(/^\d{5}(-\d{4})?$/)) {
      warnings.push('ZIP code format may be invalid')
    }

    const complianceScore = Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5))

    return {
      isCompliant: issues.length === 0,
      complianceScore,
      issues,
      warnings,
      validatedAt: new Date(),
      validatedBy: 'EOSCARFormatter'
    }
  }

  /**
   * Save EOSCAR letter to database
   */
  private async saveEOSCARLetter(letter: EOSCARLetter): Promise<void> {
    try {
      const { error } = await supabase
        .from('eoscar_letters')
        .insert({
          transmission_id: letter.header.transmissionId,
          bureau: letter.bureau,
          consumer_name: `${letter.consumerInfo.firstName} ${letter.consumerInfo.lastName}`,
          dispute_count: letter.disputeItems.length,
          compliance_score: letter.complianceStatus.complianceScore,
          is_compliant: letter.complianceStatus.isCompliant,
          raw_content: letter.rawContent,
          generated_at: letter.generatedAt,
          status: 'generated'
        })

      if (error) {
        console.error('Error saving EOSCAR letter:', error)
      } else {
        console.log('EOSCAR letter saved successfully')
      }
    } catch (error) {
      console.error('Failed to save EOSCAR letter:', error)
    }
  }
}

// ===================================
// EOSCAR Reason Code Mapper
// ===================================

export class ReasonCodeMapper {
  private static reasonCodeMap: Map<string, EOSCARReasonCode> = new Map([
    // Account ownership disputes
    ['not_mine', EOSCARReasonCode.NOT_MINE],
    ['identity_theft', EOSCARReasonCode.IDENTITY_THEFT],
    ['mixed_file', EOSCARReasonCode.MIXED_FILE],
    
    // Balance and payment disputes
    ['incorrect_balance', EOSCARReasonCode.INACCURATE_BALANCE],
    ['wrong_payment_history', EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY],
    ['paid_in_full', EOSCARReasonCode.PAID_IN_FULL],
    ['settled_account', EOSCARReasonCode.SETTLED],
    
    // Account status disputes
    ['account_closed', EOSCARReasonCode.ACCOUNT_CLOSED],
    ['duplicate_account', EOSCARReasonCode.DUPLICATE],
    ['outdated_information', EOSCARReasonCode.OUTDATED],
    
    // General inaccuracy
    ['inaccurate_info', EOSCARReasonCode.INACCURATE_BALANCE], // Default fallback
  ])

  private static reasonCodeDescriptions: Map<EOSCARReasonCode, string> = new Map([
    [EOSCARReasonCode.NOT_MINE, 'This account does not belong to me'],
    [EOSCARReasonCode.INACCURATE_BALANCE, 'The balance amount is incorrect'],
    [EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY, 'The payment history is inaccurate'],
    [EOSCARReasonCode.ACCOUNT_CLOSED, 'This account has been closed'],
    [EOSCARReasonCode.PAID_IN_FULL, 'This account has been paid in full'],
    [EOSCARReasonCode.SETTLED, 'This account was settled for less than full balance'],
    [EOSCARReasonCode.OUTDATED, 'This information is outdated and should be removed'],
    [EOSCARReasonCode.DUPLICATE, 'This is a duplicate entry'],
    [EOSCARReasonCode.IDENTITY_THEFT, 'This account is the result of identity theft'],
    [EOSCARReasonCode.MIXED_FILE, 'This information belongs to someone else (mixed file)']
  ])

  /**
   * Map dispute reason to EOSCAR reason code
   */
  static mapReasonToCode(reason: string): EOSCARReasonCode {
    const normalizedReason = reason.toLowerCase().replace(/[^a-z_]/g, '_')
    return this.reasonCodeMap.get(normalizedReason) || EOSCARReasonCode.INACCURATE_BALANCE
  }

  /**
   * Get description for reason code
   */
  static getReasonDescription(code: EOSCARReasonCode): string {
    return this.reasonCodeDescriptions.get(code) || 'Information is inaccurate'
  }

  /**
   * Get all available reason codes
   */
  static getAllReasonCodes(): { code: EOSCARReasonCode; description: string }[] {
    return Array.from(this.reasonCodeDescriptions.entries()).map(([code, description]) => ({
      code,
      description
    }))
  }

  /**
   * Validate reason code
   */
  static isValidReasonCode(code: string): boolean {
    return Object.values(EOSCARReasonCode).includes(code as EOSCARReasonCode)
  }
}

// ===================================
// EOSCAR Validator
// ===================================

export class EOSCARValidator {
  private static requiredFields = [
    'header.transmissionId',
    'header.submissionDate',
    'header.submitterInfo',
    'consumerInfo.firstName',
    'consumerInfo.lastName',
    'consumerInfo.ssn',
    'consumerInfo.dateOfBirth',
    'consumerInfo.currentAddress',
    'disputeItems',
    'footer.signature'
  ]

  /**
   * Validate EOSCAR letter compliance
   */
  static async validateCompliance(letter: EOSCARLetter): Promise<ComplianceStatus> {
    const issues: string[] = []
    const warnings: string[] = []

    // Validate required fields
    this.requiredFields.forEach(field => {
      if (!this.getNestedValue(letter, field)) {
        issues.push(`Missing required field: ${field}`)
      }
    })

    // Validate dispute items
    letter.disputeItems.forEach((item, index) => {
      const itemIssues = this.validateDisputeItem(item, index + 1)
      issues.push(...itemIssues.issues)
      warnings.push(...itemIssues.warnings)
    })

    // Validate consumer information
    const consumerIssues = this.validateConsumerInfo(letter.consumerInfo)
    issues.push(...consumerIssues.issues)
    warnings.push(...consumerIssues.warnings)

    // Validate format compliance
    const formatIssues = this.validateFormat(letter.rawContent)
    issues.push(...formatIssues.issues)
    warnings.push(...formatIssues.warnings)

    const complianceScore = Math.max(0, 100 - (issues.length * 15) - (warnings.length * 3))

    return {
      isCompliant: issues.length === 0,
      complianceScore,
      issues,
      warnings,
      validatedAt: new Date(),
      validatedBy: 'EOSCARValidator'
    }
  }

  /**
   * Validate dispute item
   */
  private static validateDisputeItem(
    item: EOSCARDisputeItem,
    itemNumber: number
  ): { issues: string[]; warnings: string[] } {
    const issues: string[] = []
    const warnings: string[] = []

    if (!item.creditorName || item.creditorName.length < 2) {
      issues.push(`Item ${itemNumber}: Creditor name is required and must be at least 2 characters`)
    }

    if (!item.accountNumber || item.accountNumber.length < 4) {
      issues.push(`Item ${itemNumber}: Account number is required and must be at least 4 characters`)
    }

    if (!ReasonCodeMapper.isValidReasonCode(item.disputeReasonCode)) {
      issues.push(`Item ${itemNumber}: Invalid dispute reason code`)
    }

    if (!item.disputeDescription || item.disputeDescription.length < 10) {
      warnings.push(`Item ${itemNumber}: Dispute description should be more detailed`)
    }

    if (!Object.values(EOSCARAction).includes(item.requestedAction)) {
      issues.push(`Item ${itemNumber}: Invalid requested action`)
    }

    return { issues, warnings }
  }

  /**
   * Validate consumer information
   */
  private static validateConsumerInfo(
    consumerInfo: EOSCARConsumerInfo
  ): { issues: string[]; warnings: string[] } {
    const issues: string[] = []
    const warnings: string[] = []

    // Validate SSN format
    if (!consumerInfo.ssn.match(/^\d{3}-\d{2}-\d{4}$/)) {
      issues.push('SSN must be in format XXX-XX-XXXX')
    }

    // Validate name fields
    if (!consumerInfo.firstName || consumerInfo.firstName.length < 1) {
      issues.push('First name is required')
    }

    if (!consumerInfo.lastName || consumerInfo.lastName.length < 1) {
      issues.push('Last name is required')
    }

    // Validate address
    if (!consumerInfo.currentAddress) {
      issues.push('Current address is required')
    } else {
      if (!consumerInfo.currentAddress.street) {
        issues.push('Street address is required')
      }
      if (!consumerInfo.currentAddress.city) {
        issues.push('City is required')
      }
      if (!consumerInfo.currentAddress.state) {
        issues.push('State is required')
      }
      if (!consumerInfo.currentAddress.zipCode.match(/^\d{5}(-\d{4})?$/)) {
        warnings.push('ZIP code format may be invalid')
      }
    }

    // Validate phone numbers
    if (!consumerInfo.phoneNumbers || consumerInfo.phoneNumbers.length === 0) {
      warnings.push('At least one phone number is recommended')
    }

    return { issues, warnings }
  }

  /**
   * Validate format compliance
   */
  private static validateFormat(content: string): { issues: string[]; warnings: string[] } {
    const issues: string[] = []
    const warnings: string[] = []

    const requiredSections = [
      'TRANSMISSION HEADER',
      'CONSUMER INFORMATION',
      'DISPUTE ITEMS',
      'LEGAL NOTICES',
      'SIGNATURE'
    ]

    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        issues.push(`Missing required section: ${section}`)
      }
    })

    if (content.length < 500) {
      warnings.push('Letter content may be too brief')
    }

    if (content.length > 10000) {
      warnings.push('Letter content may be too lengthy')
    }

    return { issues, warnings }
  }

  /**
   * Get nested object value by dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
}