/**
 * EOSCAR Compliance Validator
 * 
 * Validates EOSCAR format compliance for dispute letters and ensures
 * all required fields and formatting meet bureau specifications.
 */

import { 
  EOSCARLetter,
  EOSCARHeader,
  EOSCARConsumerInfo,
  EOSCARDisputeItem,
  EOSCARReasonCode,
  EOSCARAction,
  EOSCARItemType,
  ComplianceStatus,
  ValidationIssue
} from '@/types/enhanced-credit'

export interface EOSCARComplianceResult {
  isCompliant: boolean
  complianceScore: number
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  sectionCompliance: {
    header: number
    consumerInfo: number
    disputeItems: number
    supportingDocs: number
    footer: number
  }
  requiredFieldsCompliance: number
  formatCompliance: number
  bureauSpecificCompliance: { [bureau: string]: number }
  issues: ValidationIssue[]
  warnings: string[]
  recommendations: string[]
  validatedAt: Date
}

export interface EOSCARFieldRequirement {
  field: string
  required: boolean
  format?: RegExp | string
  maxLength?: number
  minLength?: number
  validValues?: string[]
  description: string
  bureauSpecific?: {
    experian?: boolean
    equifax?: boolean
    transunion?: boolean
  }
}

export class EOSCARComplianceValidator {
  private readonly COMPLIANCE_THRESHOLDS = {
    EXCELLENT: 95, // Grade A
    GOOD: 85,      // Grade B
    FAIR: 75,      // Grade C
    POOR: 65,      // Grade D
    FAILING: 0     // Grade F
  }

  private readonly HEADER_REQUIREMENTS: EOSCARFieldRequirement[] = [
    {
      field: 'transmissionId',
      required: true,
      format: /^[A-Z0-9]{8,16}$/,
      description: 'Unique transmission identifier',
      minLength: 8,
      maxLength: 16
    },
    {
      field: 'submissionDate',
      required: true,
      description: 'Date of submission in ISO format'
    },
    {
      field: 'submitterInfo.name',
      required: true,
      minLength: 2,
      maxLength: 100,
      description: 'Submitter full name'
    },
    {
      field: 'submitterInfo.address',
      required: true,
      minLength: 10,
      maxLength: 200,
      description: 'Submitter complete address'
    },
    {
      field: 'bureauDestination',
      required: true,
      validValues: ['experian', 'equifax', 'transunion'],
      description: 'Target credit bureau'
    },
    {
      field: 'formatVersion',
      required: true,
      format: /^\d+\.\d+$/,
      description: 'EOSCAR format version'
    }
  ]

  private readonly CONSUMER_INFO_REQUIREMENTS: EOSCARFieldRequirement[] = [
    {
      field: 'firstName',
      required: true,
      minLength: 1,
      maxLength: 50,
      format: /^[A-Za-z\s\-'\.]+$/,
      description: 'Consumer first name'
    },
    {
      field: 'lastName',
      required: true,
      minLength: 1,
      maxLength: 50,
      format: /^[A-Za-z\s\-'\.]+$/,
      description: 'Consumer last name'
    },
    {
      field: 'ssn',
      required: true,
      format: /^\d{3}-?\d{2}-?\d{4}$/,
      description: 'Social Security Number'
    },
    {
      field: 'dateOfBirth',
      required: true,
      description: 'Date of birth in ISO format'
    },
    {
      field: 'currentAddress.street',
      required: true,
      minLength: 5,
      maxLength: 100,
      description: 'Current street address'
    },
    {
      field: 'currentAddress.city',
      required: true,
      minLength: 2,
      maxLength: 50,
      description: 'Current city'
    },
    {
      field: 'currentAddress.state',
      required: true,
      format: /^[A-Z]{2}$/,
      description: 'Current state (2-letter code)'
    },
    {
      field: 'currentAddress.zipCode',
      required: true,
      format: /^\d{5}(-\d{4})?$/,
      description: 'Current ZIP code'
    },
    {
      field: 'phoneNumbers',
      required: true,
      description: 'At least one phone number required'
    }
  ]

  private readonly DISPUTE_ITEM_REQUIREMENTS: EOSCARFieldRequirement[] = [
    {
      field: 'sequenceNumber',
      required: true,
      description: 'Sequential item number'
    },
    {
      field: 'itemType',
      required: true,
      validValues: Object.values(EOSCARItemType),
      description: 'Type of disputed item'
    },
    {
      field: 'creditorName',
      required: true,
      minLength: 2,
      maxLength: 100,
      description: 'Creditor or furnisher name'
    },
    {
      field: 'accountNumber',
      required: true,
      minLength: 4,
      maxLength: 50,
      description: 'Account number or identifier'
    },
    {
      field: 'disputeReasonCode',
      required: true,
      validValues: Object.values(EOSCARReasonCode),
      description: 'Standardized dispute reason code'
    },
    {
      field: 'disputeDescription',
      required: true,
      minLength: 10,
      maxLength: 500,
      description: 'Detailed dispute description'
    },
    {
      field: 'requestedAction',
      required: true,
      validValues: Object.values(EOSCARAction),
      description: 'Requested action for the item'
    }
  ]

  private readonly BUREAU_SPECIFIC_REQUIREMENTS = {
    experian: {
      maxDisputeItems: 10,
      requiresCreditorCode: true,
      supportedReasonCodes: Object.values(EOSCARReasonCode),
      additionalFields: ['originalBalance', 'currentBalance']
    },
    equifax: {
      maxDisputeItems: 8,
      requiresCreditorCode: false,
      supportedReasonCodes: Object.values(EOSCARReasonCode).filter(code => 
        code !== EOSCARReasonCode.VALIDATION_REQUEST
      ),
      additionalFields: ['dateOpened', 'dateReported']
    },
    transunion: {
      maxDisputeItems: 12,
      requiresCreditorCode: true,
      supportedReasonCodes: Object.values(EOSCARReasonCode),
      additionalFields: ['dateOfFirstDelinquency']
    }
  }

  /**
   * Validate complete EOSCAR letter compliance
   */
  async validateEOSCARCompliance(letter: EOSCARLetter): Promise<EOSCARComplianceResult> {
    const issues: ValidationIssue[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // Validate each section
    const headerCompliance = await this.validateHeader(letter.header, issues, warnings)
    const consumerInfoCompliance = await this.validateConsumerInfo(letter.consumerInfo, issues, warnings)
    const disputeItemsCompliance = await this.validateDisputeItems(letter.disputeItems, issues, warnings)
    const supportingDocsCompliance = await this.validateSupportingDocs(letter.supportingDocs, issues, warnings)
    const footerCompliance = await this.validateFooter(letter.footer, issues, warnings)

    const sectionCompliance = {
      header: headerCompliance,
      consumerInfo: consumerInfoCompliance,
      disputeItems: disputeItemsCompliance,
      supportingDocs: supportingDocsCompliance,
      footer: footerCompliance
    }

    // Validate required fields compliance
    const requiredFieldsCompliance = await this.validateRequiredFields(letter, issues)

    // Validate format compliance
    const formatCompliance = await this.validateFormatCompliance(letter, issues, warnings)

    // Validate bureau-specific compliance
    const bureauSpecificCompliance = await this.validateBureauSpecificRequirements(letter, issues, warnings)

    // Calculate overall compliance score
    const complianceScore = this.calculateComplianceScore(
      sectionCompliance,
      requiredFieldsCompliance,
      formatCompliance,
      bureauSpecificCompliance
    )

    // Determine compliance grade
    const overallGrade = this.determineComplianceGrade(complianceScore)
    const isCompliant = complianceScore >= this.COMPLIANCE_THRESHOLDS.FAIR

    // Generate recommendations
    this.generateComplianceRecommendations(
      complianceScore,
      sectionCompliance,
      issues,
      warnings,
      recommendations
    )

    return {
      isCompliant,
      complianceScore,
      overallGrade,
      sectionCompliance,
      requiredFieldsCompliance,
      formatCompliance,
      bureauSpecificCompliance,
      issues,
      warnings,
      recommendations,
      validatedAt: new Date()
    }
  }

  /**
   * Validate EOSCAR header compliance
   */
  private async validateHeader(
    header: EOSCARHeader,
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<number> {
    let complianceScore = 100
    let validFields = 0
    const totalFields = this.HEADER_REQUIREMENTS.length

    for (const requirement of this.HEADER_REQUIREMENTS) {
      const fieldValue = this.getNestedFieldValue(header, requirement.field)
      const isValid = this.validateField(fieldValue, requirement, 'header', issues)
      
      if (isValid) {
        validFields++
      } else {
        complianceScore -= Math.floor(100 / totalFields)
      }
    }

    // Additional header validations
    if (header.submissionDate) {
      const submissionDate = new Date(header.submissionDate)
      const currentDate = new Date()
      
      if (submissionDate > currentDate) {
        complianceScore -= 10
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: 'Header submission date cannot be in the future',
          severity: 'high',
          field: 'header.submissionDate',
          suggestion: 'Use current or past date for submission'
        })
      }
    }

    // Check record count consistency
    if (header.recordCount !== undefined && header.recordCount <= 0) {
      complianceScore -= 5
      warnings.push('Header record count should be greater than zero')
    }

    return Math.max(0, complianceScore)
  }

  /**
   * Validate consumer information compliance
   */
  private async validateConsumerInfo(
    consumerInfo: EOSCARConsumerInfo,
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<number> {
    let complianceScore = 100
    let validFields = 0
    const totalFields = this.CONSUMER_INFO_REQUIREMENTS.length

    for (const requirement of this.CONSUMER_INFO_REQUIREMENTS) {
      const fieldValue = this.getNestedFieldValue(consumerInfo, requirement.field)
      const isValid = this.validateField(fieldValue, requirement, 'consumerInfo', issues)
      
      if (isValid) {
        validFields++
      } else {
        complianceScore -= Math.floor(100 / totalFields)
      }
    }

    // Additional consumer info validations
    if (consumerInfo.dateOfBirth) {
      const birthDate = new Date(consumerInfo.dateOfBirth)
      const currentDate = new Date()
      const age = currentDate.getFullYear() - birthDate.getFullYear()
      
      if (age < 18 || age > 120) {
        complianceScore -= 10
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: 'Consumer age appears invalid (must be 18-120)',
          severity: 'high',
          field: 'consumerInfo.dateOfBirth',
          suggestion: 'Verify date of birth accuracy'
        })
      }
    }

    // Validate phone numbers
    if (consumerInfo.phoneNumbers && consumerInfo.phoneNumbers.length > 0) {
      let validPhones = 0
      for (const phone of consumerInfo.phoneNumbers) {
        const phonePattern = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
        if (phonePattern.test(phone.number)) {
          validPhones++
        }
      }
      
      if (validPhones === 0) {
        complianceScore -= 15
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: 'No valid phone numbers found',
          severity: 'high',
          field: 'consumerInfo.phoneNumbers',
          suggestion: 'Provide at least one valid phone number'
        })
      }
    }

    // Check for previous addresses if current address is recent
    if (consumerInfo.currentAddress?.dateRange?.from) {
      const addressDate = new Date(consumerInfo.currentAddress.dateRange.from)
      const monthsSinceAddress = Math.floor((Date.now() - addressDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      
      if (monthsSinceAddress < 24 && (!consumerInfo.previousAddresses || consumerInfo.previousAddresses.length === 0)) {
        warnings.push('Consider providing previous addresses for recent current address')
      }
    }

    return Math.max(0, complianceScore)
  }

  /**
   * Validate dispute items compliance
   */
  private async validateDisputeItems(
    disputeItems: EOSCARDisputeItem[],
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<number> {
    if (!disputeItems || disputeItems.length === 0) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'No dispute items found in EOSCAR letter',
        severity: 'high',
        field: 'disputeItems',
        suggestion: 'Include at least one dispute item'
      })
      return 0
    }

    let totalComplianceScore = 0
    let validItems = 0

    for (let i = 0; i < disputeItems.length; i++) {
      const item = disputeItems[i]
      let itemComplianceScore = 100
      let validItemFields = 0
      const totalItemFields = this.DISPUTE_ITEM_REQUIREMENTS.length

      // Validate sequence number
      if (item.sequenceNumber !== i + 1) {
        itemComplianceScore -= 10
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Dispute item ${i + 1}: Incorrect sequence number`,
          severity: 'medium',
          field: `disputeItems[${i}].sequenceNumber`,
          suggestion: 'Ensure sequence numbers are consecutive starting from 1'
        })
      }

      // Validate each required field
      for (const requirement of this.DISPUTE_ITEM_REQUIREMENTS) {
        const fieldValue = this.getNestedFieldValue(item, requirement.field)
        const isValid = this.validateField(fieldValue, requirement, `disputeItems[${i}]`, issues)
        
        if (isValid) {
          validItemFields++
        } else {
          itemComplianceScore -= Math.floor(100 / totalItemFields)
        }
      }

      // Validate reason code and action compatibility
      if (item.disputeReasonCode && item.requestedAction) {
        if (!this.isReasonCodeActionCompatible(item.disputeReasonCode, item.requestedAction)) {
          itemComplianceScore -= 15
          issues.push({
            type: 'warning',
            category: 'consistency',
            message: `Dispute item ${i + 1}: Reason code and requested action may be incompatible`,
            severity: 'medium',
            field: `disputeItems[${i}]`,
            suggestion: 'Review reason code and action compatibility'
          })
        }
      }

      // Validate supporting documents references
      if (item.supportingDocuments && item.supportingDocuments.length > 0) {
        for (const docRef of item.supportingDocuments) {
          if (!docRef || docRef.trim().length === 0) {
            itemComplianceScore -= 5
            warnings.push(`Dispute item ${i + 1}: Empty supporting document reference`)
          }
        }
      }

      // Validate amounts if present
      if (item.originalBalance !== undefined && item.currentBalance !== undefined) {
        if (item.originalBalance < 0 || item.currentBalance < 0) {
          itemComplianceScore -= 10
          issues.push({
            type: 'error',
            category: 'data_quality',
            message: `Dispute item ${i + 1}: Negative balance amounts not allowed`,
            severity: 'medium',
            field: `disputeItems[${i}]`,
            suggestion: 'Ensure balance amounts are non-negative'
          })
        }
      }

      totalComplianceScore += Math.max(0, itemComplianceScore)
      if (itemComplianceScore >= 70) {
        validItems++
      }
    }

    // Check for duplicate items
    const itemSignatures = new Set()
    for (let i = 0; i < disputeItems.length; i++) {
      const item = disputeItems[i]
      const signature = `${item.creditorName}-${item.accountNumber}-${item.disputeReasonCode}`
      
      if (itemSignatures.has(signature)) {
        totalComplianceScore -= 20
        issues.push({
          type: 'warning',
          category: 'consistency',
          message: `Potential duplicate dispute item detected: ${item.creditorName}`,
          severity: 'medium',
          field: `disputeItems[${i}]`,
          suggestion: 'Review for duplicate dispute items'
        })
      } else {
        itemSignatures.add(signature)
      }
    }

    return disputeItems.length > 0 ? Math.round(totalComplianceScore / disputeItems.length) : 0
  }

  /**
   * Validate supporting documents compliance
   */
  private async validateSupportingDocs(
    supportingDocs: any[],
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<number> {
    if (!supportingDocs || supportingDocs.length === 0) {
      warnings.push('No supporting documents provided - may reduce dispute effectiveness')
      return 80 // Reduced score but not failing
    }

    let complianceScore = 100
    let validDocs = 0

    for (let i = 0; i < supportingDocs.length; i++) {
      const doc = supportingDocs[i]
      let docScore = 100

      // Validate required fields
      if (!doc.id || doc.id.trim().length === 0) {
        docScore -= 25
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Supporting document ${i + 1}: Missing document ID`,
          severity: 'high',
          field: `supportingDocs[${i}].id`,
          suggestion: 'Provide unique ID for each supporting document'
        })
      }

      if (!doc.fileName || doc.fileName.trim().length === 0) {
        docScore -= 25
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Supporting document ${i + 1}: Missing file name`,
          severity: 'high',
          field: `supportingDocs[${i}].fileName`,
          suggestion: 'Provide file name for each supporting document'
        })
      }

      if (!doc.fileType || doc.fileType.trim().length === 0) {
        docScore -= 20
        issues.push({
          type: 'warning',
          category: 'completeness',
          message: `Supporting document ${i + 1}: Missing file type`,
          severity: 'medium',
          field: `supportingDocs[${i}].fileType`,
          suggestion: 'Specify file type (PDF, JPG, etc.)'
        })
      }

      if (!doc.description || doc.description.trim().length < 10) {
        docScore -= 15
        issues.push({
          type: 'warning',
          category: 'completeness',
          message: `Supporting document ${i + 1}: Missing or insufficient description`,
          severity: 'medium',
          field: `supportingDocs[${i}].description`,
          suggestion: 'Provide detailed description of document contents'
        })
      }

      // Validate related dispute items
      if (!doc.relatedDisputeItems || doc.relatedDisputeItems.length === 0) {
        docScore -= 10
        warnings.push(`Supporting document ${i + 1}: No related dispute items specified`)
      }

      if (docScore >= 70) {
        validDocs++
      }
      complianceScore = Math.min(complianceScore, docScore)
    }

    return Math.max(0, complianceScore)
  }

  /**
   * Validate footer compliance
   */
  private async validateFooter(
    footer: any,
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<number> {
    let complianceScore = 100

    if (!footer) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'EOSCAR footer is missing',
        severity: 'high',
        field: 'footer',
        suggestion: 'Include complete EOSCAR footer section'
      })
      return 0
    }

    // Validate total items count
    if (footer.totalItems === undefined || footer.totalItems <= 0) {
      complianceScore -= 20
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: 'Footer: Invalid total items count',
        severity: 'high',
        field: 'footer.totalItems',
        suggestion: 'Provide accurate count of dispute items'
      })
    }

    // Validate submission date
    if (!footer.submissionDate) {
      complianceScore -= 15
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Footer: Missing submission date',
        severity: 'high',
        field: 'footer.submissionDate',
        suggestion: 'Include submission date in footer'
      })
    }

    // Validate expected response date
    if (!footer.expectedResponseDate) {
      complianceScore -= 10
      warnings.push('Footer: Expected response date not specified')
    } else {
      const expectedDate = new Date(footer.expectedResponseDate)
      const submissionDate = new Date(footer.submissionDate)
      const daysDiff = Math.floor((expectedDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff < 30 || daysDiff > 35) {
        complianceScore -= 5
        warnings.push('Footer: Expected response date should be 30-35 days from submission')
      }
    }

    // Validate contact information
    if (!footer.contactInfo) {
      complianceScore -= 15
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Footer: Missing contact information',
        severity: 'high',
        field: 'footer.contactInfo',
        suggestion: 'Include complete contact information in footer'
      })
    }

    // Validate signature
    if (!footer.signature) {
      complianceScore -= 20
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Footer: Missing signature information',
        severity: 'high',
        field: 'footer.signature',
        suggestion: 'Include signature section in footer'
      })
    } else {
      if (!footer.signature.signerName) {
        complianceScore -= 10
        issues.push({
          type: 'error',
          category: 'completeness',
          message: 'Footer: Missing signer name',
          severity: 'medium',
          field: 'footer.signature.signerName',
          suggestion: 'Include signer name in signature section'
        })
      }

      if (!footer.signature.signatureDate) {
        complianceScore -= 10
        issues.push({
          type: 'error',
          category: 'completeness',
          message: 'Footer: Missing signature date',
          severity: 'medium',
          field: 'footer.signature.signatureDate',
          suggestion: 'Include signature date'
        })
      }
    }

    return Math.max(0, complianceScore)
  }

  /**
   * Validate required fields compliance
   */
  private async validateRequiredFields(
    letter: EOSCARLetter,
    issues: ValidationIssue[]
  ): Promise<number> {
    const requiredSections = ['header', 'consumerInfo', 'disputeItems', 'footer']
    let complianceScore = 100
    let validSections = 0

    for (const section of requiredSections) {
      if ((letter as any)[section]) {
        validSections++
      } else {
        complianceScore -= 25
        issues.push({
          type: 'error',
          category: 'completeness',
          message: `Required EOSCAR section missing: ${section}`,
          severity: 'high',
          field: section,
          suggestion: `Include ${section} section in EOSCAR letter`
        })
      }
    }

    return complianceScore
  }

  /**
   * Validate format compliance
   */
  private async validateFormatCompliance(
    letter: EOSCARLetter,
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<number> {
    let complianceScore = 100

    // Validate EOSCAR version
    if (!letter.header?.formatVersion || !letter.header.formatVersion.match(/^\d+\.\d+$/)) {
      complianceScore -= 15
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: 'Invalid or missing EOSCAR format version',
        severity: 'high',
        field: 'header.formatVersion',
        suggestion: 'Use valid EOSCAR format version (e.g., "2.1")'
      })
    }

    // Validate raw content format if available
    if (letter.rawContent) {
      if (!letter.rawContent.includes('EOSCAR')) {
        complianceScore -= 10
        warnings.push('Raw content may not be in proper EOSCAR format')
      }
    }

    // Validate compliance status
    if (letter.complianceStatus && !letter.complianceStatus.isCompliant) {
      complianceScore -= 20
      warnings.push('Letter marked as non-compliant in compliance status')
    }

    return Math.max(0, complianceScore)
  }

  /**
   * Validate bureau-specific requirements
   */
  private async validateBureauSpecificRequirements(
    letter: EOSCARLetter,
    issues: ValidationIssue[],
    warnings: string[]
  ): Promise<{ [bureau: string]: number }> {
    const bureauCompliance: { [bureau: string]: number } = {}
    const targetBureau = letter.bureau || letter.header?.bureauDestination

    if (!targetBureau) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Target bureau not specified',
        severity: 'high',
        field: 'bureau',
        suggestion: 'Specify target credit bureau'
      })
      return { unknown: 0 }
    }

    const bureauReqs = this.BUREAU_SPECIFIC_REQUIREMENTS[targetBureau as keyof typeof this.BUREAU_SPECIFIC_REQUIREMENTS]
    if (!bureauReqs) {
      warnings.push(`Unknown bureau requirements for: ${targetBureau}`)
      return { [targetBureau]: 80 }
    }

    let complianceScore = 100

    // Check maximum dispute items
    if (letter.disputeItems.length > bureauReqs.maxDisputeItems) {
      complianceScore -= 20
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: `Too many dispute items for ${targetBureau} (max: ${bureauReqs.maxDisputeItems})`,
        severity: 'high',
        field: 'disputeItems',
        suggestion: `Reduce dispute items to ${bureauReqs.maxDisputeItems} or fewer`
      })
    }

    // Check creditor code requirements
    if (bureauReqs.requiresCreditorCode) {
      const itemsWithoutCreditorCode = letter.disputeItems.filter(item => !item.creditorCode)
      if (itemsWithoutCreditorCode.length > 0) {
        complianceScore -= 15
        issues.push({
          type: 'warning',
          category: 'completeness',
          message: `${targetBureau} requires creditor codes for all items`,
          severity: 'medium',
          field: 'disputeItems',
          suggestion: 'Include creditor codes for all dispute items'
        })
      }
    }

    // Check supported reason codes
    for (const item of letter.disputeItems) {
      if (!bureauReqs.supportedReasonCodes.includes(item.disputeReasonCode as any)) {
        complianceScore -= 10
        issues.push({
          type: 'warning',
          category: 'data_quality',
          message: `Reason code ${item.disputeReasonCode} may not be supported by ${targetBureau}`,
          severity: 'medium',
          field: `disputeItems[${item.sequenceNumber}].disputeReasonCode`,
          suggestion: `Use reason codes supported by ${targetBureau}`
        })
      }
    }

    bureauCompliance[targetBureau] = Math.max(0, complianceScore)
    return bureauCompliance
  }

  /**
   * Calculate overall compliance score
   */
  private calculateComplianceScore(
    sectionCompliance: any,
    requiredFieldsCompliance: number,
    formatCompliance: number,
    bureauSpecificCompliance: { [bureau: string]: number }
  ): number {
    const weights = {
      sections: 0.40,
      requiredFields: 0.25,
      format: 0.20,
      bureauSpecific: 0.15
    }

    // Calculate section average
    const sectionScores = Object.values(sectionCompliance) as number[]
    const sectionAverage = sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length

    // Calculate bureau specific average
    const bureauScores = Object.values(bureauSpecificCompliance) as number[]
    const bureauAverage = bureauScores.length > 0 
      ? bureauScores.reduce((sum, score) => sum + score, 0) / bureauScores.length 
      : 100

    return Math.round(
      (sectionAverage * weights.sections) +
      (requiredFieldsCompliance * weights.requiredFields) +
      (formatCompliance * weights.format) +
      (bureauAverage * weights.bureauSpecific)
    )
  }

  /**
   * Determine compliance grade based on score
   */
  private determineComplianceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= this.COMPLIANCE_THRESHOLDS.EXCELLENT) return 'A'
    if (score >= this.COMPLIANCE_THRESHOLDS.GOOD) return 'B'
    if (score >= this.COMPLIANCE_THRESHOLDS.FAIR) return 'C'
    if (score >= this.COMPLIANCE_THRESHOLDS.POOR) return 'D'
    return 'F'
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    complianceScore: number,
    sectionCompliance: any,
    issues: ValidationIssue[],
    warnings: string[],
    recommendations: string[]
  ): void {
    // Overall recommendations
    if (complianceScore >= this.COMPLIANCE_THRESHOLDS.EXCELLENT) {
      recommendations.push('Excellent EOSCAR compliance - letter ready for submission')
    } else if (complianceScore >= this.COMPLIANCE_THRESHOLDS.GOOD) {
      recommendations.push('Good EOSCAR compliance - minor improvements recommended')
    } else if (complianceScore >= this.COMPLIANCE_THRESHOLDS.FAIR) {
      recommendations.push('Fair EOSCAR compliance - address identified issues before submission')
    } else {
      recommendations.push('Poor EOSCAR compliance - significant improvements required')
    }

    // Section-specific recommendations
    if (sectionCompliance.header < 80) {
      recommendations.push('Improve EOSCAR header compliance')
    }
    if (sectionCompliance.consumerInfo < 80) {
      recommendations.push('Complete consumer information section')
    }
    if (sectionCompliance.disputeItems < 80) {
      recommendations.push('Enhance dispute items formatting and content')
    }
    if (sectionCompliance.footer < 80) {
      recommendations.push('Complete EOSCAR footer section')
    }

    // Issue-based recommendations
    const highPriorityIssues = issues.filter(issue => issue.severity === 'high')
    if (highPriorityIssues.length > 0) {
      recommendations.push(`CRITICAL: Fix ${highPriorityIssues.length} high-priority compliance issues`)
    }

    const mediumPriorityIssues = issues.filter(issue => issue.severity === 'medium')
    if (mediumPriorityIssues.length > 2) {
      recommendations.push(`Address ${mediumPriorityIssues.length} medium-priority compliance issues`)
    }

    // Warning-based recommendations
    if (warnings.length > 3) {
      recommendations.push('Review and address compliance warnings for optimal results')
    }
  }

  /**
   * Validate individual field against requirements
   */
  private validateField(
    value: any,
    requirement: EOSCARFieldRequirement,
    context: string,
    issues: ValidationIssue[]
  ): boolean {
    const fieldPath = `${context}.${requirement.field}`

    // Check if required field is present
    if (requirement.required && (value === undefined || value === null || value === '')) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: `Required field missing: ${requirement.description}`,
        severity: 'high',
        field: fieldPath,
        suggestion: `Provide ${requirement.description}`
      })
      return false
    }

    // Skip further validation if field is not present and not required
    if (!requirement.required && (value === undefined || value === null || value === '')) {
      return true
    }

    let isValid = true

    // Validate format
    if (requirement.format && typeof value === 'string') {
      const formatRegex = typeof requirement.format === 'string' 
        ? new RegExp(requirement.format) 
        : requirement.format
      
      if (!formatRegex.test(value)) {
        isValid = false
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `Invalid format for ${requirement.description}`,
          severity: 'medium',
          field: fieldPath,
          suggestion: `Ensure ${requirement.description} matches required format`
        })
      }
    }

    // Validate length
    if (typeof value === 'string') {
      if (requirement.minLength && value.length < requirement.minLength) {
        isValid = false
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `${requirement.description} too short (min: ${requirement.minLength})`,
          severity: 'medium',
          field: fieldPath,
          suggestion: `Ensure ${requirement.description} is at least ${requirement.minLength} characters`
        })
      }

      if (requirement.maxLength && value.length > requirement.maxLength) {
        isValid = false
        issues.push({
          type: 'error',
          category: 'data_quality',
          message: `${requirement.description} too long (max: ${requirement.maxLength})`,
          severity: 'medium',
          field: fieldPath,
          suggestion: `Ensure ${requirement.description} is no more than ${requirement.maxLength} characters`
        })
      }
    }

    // Validate valid values
    if (requirement.validValues && !requirement.validValues.includes(value)) {
      isValid = false
      issues.push({
        type: 'error',
        category: 'data_quality',
        message: `Invalid value for ${requirement.description}`,
        severity: 'medium',
        field: fieldPath,
        suggestion: `Use one of: ${requirement.validValues.join(', ')}`
      })
    }

    return isValid
  }

  /**
   * Check if reason code and action are compatible
   */
  private isReasonCodeActionCompatible(reasonCode: EOSCARReasonCode, action: EOSCARAction): boolean {
    const compatibilityMap: { [key in EOSCARReasonCode]: EOSCARAction[] } = {
      [EOSCARReasonCode.NOT_MINE]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.INACCURATE_BALANCE]: [EOSCARAction.UPDATE, EOSCARAction.CORRECT],
      [EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY]: [EOSCARAction.UPDATE, EOSCARAction.CORRECT],
      [EOSCARReasonCode.ACCOUNT_CLOSED]: [EOSCARAction.UPDATE, EOSCARAction.CORRECT],
      [EOSCARReasonCode.PAID_IN_FULL]: [EOSCARAction.UPDATE, EOSCARAction.DELETE],
      [EOSCARReasonCode.SETTLED]: [EOSCARAction.UPDATE, EOSCARAction.CORRECT],
      [EOSCARReasonCode.OUTDATED]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.DUPLICATE]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.IDENTITY_THEFT]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.MIXED_FILE]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.UNAUTHORIZED_INQUIRY]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.INCORRECT_PERSONAL_INFO]: [EOSCARAction.UPDATE, EOSCARAction.CORRECT],
      [EOSCARReasonCode.BANKRUPTCY_DISCHARGED]: [EOSCARAction.UPDATE, EOSCARAction.DELETE],
      [EOSCARReasonCode.STATUTE_OF_LIMITATIONS]: [EOSCARAction.DELETE, EOSCARAction.REMOVE],
      [EOSCARReasonCode.VALIDATION_REQUEST]: [EOSCARAction.VERIFY, EOSCARAction.INVESTIGATE]
    }

    return compatibilityMap[reasonCode]?.includes(action) || false
  }

  /**
   * Get nested field value from object
   */
  private getNestedFieldValue(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, key) => current?.[key], obj)
  }
}

export const eoscarComplianceValidator = new EOSCARComplianceValidator()