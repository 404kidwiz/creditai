import { CreditAnalyzer } from '../ai/creditAnalyzer'

// Mock Google AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify({
            personalInfo: { name: 'Test User', address: '123 Test St' },
            creditScore: { score: 720, bureau: 'experian', date: '2024-01-01', scoreRange: { min: 300, max: 850 } },
            accounts: [],
            negativeItems: [],
            inquiries: [],
            publicRecords: []
          }))
        }
      })
    })
  }))
}))

describe('CreditAnalyzer', () => {
  let analyzer: CreditAnalyzer

  beforeEach(() => {
    // Set up environment for server-side test
    Object.defineProperty(global, 'window', { value: undefined })
    process.env.GOOGLE_AI_API_KEY = 'test-api-key'
    
    analyzer = new CreditAnalyzer()
  })

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY
  })

  it('creates analyzer instance', () => {
    expect(analyzer).toBeInstanceOf(CreditAnalyzer)
  })

  it('analyzes credit report text', async () => {
    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-user' },
              error: null
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      })
    }

    const result = await analyzer.analyzeReport(
      'Test credit report text with account information',
      'test-user-id',
      mockClient
    )

    expect(result).toBeDefined()
    expect(result.extractedData).toBeDefined()
    expect(result.recommendations).toBeDefined()
    expect(result.scoreAnalysis).toBeDefined()
  })

  it('handles missing API key gracefully', async () => {
    delete process.env.GOOGLE_AI_API_KEY
    const analyzerWithoutKey = new CreditAnalyzer()

    const result = await analyzerWithoutKey.analyzeReport(
      'Test credit report text',
      'test-user-id'
    )

    // Should fall back to basic analysis
    expect(result).toBeDefined()
    expect(result.summary).toContain('Credit report analysis completed')
  })

  it('parses basic credit data from text', () => {
    const testText = `
      Credit Score: 720
      Account: Credit Card - $500 balance
      Late Payment: 30 days late on 2023-01-01
    `

    // Access private method for testing
    const basicData = (analyzer as any).parseBasicCreditData(testText)

    expect(basicData.score).toBe(720)
    expect(basicData.accounts.length).toBeGreaterThan(0)
    expect(basicData.negativeItems.length).toBeGreaterThan(0)
  })
})