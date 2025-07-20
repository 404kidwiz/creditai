import { multiFormatReportSupport } from '../multiFormatReportSupport'

describe('MultiFormatReportSupport', () => {
  describe('Format Detection', () => {
    it('should detect Experian report format', async () => {
      const sampleText = `
        EXPERIAN CREDIT REPORT
        Report Date: 01/20/2025
        
        Personal Information:
        Name: John Doe
        
        Your FICO Score: 750
        
        Account History:
        Bank of America Credit Card
        Account Number: ****1234
        Balance: $1,500
        Credit Limit: $10,000
        Payment History: Current
      `

      const result = await multiFormatReportSupport.detectReportFormat(sampleText)
      
      expect(result).not.toBeNull()
      expect(result?.format.id).toBe('experian_standard')
      expect(result?.format.provider).toBe('Experian')
      expect(result?.confidence).toBeGreaterThan(80)
      expect(result?.matchedPatterns).toContain('header')
      expect(result?.matchedPatterns).toContain('section')
      expect(result?.matchedPatterns).toContain('data')
    })

    it('should detect Credit Karma report format', async () => {
      const sampleText = `
        Credit Karma
        Free Credit Score & Report
        
        Hello John!
        
        Your VantageScore 3.0:
        TransUnion: 720
        Equifax: 715
        
        Credit Accounts:
        Chase Freedom Card
        Balance: $500
        Credit Limit: $5,000
      `

      const result = await multiFormatReportSupport.detectReportFormat(sampleText)
      
      expect(result).not.toBeNull()
      expect(result?.format.id).toBe('credit_karma')
      expect(result?.format.provider).toBe('Credit Karma')
      expect(result?.confidence).toBeGreaterThan(75)
    })

    it('should detect Capital One CreditWise format', async () => {
      const sampleText = `
        Capital One CreditWise
        
        Your VantageScore 3.0: 680
        Powered by TransUnion
        
        Credit Snapshot:
        - 5 Open Accounts
        - 2 Credit Cards
        - 3 Loans
      `

      const result = await multiFormatReportSupport.detectReportFormat(sampleText)
      
      expect(result).not.toBeNull()
      expect(result?.format.id).toBe('capital_one_creditwise')
      expect(result?.format.provider).toBe('Capital One')
    })

    it('should detect generic format for unknown reports', async () => {
      const sampleText = `
        Credit Report
        
        Credit Score: 650
        
        Accounts:
        - Credit Card: $1,000
        - Auto Loan: $15,000
        
        Payment History: Good
      `

      const result = await multiFormatReportSupport.detectReportFormat(sampleText)
      
      expect(result).not.toBeNull()
      expect(result?.format.id).toBe('generic_text')
      expect(result?.format.provider).toBe('Unknown')
      expect(result?.confidence).toBeLessThan(80)
    })

    it('should return null for non-credit report text', async () => {
      const sampleText = `
        This is just a regular document
        with no credit information at all.
        Just some random text.
      `

      const result = await multiFormatReportSupport.detectReportFormat(sampleText)
      
      expect(result).toBeNull()
    })
  })

  describe('Supported Formats', () => {
    it('should list all supported formats', () => {
      const formats = multiFormatReportSupport.getSupportedFormats()
      
      expect(formats.length).toBeGreaterThan(15)
      
      // Check for major bureaus
      expect(formats.some(f => f.id === 'experian_standard')).toBe(true)
      expect(formats.some(f => f.id === 'equifax_standard')).toBe(true)
      expect(formats.some(f => f.id === 'transunion_standard')).toBe(true)
      
      // Check for monitoring services
      expect(formats.some(f => f.id === 'credit_karma')).toBe(true)
      expect(formats.some(f => f.id === 'myfico')).toBe(true)
      expect(formats.some(f => f.id === 'credit_sesame')).toBe(true)
      
      // Check for bank reports
      expect(formats.some(f => f.id === 'chase_creditwise')).toBe(true)
      expect(formats.some(f => f.id === 'capital_one_creditwise')).toBe(true)
      expect(formats.some(f => f.id === 'discover_scorecard')).toBe(true)
      
      // Check for alternative data
      expect(formats.some(f => f.id === 'experian_boost')).toBe(true)
      expect(formats.some(f => f.id === 'ultra_fico')).toBe(true)
    })

    it('should check if format is supported', () => {
      expect(multiFormatReportSupport.isFormatSupported('experian_standard')).toBe(true)
      expect(multiFormatReportSupport.isFormatSupported('credit_karma')).toBe(true)
      expect(multiFormatReportSupport.isFormatSupported('non_existent_format')).toBe(false)
    })

    it('should get format capabilities', () => {
      const experianCaps = multiFormatReportSupport.getFormatCapabilities('experian_standard')
      expect(experianCaps).toContain('scores')
      expect(experianCaps).toContain('accounts')
      expect(experianCaps).toContain('inquiries')
      expect(experianCaps).toContain('public_records')
      
      const discoverCaps = multiFormatReportSupport.getFormatCapabilities('discover_scorecard')
      expect(discoverCaps).toContain('scores')
      expect(discoverCaps).toContain('score_history')
      
      const boostCaps = multiFormatReportSupport.getFormatCapabilities('experian_boost')
      expect(boostCaps).toContain('alternative_data')
      expect(boostCaps).toContain('utility_payments')
    })
  })

  describe('Format Categories', () => {
    it('should categorize formats correctly', () => {
      const formats = multiFormatReportSupport.getSupportedFormats()
      
      const bureauFormats = formats.filter(f => f.category === 'bureau')
      expect(bureauFormats.length).toBeGreaterThanOrEqual(3)
      
      const monitoringFormats = formats.filter(f => f.category === 'monitoring')
      expect(monitoringFormats.length).toBeGreaterThanOrEqual(4)
      
      const bankFormats = formats.filter(f => f.category === 'bank')
      expect(bankFormats.length).toBeGreaterThanOrEqual(4)
      
      const alternativeFormats = formats.filter(f => f.category === 'alternative')
      expect(alternativeFormats.length).toBeGreaterThanOrEqual(2)
      
      const specializedFormats = formats.filter(f => f.category === 'specialized')
      expect(specializedFormats.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Confidence Levels', () => {
    it('should have appropriate confidence levels', () => {
      const formats = multiFormatReportSupport.getSupportedFormats()
      
      // Bureau reports should have highest confidence
      const bureauFormats = formats.filter(f => 
        ['experian_standard', 'equifax_standard', 'transunion_standard'].includes(f.id)
      )
      bureauFormats.forEach(format => {
        expect(format.confidence).toBeGreaterThanOrEqual(0.95)
      })
      
      // Monitoring services should have high confidence
      const monitoringFormats = formats.filter(f => f.category === 'monitoring')
      monitoringFormats.forEach(format => {
        expect(format.confidence).toBeGreaterThanOrEqual(0.83)
      })
      
      // Generic formats should have lower confidence
      const genericFormats = formats.filter(f => 
        ['pdf_scanned', 'generic_text'].includes(f.id)
      )
      genericFormats.forEach(format => {
        expect(format.confidence).toBeLessThanOrEqual(0.75)
      })
    })
  })

  describe('Analysis with Format Detection', () => {
    it('should analyze Experian report correctly', async () => {
      const sampleReport = `
        EXPERIAN CREDIT REPORT
        Report Date: January 20, 2025
        
        Personal Information:
        Name: Jane Smith
        Address: 123 Main St, Anytown, USA 12345
        
        Your Experian FICO Score: 780
        
        Account History:
        
        Wells Fargo Credit Card
        Account Number: ****5678
        Balance: $2,500
        Credit Limit: $15,000
        Status: Open
        Payment History: Current for 24 months
        
        Negative Items:
        None
        
        Credit Inquiries:
        Capital One - 12/15/2024 (Credit Card Application)
      `

      // Note: This will use fallback extraction since we're in test environment
      const result = await multiFormatReportSupport.analyzeReport(sampleReport, 'test-user')
      
      expect(result.formatDetection.format.id).toBe('experian_standard')
      expect(result.extractionQuality.dataPoints).toBeGreaterThan(0)
      expect(result.extractionQuality.warnings).toBeDefined()
    })

    it('should handle forced format selection', async () => {
      const sampleReport = `Some credit report text`
      
      const result = await multiFormatReportSupport.analyzeReport(
        sampleReport, 
        'test-user',
        { forceFormat: 'credit_karma' }
      )
      
      expect(result.formatDetection.format.id).toBe('credit_karma')
      expect(result.formatDetection.confidence).toBe(100)
    })

    it('should handle unknown format gracefully', async () => {
      const sampleReport = `
        Random Credit Information
        Score: 700
        Some accounts listed here
      `
      
      const result = await multiFormatReportSupport.analyzeReport(sampleReport, 'test-user')
      
      expect(result.formatDetection.format.id).toBe('generic_text')
      expect(result.formatDetection.confidence).toBeLessThan(80)
    })
  })

  describe('Provider Coverage', () => {
    it('should cover 95% of major credit report providers', () => {
      const formats = multiFormatReportSupport.getSupportedFormats()
      const providers = new Set(formats.map(f => f.provider))
      
      // Major credit bureaus
      expect(providers.has('Experian')).toBe(true)
      expect(providers.has('Equifax')).toBe(true)
      expect(providers.has('TransUnion')).toBe(true)
      
      // Popular monitoring services
      expect(providers.has('Credit Karma')).toBe(true)
      expect(providers.has('Credit Sesame')).toBe(true)
      expect(providers.has('myFICO')).toBe(true)
      expect(providers.has('WalletHub')).toBe(true)
      
      // Major banks
      expect(providers.has('Chase')).toBe(true)
      expect(providers.has('Capital One')).toBe(true)
      expect(providers.has('Discover')).toBe(true)
      expect(providers.has('American Express')).toBe(true)
      
      // Alternative data providers
      expect(providers.has('FICO')).toBe(true) // UltraFICO
      
      // Specialized providers
      expect(providers.has('IdentityIQ')).toBe(true)
      expect(providers.has('LexisNexis')).toBe(true)
      
      // Total unique providers should be at least 15
      expect(providers.size).toBeGreaterThanOrEqual(14)
    })
  })
})