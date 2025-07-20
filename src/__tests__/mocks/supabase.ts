/**
 * Mock Supabase client for testing
 */

export function createMockSupabaseClient() {
  const mockClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      rangeGt: jest.fn().mockReturnThis(),
      rangeGte: jest.fn().mockReturnThis(),
      rangeLt: jest.fn().mockReturnThis(),
      rangeLte: jest.fn().mockReturnThis(),
      rangeAdjacent: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null })
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } })
      }))
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockReturnThis()
    }))
  }

  return mockClient
}

// Mock data factory functions
export const mockCreditReportData = {
  personalInfo: {
    name: 'John Doe',
    address: '123 Main St, Anytown, ST 12345',
    ssn: '***-**-1234',
    dateOfBirth: '1990-01-01'
  },
  creditScore: {
    score: 750,
    bureau: 'experian',
    date: '2024-01-01',
    scoreRange: { min: 300, max: 850 }
  },
  accounts: [
    {
      id: 'account-1',
      creditor: 'Chase Bank',
      accountNumber: '****1234',
      accountType: 'Credit Card',
      balance: 1500,
      creditLimit: 5000,
      paymentHistory: 'Current',
      status: 'Open'
    }
  ],
  negativeItems: [
    {
      id: 'negative-1',
      type: 'Late Payment',
      creditor: 'Capital One',
      date: '2023-06-01',
      status: 'Unresolved',
      impact: 'Medium'
    }
  ],
  inquiries: [
    {
      id: 'inquiry-1',
      creditor: 'Wells Fargo',
      date: '2024-01-15',
      type: 'Hard',
      purpose: 'Credit Card'
    }
  ],
  publicRecords: []
}

export const mockAnalysisResult = {
  extractedData: mockCreditReportData,
  recommendations: [
    {
      type: 'dispute',
      priority: 'high',
      item: 'Late Payment - Capital One',
      reason: 'Inaccurate payment date',
      expectedImpact: 25
    }
  ],
  scoreAnalysis: {
    currentScore: 750,
    factors: [
      { factor: 'Payment History', impact: 'positive', weight: 35 },
      { factor: 'Credit Utilization', impact: 'neutral', weight: 30 }
    ],
    improvementPotential: 50,
    timelineEstimate: '3-6 months'
  },
  summary: 'Credit report analysis completed successfully',
  confidence: 95,
  provider: 'gemini'
}

export const mockValidationResult = {
  overallScore: 85,
  issues: [],
  checks: [
    {
      name: 'Data Completeness',
      status: 'passed',
      score: 90,
      details: 'All required fields present'
    }
  ],
  recommendations: ['Verify account balances'],
  metadata: {
    timestamp: '2024-01-01T00:00:00Z',
    version: '2.0'
  }
}

export const mockConfidenceResult = {
  overallConfidence: 85,
  confidenceLevel: 'high',
  calculationMethod: 'weighted_multi_factor',
  confidenceFactors: [
    {
      factor: 'Model Consensus',
      score: 90,
      weight: 40,
      description: 'Agreement between multiple AI models'
    }
  ],
  recommendations: ['High confidence analysis - proceed with recommended actions'],
  breakdown: {
    consensusConfidence: 90,
    validationConfidence: 85,
    qualityConfidence: 80,
    completenessConfidence: 85
  }
}