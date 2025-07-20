import { GoogleAuth } from 'google-auth-library'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface EnhancedGoogleCloudConfig {
  projectId: string
  location: string
  documentAi: {
    processorId?: string
    processorVersion?: string
    enableFormParsing: boolean
    enableTableExtraction: boolean
  }
  vision: {
    enabled: boolean
    confidenceThreshold: number
  }
  gemini: {
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
  }
  caching: {
    enabled: boolean
    ttl: number
    redisUrl?: string
  }
  batchProcessing: {
    enabled: boolean
    maxBatchSize: number
  }
}

export interface CreditReportProcessorConfig {
  enableAdvancedParsing: boolean
  enableFCRAViolationDetection: boolean
  enableScoreImpactAnalysis: boolean
  enableDisputeRecommendations: boolean
  confidenceThreshold: number
}

export class EnhancedGoogleCloudConfigManager {
  private static instance: EnhancedGoogleCloudConfigManager
  private config: EnhancedGoogleCloudConfig | null = null
  private creditConfig: CreditReportProcessorConfig | null = null

  static getInstance(): EnhancedGoogleCloudConfigManager {
    if (!EnhancedGoogleCloudConfigManager.instance) {
      EnhancedGoogleCloudConfigManager.instance = new EnhancedGoogleCloudConfigManager()
    }
    return EnhancedGoogleCloudConfigManager.instance
  }

  async initialize(): Promise<void> {
    const validation = await this.validateAndLoadConfig()
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
    }
  }

  private async validateAndLoadConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Simplified configuration - only 3 required variables
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_AI_API_KEY',
      'GOOGLE_CLOUD_CREDENTIALS'
    ]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`)
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    // Load service account credentials
    let credentials: any = null
    try {
      const credsPath = process.env.GOOGLE_CLOUD_CREDENTIALS
      if (credsPath && existsSync(credsPath)) {
        credentials = JSON.parse(readFileSync(credsPath, 'utf8'))
      } else if (process.env.GOOGLE_CLOUD_CREDENTIALS?.startsWith('{')) {
        credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
      }
    } catch (error) {
      errors.push(`Invalid service account credentials: ${error}`)
    }

    // Build enhanced configuration
    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      documentAi: {
        processorId: process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID,
        processorVersion: process.env.GOOGLE_CLOUD_DOCUMENT_AI_VERSION,
        enableFormParsing: process.env.ENABLE_FORM_PARSING !== 'false',
        enableTableExtraction: process.env.ENABLE_TABLE_EXTRACTION !== 'false'
      },
      vision: {
        enabled: process.env.GOOGLE_CLOUD_VISION_ENABLED !== 'false',
        confidenceThreshold: parseFloat(process.env.VISION_CONFIDENCE_THRESHOLD || '0.8')
      },
      gemini: {
        apiKey: process.env.GOOGLE_AI_API_KEY!,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2'),
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '4096')
      },
      caching: {
        enabled: process.env.ENABLE_CACHING !== 'false',
        ttl: parseInt(process.env.CACHE_TTL || '3600'),
        redisUrl: process.env.REDIS_URL
      },
      batchProcessing: {
        enabled: process.env.ENABLE_BATCH_PROCESSING === 'true',
        maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '10')
      }
    }

    // Credit report specific configuration
    this.creditConfig = {
      enableAdvancedParsing: process.env.ENABLE_ADVANCED_PARSING !== 'false',
      enableFCRAViolationDetection: process.env.ENABLE_FCRA_DETECTION !== 'false',
      enableScoreImpactAnalysis: process.env.ENABLE_SCORE_ANALYSIS !== 'false',
      enableDisputeRecommendations: process.env.ENABLE_DISPUTE_RECOMMENDATIONS !== 'false',
      confidenceThreshold: parseFloat(process.env.CREDIT_CONFIDENCE_THRESHOLD || '0.85')
    }

    return { valid: true, errors: [] }
  }


  getConfig(): EnhancedGoogleCloudConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.')
    }
    return this.config
  }

  getCreditConfig(): CreditReportProcessorConfig {
    if (!this.creditConfig) {
      throw new Error('Credit configuration not initialized.')
    }
    return this.creditConfig
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_CLOUD_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
      
      const client = await auth.getClient()
      const projectId = await auth.getProjectId()
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Get your Google Cloud Project ID from: https://console.cloud.google.com/',
      '2. Create a service account and download the JSON key file',
      '3. Get your Gemini API key from: https://aistudio.google.com/app/apikey',
      '4. Set the following 3 environment variables:',
      '   - GOOGLE_CLOUD_PROJECT_ID=your-project-id',
      '   - GOOGLE_CLOUD_CREDENTIALS=/path/to/service-account.json',
      '   - GOOGLE_AI_API_KEY=your-gemini-api-key',
      '5. Run: npm run setup-google-cloud-enhanced'
    ]
  }
}

// Export singleton instance
export const configManager = EnhancedGoogleCloudConfigManager.getInstance()