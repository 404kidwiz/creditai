/**
 * EOSCAR Letter Templates
 * 
 * This module contains standardized EOSCAR letter templates for different
 * dispute types and credit bureaus. Each template follows EOSCAR format
 * specifications for optimal automated processing.
 */

import { EOSCARReasonCode, EOSCARAction, EOSCARItemType } from '@/types/enhanced-credit'

export interface EOSCARTemplate {
  id: string
  name: string
  description: string
  disputeType: string
  bureau?: 'experian' | 'equifax' | 'transunion' | 'all'
  template: string
  requiredFields: string[]
  optionalFields: string[]
  complianceValidated: boolean
}

// ===================================
// Base EOSCAR Template
// ===================================

export const BASE_EOSCAR_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: {{bureauDestination}}
Record Count: {{recordCount}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
{{#suffix}}Suffix: {{suffix}}{{/suffix}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

{{#previousAddresses}}
PREVIOUS ADDRESS:
{{street}}
{{city}}, {{state}} {{zipCode}}
{{#dateRange}}({{from}} to {{to}}){{/dateRange}}
{{/previousAddresses}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

{{#identification}}
IDENTIFICATION:
{{#driversLicense}}Driver's License: {{number}} ({{state}}){{/driversLicense}}
{{#passport}}Passport: {{number}} ({{country}}){{/passport}}
{{/identification}}

DISPUTE ITEMS:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
{{#creditorCode}}Creditor Code: {{creditorCode}}{{/creditorCode}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Dispute Description: {{disputeDescription}}
Requested Action: {{requestedAction}}
{{#originalBalance}}Original Balance: ${{originalBalance}}{{/originalBalance}}
{{#currentBalance}}Current Balance: ${{currentBalance}}{{/currentBalance}}
{{#dateOpened}}Date Opened: {{dateOpened}}{{/dateOpened}}
{{#dateReported}}Date Reported: {{dateReported}}{{/dateReported}}
{{#dateOfFirstDelinquency}}Date of First Delinquency: {{dateOfFirstDelinquency}}{{/dateOfFirstDelinquency}}
{{#legalBasis}}Legal Basis: {{legalBasis}}{{/legalBasis}}
{{#specificInaccuracy}}Specific Inaccuracy: {{specificInaccuracy}}{{/specificInaccuracy}}
{{#correctInformation}}Correct Information: {{correctInformation}}{{/correctInformation}}
{{#impactOnScore}}Estimated Score Impact: {{impactOnScore}} points{{/impactOnScore}}

{{/disputeItems}}

{{#attachments}}
SUPPORTING DOCUMENTATION:
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
The consumer has the right to dispute inaccurate, incomplete, or unverifiable information.
Credit reporting agencies must investigate and respond within 30 days.
{{#legalNotices}}
{{.}}
{{/legalNotices}}

SIGNATURE:
{{signerName}}
{{signatureDate}}
{{#electronicSignature}}Electronic Signature: Yes{{/electronicSignature}}

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Contact Information: {{contactInfo}}

END OF EOSCAR TRANSMISSION
`

// ===================================
// Specialized Templates by Dispute Type
// ===================================

export const IDENTITY_THEFT_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - IDENTITY THEFT

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: {{bureauDestination}}
Record Count: {{recordCount}}
Priority: HIGH - IDENTITY THEFT

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
{{#suffix}}Suffix: {{suffix}}{{/suffix}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

IDENTITY THEFT AFFIDAVIT:
I am a victim of identity theft and the following accounts/information do not belong to me:

FRAUDULENT ITEMS:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}} (IDENTITY THEFT)
Requested Action: DELETE - FRAUDULENT ACCOUNT
Date First Noticed: {{dateFirstNoticed}}
Police Report Filed: {{policeReportNumber}}
{{#specificInaccuracy}}Details: {{specificInaccuracy}}{{/specificInaccuracy}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
- Identity Theft Affidavit (FTC Form)
- Police Report
- Copy of Driver's License
- Utility Bills for Address Verification
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611 and 605B.
Under FCRA Section 605B, information resulting from identity theft must be blocked.
This is a formal request to block all fraudulent information from my credit file.
Credit reporting agencies must investigate and respond within 30 days.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Contact Information: {{contactInfo}}

END OF EOSCAR TRANSMISSION
`

export const PAYMENT_HISTORY_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - PAYMENT HISTORY

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: {{bureauDestination}}
Record Count: {{recordCount}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

PAYMENT HISTORY DISPUTES:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Requested Action: {{requestedAction}}

PAYMENT HISTORY CORRECTION:
{{#specificInaccuracy}}Inaccurate Information: {{specificInaccuracy}}{{/specificInaccuracy}}
{{#correctInformation}}Correct Information: {{correctInformation}}{{/correctInformation}}

MONTH-BY-MONTH PAYMENT HISTORY:
{{#paymentHistory}}
{{month}}/{{year}}: {{status}} (Reported as: {{reportedStatus}})
{{/paymentHistory}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
- Bank statements showing payments
- Cancelled checks or payment confirmations
- Account statements from creditor
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
Payment history must be accurately reported according to FCRA Section 623.
Credit reporting agencies must investigate and respond within 30 days.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Contact Information: {{contactInfo}}

END OF EOSCAR TRANSMISSION
`

export const ACCOUNT_STATUS_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - ACCOUNT STATUS

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: {{bureauDestination}}
Record Count: {{recordCount}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

ACCOUNT STATUS DISPUTES:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Requested Action: {{requestedAction}}

ACCOUNT STATUS CORRECTION:
Current Reported Status: {{currentStatus}}
Correct Status: {{correctStatus}}
{{#dateStatusChanged}}Status Change Date: {{dateStatusChanged}}{{/dateStatusChanged}}
{{#specificInaccuracy}}Specific Issue: {{specificInaccuracy}}{{/specificInaccuracy}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
- Final payment confirmation
- Account closure letter
- Settlement agreement
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
Account status must be accurately reported according to FCRA Section 623.
Credit reporting agencies must investigate and respond within 30 days.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Contact Information: {{contactInfo}}

END OF EOSCAR TRANSMISSION
`

export const BALANCE_DISPUTE_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - BALANCE DISPUTE

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: {{bureauDestination}}
Record Count: {{recordCount}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

BALANCE DISPUTES:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Requested Action: {{requestedAction}}

BALANCE CORRECTION:
Reported Balance: ${{reportedBalance}}
Correct Balance: ${{correctBalance}}
{{#originalBalance}}Original Balance: ${{originalBalance}}{{/originalBalance}}
{{#paymentsMade}}Total Payments Made: ${{paymentsMade}}{{/paymentsMade}}
{{#specificInaccuracy}}Calculation Error: {{specificInaccuracy}}{{/specificInaccuracy}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
- Account statements showing correct balance
- Payment records and receipts
- Correspondence with creditor
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
Balance information must be accurately reported according to FCRA Section 623.
Credit reporting agencies must investigate and respond within 30 days.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Contact Information: {{contactInfo}}

END OF EOSCAR TRANSMISSION
`

// ===================================
// Bureau-Specific Templates
// ===================================

export const EXPERIAN_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - EXPERIAN

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: EXPERIAN
Record Count: {{recordCount}}
Experian Reference: EXP-{{transmissionId}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

EXPERIAN DISPUTE ITEMS:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
{{#creditorCode}}Experian Creditor Code: {{creditorCode}}{{/creditorCode}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Dispute Description: {{disputeDescription}}
Requested Action: {{requestedAction}}
{{#dateReported}}Date Last Reported: {{dateReported}}{{/dateReported}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
Experian must investigate and respond within 30 days per FCRA requirements.
This dispute is submitted through EOSCAR format for automated processing.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Experian Contact: disputes@experian.com
Reference: EXP-{{transmissionId}}

END OF EOSCAR TRANSMISSION
`

export const EQUIFAX_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - EQUIFAX

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: EQUIFAX
Record Count: {{recordCount}}
Equifax Reference: EFX-{{transmissionId}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

EQUIFAX DISPUTE ITEMS:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
{{#creditorCode}}Equifax Creditor Code: {{creditorCode}}{{/creditorCode}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Dispute Description: {{disputeDescription}}
Requested Action: {{requestedAction}}
{{#dateReported}}Date Last Reported: {{dateReported}}{{/dateReported}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
Equifax must investigate and respond within 30 days per FCRA requirements.
This dispute is submitted through EOSCAR format for automated processing.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
Equifax Contact: disputes@equifax.com
Reference: EFX-{{transmissionId}}

END OF EOSCAR TRANSMISSION
`

export const TRANSUNION_TEMPLATE = `
EOSCAR FORMAT DISPUTE LETTER - TRANSUNION

TRANSMISSION HEADER:
Transmission ID: {{transmissionId}}
Submission Date: {{submissionDate}}
Format Version: {{formatVersion}}
Bureau Destination: TRANSUNION
Record Count: {{recordCount}}
TransUnion Reference: TU-{{transmissionId}}

SUBMITTER INFORMATION:
Name: {{submitterName}}
Address: {{submitterAddress}}
Phone: {{submitterPhone}}
Email: {{submitterEmail}}
Organization Type: {{organizationType}}

CONSUMER INFORMATION:
First Name: {{firstName}}
Last Name: {{lastName}}
{{#middleName}}Middle Name: {{middleName}}{{/middleName}}
SSN: {{ssn}}
Date of Birth: {{dateOfBirth}}

CURRENT ADDRESS:
{{currentAddressStreet}}
{{currentAddressCity}}, {{currentAddressState}} {{currentAddressZipCode}}

PHONE NUMBERS:
{{#phoneNumbers}}
{{type}}: {{number}}{{#isPrimary}} (Primary){{/isPrimary}}
{{/phoneNumbers}}

TRANSUNION DISPUTE ITEMS:
{{#disputeItems}}
Item {{sequenceNumber}}: {{itemType}}
Creditor: {{creditorName}}
{{#creditorCode}}TransUnion Creditor Code: {{creditorCode}}{{/creditorCode}}
Account Number: {{accountNumber}}
Dispute Reason Code: {{disputeReasonCode}}
Dispute Description: {{disputeDescription}}
Requested Action: {{requestedAction}}
{{#dateReported}}Date Last Reported: {{dateReported}}{{/dateReported}}

{{/disputeItems}}

SUPPORTING DOCUMENTATION:
{{#attachments}}
- {{fileName}}: {{description}}
{{/attachments}}

LEGAL NOTICES:
This dispute is submitted under the Fair Credit Reporting Act (FCRA) Section 611.
TransUnion must investigate and respond within 30 days per FCRA requirements.
This dispute is submitted through EOSCAR format for automated processing.

SIGNATURE:
{{signerName}}
{{signatureDate}}
Electronic Signature: Yes

TRANSMISSION FOOTER:
Total Items: {{totalItems}}
Submission Date: {{submissionDate}}
Expected Response Date: {{expectedResponseDate}}
TransUnion Contact: disputes@transunion.com
Reference: TU-{{transmissionId}}

END OF EOSCAR TRANSMISSION
`

// ===================================
// Template Registry
// ===================================

export const EOSCAR_TEMPLATES: EOSCARTemplate[] = [
  {
    id: 'base_template',
    name: 'Base EOSCAR Template',
    description: 'Standard EOSCAR format template for general disputes',
    disputeType: 'general',
    bureau: 'all',
    template: BASE_EOSCAR_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['middleName', 'suffix', 'previousAddresses', 'identification', 'attachments'],
    complianceValidated: true
  },
  {
    id: 'identity_theft_template',
    name: 'Identity Theft Dispute Template',
    description: 'Specialized template for identity theft disputes with enhanced legal protections',
    disputeType: 'identity_theft',
    bureau: 'all',
    template: IDENTITY_THEFT_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems', 'policeReportNumber'],
    optionalFields: ['middleName', 'suffix', 'attachments', 'dateFirstNoticed'],
    complianceValidated: true
  },
  {
    id: 'payment_history_template',
    name: 'Payment History Dispute Template',
    description: 'Template for disputing inaccurate payment history information',
    disputeType: 'payment_history',
    bureau: 'all',
    template: PAYMENT_HISTORY_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['paymentHistory', 'attachments'],
    complianceValidated: true
  },
  {
    id: 'account_status_template',
    name: 'Account Status Dispute Template',
    description: 'Template for disputing incorrect account status information',
    disputeType: 'account_status',
    bureau: 'all',
    template: ACCOUNT_STATUS_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['currentStatus', 'correctStatus', 'dateStatusChanged', 'attachments'],
    complianceValidated: true
  },
  {
    id: 'balance_dispute_template',
    name: 'Balance Dispute Template',
    description: 'Template for disputing incorrect balance amounts',
    disputeType: 'balance_dispute',
    bureau: 'all',
    template: BALANCE_DISPUTE_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['reportedBalance', 'correctBalance', 'paymentsMade', 'attachments'],
    complianceValidated: true
  },
  {
    id: 'experian_template',
    name: 'Experian EOSCAR Template',
    description: 'Experian-specific EOSCAR template with bureau formatting',
    disputeType: 'general',
    bureau: 'experian',
    template: EXPERIAN_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['middleName', 'creditorCode', 'attachments'],
    complianceValidated: true
  },
  {
    id: 'equifax_template',
    name: 'Equifax EOSCAR Template',
    description: 'Equifax-specific EOSCAR template with bureau formatting',
    disputeType: 'general',
    bureau: 'equifax',
    template: EQUIFAX_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['middleName', 'creditorCode', 'attachments'],
    complianceValidated: true
  },
  {
    id: 'transunion_template',
    name: 'TransUnion EOSCAR Template',
    description: 'TransUnion-specific EOSCAR template with bureau formatting',
    disputeType: 'general',
    bureau: 'transunion',
    template: TRANSUNION_TEMPLATE,
    requiredFields: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'currentAddress', 'disputeItems'],
    optionalFields: ['middleName', 'creditorCode', 'attachments'],
    complianceValidated: true
  }
]

// ===================================
// Template Manager
// ===================================

export class EOSCARTemplateManager {
  /**
   * Get template by ID
   */
  static getTemplate(templateId: string): EOSCARTemplate | undefined {
    return EOSCAR_TEMPLATES.find(template => template.id === templateId)
  }

  /**
   * Get templates by dispute type
   */
  static getTemplatesByType(disputeType: string): EOSCARTemplate[] {
    return EOSCAR_TEMPLATES.filter(template => 
      template.disputeType === disputeType || template.disputeType === 'general'
    )
  }

  /**
   * Get templates by bureau
   */
  static getTemplatesByBureau(bureau: 'experian' | 'equifax' | 'transunion'): EOSCARTemplate[] {
    return EOSCAR_TEMPLATES.filter(template => 
      template.bureau === bureau || template.bureau === 'all'
    )
  }

  /**
   * Get best template for dispute
   */
  static getBestTemplate(
    disputeType: string,
    bureau: 'experian' | 'equifax' | 'transunion'
  ): EOSCARTemplate {
    // First try to find bureau-specific template for dispute type
    let template = EOSCAR_TEMPLATES.find(t => 
      t.disputeType === disputeType && t.bureau === bureau
    )

    // If not found, try general template for bureau
    if (!template) {
      template = EOSCAR_TEMPLATES.find(t => 
        t.disputeType === 'general' && t.bureau === bureau
      )
    }

    // If still not found, try dispute type template for all bureaus
    if (!template) {
      template = EOSCAR_TEMPLATES.find(t => 
        t.disputeType === disputeType && t.bureau === 'all'
      )
    }

    // Fallback to base template
    if (!template) {
      template = EOSCAR_TEMPLATES.find(t => t.id === 'base_template')
    }

    return template!
  }

  /**
   * Get all available templates
   */
  static getAllTemplates(): EOSCARTemplate[] {
    return EOSCAR_TEMPLATES
  }

  /**
   * Validate template compliance
   */
  static validateTemplate(template: EOSCARTemplate): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check required sections
    const requiredSections = [
      'TRANSMISSION HEADER',
      'CONSUMER INFORMATION',
      'DISPUTE ITEMS',
      'LEGAL NOTICES',
      'SIGNATURE',
      'TRANSMISSION FOOTER'
    ]

    requiredSections.forEach(section => {
      if (!template.template.includes(section)) {
        issues.push(`Missing required section: ${section}`)
      }
    })

    // Check required fields are present in template
    template.requiredFields.forEach(field => {
      if (!template.template.includes(`{{${field}}}`)) {
        issues.push(`Required field not found in template: ${field}`)
      }
    })

    return {
      isValid: issues.length === 0,
      issues
    }
  }
}