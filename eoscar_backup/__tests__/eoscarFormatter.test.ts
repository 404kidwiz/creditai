/**
 * Unit tests for EOSCARFormatter
 * Tests EOSCAR format compliance and letter generation
 */

import { EOSCARFormatter, EOSCARGenerationRequest, ReasonCodeMapper, EOSCARValidator } from '../eoscarFormatter'
import { EOSCARReasonCode, EOSCARAction, EOSCARItemType } from '@/types/enhanced-credit'

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }),
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: null
      })
    })
  }
}))

describe('EOSCARFormatter', () => {
  let formatter: EOSCARFormatter
  
  const mockGenerationRequest: EOSCARGenerationRequest = {
    consumerInfo: {
      firstName: 'John',
      lastName: 'Doe',
      middleName: 'Michael',
      ssn: '123-45-6789',
      dateOfBirth: new Date('1980-01-15'),
      currentAddress: {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        addressType: 'current'
      },
      phoneNumbers: [{
        number: '555-123-4567',
        type: 'home',
        isPrimary: true
      }]
    },
    disputeItems: [{
      itemType: 'TRADELINE' as EOSCARItemType,
      creditorName: 'Test Bank',
      accountNumber: '1234567890',
      disputeReasonCode: EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY,
      disputeDescription: 'The payment history shows late payments that are inaccurate',
      requestedAction: EOSCARAction.UPDATE,
      originalBalance: 5000,
      currentBalance: 3000,
      dateOpened: new Date('2020-01-01'),
      dateReported: new Date('2024-01-01')
    }],
    submitterInfo: {
      name: 'John Doe',
      organizationType: 'Individual',
      address: {
        street: '123 Main Street',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      },
      phone: '555-123-4567',
      email: 'john.doe@email.com'
    },
    bureau: 'experian',
    options: {
      includeOptionalFields: true,
      validateCompliance: true,
      formatForBureau: true,
      includeSignature: true
    }
  }

  beforeEach(() => {
    formatter = new EOSCARFormatter()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('generateEOSCARLetter', () => {
    it('should generate valid EOSCAR letter', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result).toBeDefined()
      expect(result.header).toBeDefined()
      expect(result.consumerInfo).toBeDefined()
      expect(result.disputeItems).toBeDefined()
      expect(result.footer).toBeDefined()
      expect(result.rawContent).toBeDefined()
      expect(result.complianceStatus).toBeDefined()
    })

    it('should create proper EOSCAR header', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.header).toMatchObject({
        transmissionId: expect.stringMatching(/^EOSCAR-\d+-[A-Z0-9]+$/),
        submissionDate: expect.any(Date),
        submitterInfo: mockGenerationRequest.submitterInfo,
        bureauDestination: 'experian',
        formatVersion: '1.0',
        recordCount: 1
      })
    })

    it('should format consumer information correctly', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.consumerInfo).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Michael',
        ssn: '123-45-6789',
        dateOfBirth: expect.any(Date),
        currentAddress: expect.objectContaining({
          street: '123 Main Street',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345'
        }),
        phoneNumbers: expect.arrayContaining([
          expect.objectContaining({
            number: '(555) 123-4567',
            type: 'home',
            isPrimary: true
          })
        ])
      })
    })

    it('should format dispute items correctly', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.disputeItems).toHaveLength(1)
      expect(result.disputeItems[0]).toMatchObject({
        sequenceNumber: 1,
        itemType: 'TRADELINE',
        creditorName: 'Test Bank',
        accountNumber: '****7890', // Should mask account number
        disputeReasonCode: EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY,
        disputeDescription: 'The payment history shows late payments that are inaccurate',
        requestedAction: EOSCARAction.UPDATE,
        originalBalance: 5000,
        currentBalance: 3000
      })
    })

    it('should create proper footer with legal notices', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.footer).toMatchObject({
        totalItems: 1,
        submissionDate: expect.any(Date),
        expectedResponseDate: expect.any(Date),
        contactInfo: mockGenerationRequest.submitterInfo,
        legalNotices: expect.arrayContaining([
          expect.stringContaining('Fair Credit Reporting Act'),
          expect.stringContaining('30 days')
        ]),
        signature: expect.objectContaining({
          signerName: 'John Doe',
          signatureDate: expect.any(Date),
          electronicSignature: true
        })
      })
    })

    it('should generate raw content with proper formatting', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.rawContent).toBeDefined()
      expect(typeof result.rawContent).toBe('string')
      expect(result.rawContent.length).toBeGreaterThan(100)
      
      // Should contain key sections
      expect(result.rawContent).toContain('TRANSMISSION HEADER')
      expect(result.rawContent).toContain('CONSUMER INFORMATION')
      expect(result.rawContent).toContain('DISPUTE ITEMS')
      expect(result.rawContent).toContain('SIGNATURE')
    })

    it('should validate compliance', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.complianceStatus).toMatchObject({
        isCompliant: expect.any(Boolean),
        complianceScore: expect.any(Number),
        issues: expect.any(Array),
        warnings: expect.any(Array),
        validatedAt: expect.any(Date),
        validatedBy: 'EOSCARFormatter'
      })

      expect(result.complianceStatus.complianceScore).toBeGreaterThanOrEqual(0)
      expect(result.complianceStatus.complianceScore).toBeLessThanOrEqual(100)
    })
  })

  describe('validation', () => {
    it('should validate required fields', async () => {
      const invalidRequest = {
        ...mockGenerationRequest,
        consumerInfo: {
          ...mockGenerationRequest.consumerInfo,
          firstName: '' // Missing required field
        }
      }

      await expect(formatter.generateEOSCARLetter(invalidRequest))
        .rejects.toThrow('EOSCAR validation failed')
    })

    it('should validate SSN format', async () => {
      const invalidRequest = {
        ...mockGenerationRequest,
        consumerInfo: {
          ...mockGenerationRequest.consumerInfo,
          ssn: '123456789' // Invalid format
        }
      }

      await expect(formatter.generateEOSCARLetter(invalidRequest))
        .rejects.toThrow('SSN must be in format XXX-XX-XXXX')
    })

    it('should validate dispute items count', async () => {
      const tooManyItems = Array(51).fill(mockGenerationRequest.disputeItems[0])
      const invalidRequest = {
        ...mockGenerationRequest,
        disputeItems: tooManyItems
      }

      await expect(formatter.generateEOSCARLetter(invalidRequest))
        .rejects.toThrow('Too many dispute items')
    })

    it('should validate name length', async () => {
      const invalidRequest = {
        ...mockGenerationRequest,
        consumerInfo: {
          ...mockGenerationRequest.consumerInfo,
          firstName: 'A'.repeat(51) // Too long
        }
      }

      await expect(formatter.generateEOSCARLetter(invalidRequest))
        .rejects.toThrow('First name must be 1-50 characters')
    })
  })

  describe('phone number formatting', () => {
    it('should format 10-digit phone numbers correctly', async () => {
      const request = {
        ...mockGenerationRequest,
        consumerInfo: {
          ...mockGenerationRequest.consumerInfo,
          phoneNumbers: [{
            number: '5551234567',
            type: 'home' as const,
            isPrimary: true
          }]
        }
      }

      const result = await formatter.generateEOSCARLetter(request)

      expect(result.consumerInfo.phoneNumbers[0].number).toBe('(555) 123-4567')
    })

    it('should handle already formatted phone numbers', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.consumerInfo.phoneNumbers[0].number).toBe('(555) 123-4567')
    })

    it('should handle invalid phone number formats', async () => {
      const request = {
        ...mockGenerationRequest,
        consumerInfo: {
          ...mockGenerationRequest.consumerInfo,
          phoneNumbers: [{
            number: '555-123',
            type: 'home' as const,
            isPrimary: true
          }]
        }
      }

      const result = await formatter.generateEOSCARLetter(request)

      expect(result.consumerInfo.phoneNumbers[0].number).toBe('555-123') // Should return as-is
    })
  })

  describe('account number masking', () => {
    it('should mask account numbers longer than 4 digits', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.disputeItems[0].accountNumber).toBe('****7890')
    })

    it('should not mask account numbers 4 digits or shorter', async () => {
      const request = {
        ...mockGenerationRequest,
        disputeItems: [{
          ...mockGenerationRequest.disputeItems[0],
          accountNumber: '1234'
        }]
      }

      const result = await formatter.generateEOSCARLetter(request)

      expect(result.disputeItems[0].accountNumber).toBe('1234')
    })
  })

  describe('bureau-specific formatting', () => {
    it('should format for Experian', async () => {
      const request = { ...mockGenerationRequest, bureau: 'experian' as const }
      const result = await formatter.generateEOSCARLetter(request)

      expect(result.bureau).toBe('experian')
      expect(result.header.bureauDestination).toBe('experian')
    })

    it('should format for Equifax', async () => {
      const request = { ...mockGenerationRequest, bureau: 'equifax' as const }
      const result = await formatter.generateEOSCARLetter(request)

      expect(result.bureau).toBe('equifax')
      expect(result.header.bureauDestination).toBe('equifax')
    })

    it('should format for TransUnion', async () => {
      const request = { ...mockGenerationRequest, bureau: 'transunion' as const }
      const result = await formatter.generateEOSCARLetter(request)

      expect(result.bureau).toBe('transunion')
      expect(result.header.bureauDestination).toBe('transunion')
    })
  })

  describe('attachments handling', () => {
    it('should handle attachments correctly', async () => {
      const requestWithAttachments = {
        ...mockGenerationRequest,
        attachments: [{
          fileName: 'bank_statement.pdf',
          fileType: 'application/pdf',
          description: 'Bank statement showing correct payment history',
          relatedDisputeItems: [1],
          base64Content: 'base64encodedcontent'
        }]
      }

      const result = await formatter.generateEOSCARLetter(requestWithAttachments)

      expect(result.supportingDocs).toHaveLength(1)
      expect(result.supportingDocs[0]).toMatchObject({
        id: 'att_1',
        fileName: 'bank_statement.pdf',
        fileType: 'application/pdf',
        description: 'Bank statement showing correct payment history',
        relatedDisputeItems: [1],
        base64Content: 'base64encodedcontent'
      })
    })

    it('should handle empty attachments array', async () => {
      const result = await formatter.generateEOSCARLetter(mockGenerationRequest)

      expect(result.supportingDocs).toHaveLength(0)
    })
  })
})

describe('ReasonCodeMapper', () => {
  describe('mapReasonToCode', () => {
    it('should map common dispute reasons correctly', () => {
      expect(ReasonCodeMapper.mapReasonToCode('not_mine')).toBe(EOSCARReasonCode.NOT_MINE)
      expect(ReasonCodeMapper.mapReasonToCode('incorrect_balance')).toBe(EOSCARReasonCode.INACCURATE_BALANCE)
      expect(ReasonCodeMapper.mapReasonToCode('wrong_payment_history')).toBe(EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY)
      expect(ReasonCodeMapper.mapReasonToCode('identity_theft')).toBe(EOSCARReasonCode.IDENTITY_THEFT)
    })

    it('should handle unknown reasons with default', () => {
      expect(ReasonCodeMapper.mapReasonToCode('unknown_reason')).toBe(EOSCARReasonCode.INACCURATE_BALANCE)
    })

    it('should normalize input strings', () => {
      expect(ReasonCodeMapper.mapReasonToCode('Not Mine!')).toBe(EOSCARReasonCode.NOT_MINE)
      expect(ReasonCodeMapper.mapReasonToCode('INCORRECT BALANCE')).toBe(EOSCARReasonCode.INACCURATE_BALANCE)
    })
  })

  describe('getReasonDescription', () => {
    it('should return correct descriptions', () => {
      expect(ReasonCodeMapper.getReasonDescription(EOSCARReasonCode.NOT_MINE))
        .toBe('This account does not belong to me')
      expect(ReasonCodeMapper.getReasonDescription(EOSCARReasonCode.INACCURATE_BALANCE))
        .toBe('The balance amount is incorrect')
    })
  })

  describe('getAllReasonCodes', () => {
    it('should return all reason codes with descriptions', () => {
      const codes = ReasonCodeMapper.getAllReasonCodes()
      
      expect(Array.isArray(codes)).toBe(true)
      expect(codes.length).toBeGreaterThan(0)
      
      codes.forEach(item => {
        expect(item).toMatchObject({
          code: expect.any(String),
          description: expect.any(String)
        })
      })
    })
  })

  describe('isValidReasonCode', () => {
    it('should validate reason codes correctly', () => {
      expect(ReasonCodeMapper.isValidReasonCode('01')).toBe(true)
      expect(ReasonCodeMapper.isValidReasonCode('02')).toBe(true)
      expect(ReasonCodeMapper.isValidReasonCode('99')).toBe(false)
      expect(ReasonCodeMapper.isValidReasonCode('invalid')).toBe(false)
    })
  })
})

describe('EOSCARValidator', () => {
  const mockEOSCARLetter = {
    header: {
      transmissionId: 'EOSCAR-123456-ABC123',
      submissionDate: new Date(),
      submitterInfo: {
        name: 'John Doe',
        organizationType: 'Individual',
        address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345' },
        phone: '555-123-4567',
        email: 'john@email.com'
      },
      bureauDestination: 'experian' as const,
      formatVersion: '1.0',
      recordCount: 1
    },
    consumerInfo: {
      firstName: 'John',
      lastName: 'Doe',
      ssn: '123-45-6789',
      dateOfBirth: new Date('1980-01-15'),
      currentAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'USA',
        addressType: 'current' as const
      },
      phoneNumbers: [{
        number: '(555) 123-4567',
        type: 'home' as const,
        isPrimary: true
      }]
    },
    disputeItems: [{
      sequenceNumber: 1,
      itemType: 'TRADELINE' as EOSCARItemType,
      creditorName: 'Test Bank',
      accountNumber: '****1234',
      disputeReasonCode: EOSCARReasonCode.INACCURATE_PAYMENT_HISTORY,
      disputeDescription: 'Payment history is incorrect',
      requestedAction: EOSCARAction.UPDATE,
      supportingDocuments: []
    }],
    supportingDocs: [],
    footer: {
      totalItems: 1,
      submissionDate: new Date(),
      expectedResponseDate: new Date(),
      contactInfo: {
        name: 'John Doe',
        organizationType: 'Individual',
        address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345' },
        phone: '555-123-4567',
        email: 'john@email.com'
      },
      legalNotices: ['FCRA Section 611'],
      signature: {
        signerName: 'John Doe',
        signatureDate: new Date(),
        electronicSignature: true
      }
    },
    rawContent: `
      TRANSMISSION HEADER
      SUBMITTER INFORMATION
      CONSUMER INFORMATION
      CURRENT ADDRESS
      DISPUTE ITEMS
      LEGAL NOTICES
      SIGNATURE
      TRANSMISSION FOOTER
    `,
    complianceStatus: {
      isCompliant: true,
      complianceScore: 100,
      issues: [],
      warnings: [],
      validatedAt: new Date(),
      validatedBy: 'Test'
    },
    generatedAt: new Date(),
    version: '1.0',
    bureau: 'experian' as const,
    submissionMethod: 'online' as const
  }

  describe('validateCompliance', () => {
    it('should validate compliant EOSCAR letter', async () => {
      const result = await EOSCARValidator.validateCompliance(mockEOSCARLetter)

      expect(result).toMatchObject({
        isCompliant: expect.any(Boolean),
        complianceScore: expect.any(Number),
        issues: expect.any(Array),
        warnings: expect.any(Array),
        validatedAt: expect.any(Date),
        validatedBy: 'EOSCARValidator'
      })
    })

    it('should detect missing required fields', async () => {
      const invalidLetter = {
        ...mockEOSCARLetter,
        consumerInfo: {
          ...mockEOSCARLetter.consumerInfo,
          firstName: undefined
        }
      }

      const result = await EOSCARValidator.validateCompliance(invalidLetter as any)

      expect(result.isCompliant).toBe(false)
      expect(result.issues.some(issue => issue.includes('firstName'))).toBe(true)
    })

    it('should validate SSN format', async () => {
      const invalidLetter = {
        ...mockEOSCARLetter,
        consumerInfo: {
          ...mockEOSCARLetter.consumerInfo,
          ssn: '123456789'
        }
      }

      const result = await EOSCARValidator.validateCompliance(invalidLetter)

      expect(result.issues.some(issue => issue.includes('SSN format'))).toBe(true)
    })

    it('should validate dispute item reason codes', async () => {
      const invalidLetter = {
        ...mockEOSCARLetter,
        disputeItems: [{
          ...mockEOSCARLetter.disputeItems[0],
          disputeReasonCode: 'INVALID' as any
        }]
      }

      const result = await EOSCARValidator.validateCompliance(invalidLetter)

      expect(result.issues.some(issue => issue.includes('Invalid dispute reason code'))).toBe(true)
    })

    it('should calculate compliance score correctly', async () => {
      const result = await EOSCARValidator.validateCompliance(mockEOSCARLetter)

      expect(result.complianceScore).toBeGreaterThanOrEqual(0)
      expect(result.complianceScore).toBeLessThanOrEqual(100)
    })
  })
})