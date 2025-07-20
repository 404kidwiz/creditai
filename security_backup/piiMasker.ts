/**
 * PII Masking Utility
 * Automatically masks sensitive personal information in credit reports
 */

export interface PIIMaskingOptions {
  maskSSN?: boolean
  maskAccountNumbers?: boolean
  maskPhoneNumbers?: boolean
  maskAddresses?: boolean
  maskNames?: boolean
  maskDOB?: boolean
  maskDriversLicense?: boolean
  maskPassportNumber?: boolean
  maskEmailAddresses?: boolean
  preserveFormat?: boolean
  maskingLevel?: 'standard' | 'enhanced' | 'maximum'
}

export interface MaskingResult {
  maskedText: string
  detectedPII: {
    ssn: string[]
    accountNumbers: string[]
    phoneNumbers: string[]
    addresses: string[]
    names: string[]
    dob: string[]
    driversLicense: string[]
    passportNumbers: string[]
    emailAddresses: string[]
  }
  maskingApplied: boolean
  sensitivityScore: number // 0-100 score indicating how sensitive the content is
}

export class PIIMasker {
  // Core PII patterns
  private static readonly SSN_PATTERN = /\b\d{3}-?\d{2}-?\d{4}\b/g
  private static readonly ACCOUNT_PATTERN = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,6}\b/g
  private static readonly PHONE_PATTERN = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
  private static readonly ADDRESS_PATTERN = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Circle|Cir|Court|Ct|Place|Pl)\b/gi
  private static readonly NAME_PATTERN = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g
  
  // Additional PII patterns
  private static readonly DOB_PATTERN = /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g
  private static readonly DRIVERS_LICENSE_PATTERN = /\b[A-Z]\d{7}\b|\b[A-Z]\d{3}-\d{3}-\d{2}-\d{3}-\d\b|\b[A-Z]\d{8}\b/g
  private static readonly PASSPORT_PATTERN = /\b[A-Z]\d{8}\b|\b\d{9}\b/g
  private static readonly EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  
  // Bank account patterns
  private static readonly BANK_ACCOUNT_PATTERN = /\b\d{8,17}\b/g
  private static readonly ROUTING_NUMBER_PATTERN = /\b\d{9}\b/g

  /**
   * Mask PII in text content
   */
  static maskPII(text: string, options: PIIMaskingOptions = {}): MaskingResult {
    const defaultOptions: PIIMaskingOptions = {
      maskSSN: true,
      maskAccountNumbers: true,
      maskPhoneNumbers: true,
      maskAddresses: false, // Keep addresses for analysis
      maskNames: false, // Keep names for analysis
      maskDOB: true,
      maskDriversLicense: true,
      maskPassportNumber: true,
      maskEmailAddresses: true,
      preserveFormat: true,
      maskingLevel: 'standard'
    }

    const opts = { ...defaultOptions, ...options }
    
    // Apply masking level presets if specified
    if (opts.maskingLevel === 'enhanced') {
      opts.maskAddresses = true;
      opts.maskNames = true;
    } else if (opts.maskingLevel === 'maximum') {
      opts.maskAddresses = true;
      opts.maskNames = true;
      opts.preserveFormat = false; // Complete masking with no format preservation
    }
    
    let maskedText = text;
    const detectedPII = {
      ssn: [] as string[],
      accountNumbers: [] as string[],
      phoneNumbers: [] as string[],
      addresses: [] as string[],
      names: [] as string[],
      dob: [] as string[],
      driversLicense: [] as string[],
      passportNumbers: [] as string[],
      emailAddresses: [] as string[]
    }

    let maskingApplied = false;
    let sensitivityScore = 0;

    // Mask SSN
    if (opts.maskSSN) {
      const ssnMatches = text.match(this.SSN_PATTERN) || [];
      detectedPII.ssn = ssnMatches;
      if (ssnMatches.length > 0) {
        maskedText = maskedText.replace(this.SSN_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 20 * ssnMatches.length; // SSNs are highly sensitive
          return opts.preserveFormat ? 'XXX-XX-XXXX' : 'XXXXXXXXX';
        });
      }
    }

    // Mask Account Numbers
    if (opts.maskAccountNumbers) {
      const accountMatches = text.match(this.ACCOUNT_PATTERN) || [];
      detectedPII.accountNumbers = accountMatches;
      
      // Also check for bank account numbers
      const bankAccountMatches = text.match(this.BANK_ACCOUNT_PATTERN) || [];
      const routingMatches = text.match(this.ROUTING_NUMBER_PATTERN) || [];
      
      // Filter bank account matches to reduce false positives
      const filteredBankMatches = bankAccountMatches.filter(match => {
        // Avoid matching phone numbers, SSNs, etc.
        return !detectedPII.phoneNumbers.includes(match) && 
               !detectedPII.ssn.includes(match) &&
               match.length >= 8; // Bank accounts are typically 8+ digits
      });
      
      // Add unique matches to account numbers
      filteredBankMatches.forEach(match => {
        if (!detectedPII.accountNumbers.includes(match)) {
          detectedPII.accountNumbers.push(match);
        }
      });
      
      if (detectedPII.accountNumbers.length > 0) {
        // Mask credit card numbers
        maskedText = maskedText.replace(this.ACCOUNT_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 15; // Credit cards are highly sensitive
          const digits = match.replace(/\D/g, '');
          if (opts.preserveFormat) {
            // Show last 4 digits
            const lastFour = digits.slice(-4);
            return match.replace(/\d/g, (digit, index) => {
              const digitIndex = match.substring(0, index).replace(/\D/g, '').length;
              return digitIndex < digits.length - 4 ? 'X' : digit;
            });
          }
          return 'X'.repeat(match.length);
        });
        
        // Mask bank account numbers
        for (const match of filteredBankMatches) {
          const regex = new RegExp(`\\b${match}\\b`, 'g');
          maskedText = maskedText.replace(regex, (m) => {
            maskingApplied = true;
            sensitivityScore += 15; // Bank accounts are highly sensitive
            if (opts.preserveFormat) {
              // Show last 4 digits
              return 'XXXXX' + m.slice(-4);
            }
            return 'X'.repeat(m.length);
          });
        }
        
        // Mask routing numbers
        for (const match of routingMatches) {
          const regex = new RegExp(`\\b${match}\\b`, 'g');
          maskedText = maskedText.replace(regex, (m) => {
            maskingApplied = true;
            sensitivityScore += 10;
            return 'XXXXXXXXX'; // Always fully mask routing numbers
          });
        }
      }
    }

    // Mask Phone Numbers
    if (opts.maskPhoneNumbers) {
      const phoneMatches = text.match(this.PHONE_PATTERN) || [];
      detectedPII.phoneNumbers = phoneMatches;
      if (phoneMatches.length > 0) {
        maskedText = maskedText.replace(this.PHONE_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 5 * phoneMatches.length;
          return opts.preserveFormat ? 'XXX-XXX-XXXX' : 'XXXXXXXXXX';
        });
      }
    }

    // Mask Addresses (optional)
    if (opts.maskAddresses) {
      const addressMatches = text.match(this.ADDRESS_PATTERN) || [];
      detectedPII.addresses = addressMatches;
      if (addressMatches.length > 0) {
        maskedText = maskedText.replace(this.ADDRESS_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 5 * addressMatches.length;
          return '[ADDRESS REDACTED]';
        });
      }
    }

    // Mask Names (optional)
    if (opts.maskNames) {
      const nameMatches = text.match(this.NAME_PATTERN) || [];
      detectedPII.names = nameMatches;
      if (nameMatches.length > 0) {
        maskedText = maskedText.replace(this.NAME_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 5 * nameMatches.length;
          return '[NAME REDACTED]';
        });
      }
    }
    
    // Mask Date of Birth
    if (opts.maskDOB) {
      const dobMatches = text.match(this.DOB_PATTERN) || [];
      detectedPII.dob = dobMatches;
      if (dobMatches.length > 0) {
        maskedText = maskedText.replace(this.DOB_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 10 * dobMatches.length;
          return opts.preserveFormat ? 'XX/XX/XXXX' : '[DOB REDACTED]';
        });
      }
    }
    
    // Mask Driver's License
    if (opts.maskDriversLicense) {
      const dlMatches = text.match(this.DRIVERS_LICENSE_PATTERN) || [];
      detectedPII.driversLicense = dlMatches;
      if (dlMatches.length > 0) {
        maskedText = maskedText.replace(this.DRIVERS_LICENSE_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 15 * dlMatches.length;
          return '[DL REDACTED]';
        });
      }
    }
    
    // Mask Passport Numbers
    if (opts.maskPassportNumber) {
      const passportMatches = text.match(this.PASSPORT_PATTERN) || [];
      detectedPII.passportNumbers = passportMatches;
      if (passportMatches.length > 0) {
        maskedText = maskedText.replace(this.PASSPORT_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 15 * passportMatches.length;
          return '[PASSPORT REDACTED]';
        });
      }
    }
    
    // Mask Email Addresses
    if (opts.maskEmailAddresses) {
      const emailMatches = text.match(this.EMAIL_PATTERN) || [];
      detectedPII.emailAddresses = emailMatches;
      if (emailMatches.length > 0) {
        maskedText = maskedText.replace(this.EMAIL_PATTERN, (match) => {
          maskingApplied = true;
          sensitivityScore += 5 * emailMatches.length;
          
          if (opts.preserveFormat) {
            // Show domain part but mask username
            const parts = match.split('@');
            if (parts.length === 2) {
              return 'xxxx@' + parts[1];
            }
          }
          return '[EMAIL REDACTED]';
        });
      }
    }
    
    // Cap sensitivity score at 100
    sensitivityScore = Math.min(sensitivityScore, 100);

    return {
      maskedText,
      detectedPII,
      maskingApplied,
      sensitivityScore
    }
  }

  /**
   * Mask PII in structured credit report data
   */
  static maskCreditReportData(data: any): any {
    const maskedData = JSON.parse(JSON.stringify(data))

    // Mask personal information
    if (maskedData.personalInfo) {
      if (maskedData.personalInfo.ssn) {
        maskedData.personalInfo.ssn = 'XXX-XX-XXXX'
      }
      if (maskedData.personalInfo.phone) {
        maskedData.personalInfo.phone = 'XXX-XXX-XXXX'
      }
      if (maskedData.personalInfo.email) {
        const parts = maskedData.personalInfo.email.split('@')
        if (parts.length === 2) {
          maskedData.personalInfo.email = 'xxxx@' + parts[1]
        } else {
          maskedData.personalInfo.email = '[EMAIL REDACTED]'
        }
      }
      if (maskedData.personalInfo.dateOfBirth || maskedData.personalInfo.dob) {
        maskedData.personalInfo.dateOfBirth = maskedData.personalInfo.dateOfBirth ? 'XX/XX/XXXX' : undefined
        maskedData.personalInfo.dob = maskedData.personalInfo.dob ? 'XX/XX/XXXX' : undefined
      }
      if (maskedData.personalInfo.driversLicense) {
        maskedData.personalInfo.driversLicense = '[DL REDACTED]'
      }
      if (maskedData.personalInfo.passportNumber) {
        maskedData.personalInfo.passportNumber = '[PASSPORT REDACTED]'
      }
    }

    // Mask account numbers
    if (maskedData.accounts && Array.isArray(maskedData.accounts)) {
      maskedData.accounts.forEach((account: any) => {
        if (account.accountNumber) {
          const accountNum = account.accountNumber.toString()
          account.accountNumber = 'XXXX' + accountNum.slice(-4)
        }
        if (account.routingNumber) {
          account.routingNumber = 'XXXXXXXXX'
        }
      })
    }
    
    // Mask inquiries
    if (maskedData.inquiries && Array.isArray(maskedData.inquiries)) {
      maskedData.inquiries.forEach((inquiry: any) => {
        if (inquiry.accountNumber) {
          const accountNum = inquiry.accountNumber.toString()
          inquiry.accountNumber = 'XXXX' + accountNum.slice(-4)
        }
      })
    }
    
    // Mask negative items
    if (maskedData.negativeItems && Array.isArray(maskedData.negativeItems)) {
      maskedData.negativeItems.forEach((item: any) => {
        if (item.accountNumber) {
          const accountNum = item.accountNumber.toString()
          item.accountNumber = 'XXXX' + accountNum.slice(-4)
        }
      })
    }
    
    // Mask public records
    if (maskedData.publicRecords && Array.isArray(maskedData.publicRecords)) {
      maskedData.publicRecords.forEach((record: any) => {
        if (record.caseNumber) {
          record.caseNumber = 'XXXXX' + record.caseNumber.toString().slice(-4)
        }
      })
    }
    
    // Add masking metadata
    maskedData._securityInfo = {
      piiMasked: true,
      maskingTimestamp: new Date().toISOString(),
      maskingVersion: '2.0'
    }

    return maskedData
  }

  /**
   * Check if text contains PII
   */
  static containsPII(text: string): boolean {
    return (
      this.SSN_PATTERN.test(text) ||
      this.ACCOUNT_PATTERN.test(text) ||
      this.PHONE_PATTERN.test(text) ||
      this.DOB_PATTERN.test(text) ||
      this.DRIVERS_LICENSE_PATTERN.test(text) ||
      this.PASSPORT_PATTERN.test(text) ||
      this.EMAIL_PATTERN.test(text) ||
      this.BANK_ACCOUNT_PATTERN.test(text) ||
      this.ROUTING_NUMBER_PATTERN.test(text)
    )
  }

  /**
   * Get PII detection summary
   */
  static getPIISummary(text: string): { [key: string]: number } {
    return {
      ssnCount: (text.match(this.SSN_PATTERN) || []).length,
      accountCount: (text.match(this.ACCOUNT_PATTERN) || []).length,
      phoneCount: (text.match(this.PHONE_PATTERN) || []).length,
      addressCount: (text.match(this.ADDRESS_PATTERN) || []).length,
      nameCount: (text.match(this.NAME_PATTERN) || []).length,
      dobCount: (text.match(this.DOB_PATTERN) || []).length,
      driversLicenseCount: (text.match(this.DRIVERS_LICENSE_PATTERN) || []).length,
      passportCount: (text.match(this.PASSPORT_PATTERN) || []).length,
      emailCount: (text.match(this.EMAIL_PATTERN) || []).length,
      bankAccountCount: (text.match(this.BANK_ACCOUNT_PATTERN) || []).length,
      routingNumberCount: (text.match(this.ROUTING_NUMBER_PATTERN) || []).length
    }
  }
  
  /**
   * Get sensitivity score for text (0-100)
   */
  static getSensitivityScore(text: string): number {
    const result = this.maskPII(text, { 
      maskSSN: true,
      maskAccountNumbers: true,
      maskPhoneNumbers: true,
      maskAddresses: true,
      maskNames: true,
      maskDOB: true,
      maskDriversLicense: true,
      maskPassportNumber: true,
      maskEmailAddresses: true,
      preserveFormat: true
    });
    
    return result.sensitivityScore;
  }
  
  /**
   * Sanitize error messages to prevent PII leakage
   */
  static sanitizeErrorMessage(error: Error | string): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const result = this.maskPII(errorMessage, {
      maskSSN: true,
      maskAccountNumbers: true,
      maskPhoneNumbers: true,
      maskAddresses: true,
      maskNames: true,
      maskDOB: true,
      maskDriversLicense: true,
      maskPassportNumber: true,
      maskEmailAddresses: true,
      preserveFormat: false // Full masking for errors
    });
    
    return result.maskedText;
  }
}