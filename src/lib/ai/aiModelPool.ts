/**
 * AI Model Pool for efficient connection management and resource optimization
 * Implements singleton pattern with health checks and connection pooling
 */

export interface AIModel {
  id: string
  type: string
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'maintenance'
  lastUsed: Date
  usageCount: number
  errorCount: number
  config: ModelConfig
  instance: any
}

export interface ModelConfig {
  modelType: string
  endpoint?: string
  apiKey?: string
  timeout: number
  maxRetries: number
  rateLimitPerMinute: number
  healthCheckInterval: number
}

export interface ConnectionPool {
  maxConnections: number
  activeConnections: number
  availableConnections: number
  queuedRequests: number
}

export interface HealthCheckResult {
  modelId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastCheck: Date
  errorMessage?: string
}

export interface ModelUsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  peakUsageTime: Date
  currentLoad: number
}

export class AIModelPool {
  private static instance: AIModelPool
  private models: Map<string, AIModel> = new Map()
  private connectionPool: ConnectionPool
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()
  private usageStats: Map<string, ModelUsageStats> = new Map()
  private requestQueue: Array<{
    modelType: string
    resolve: (model: AIModel) => void
    reject: (error: Error) => void
    timestamp: Date
  }> = []

  private readonly DEFAULT_CONFIG: Partial<ModelConfig> = {
    timeout: 30000,
    maxRetries: 3,
    rateLimitPerMinute: 60,
    healthCheckInterval: 60000 // 1 minute
  }

  private constructor() {
    this.connectionPool = {
      maxConnections: 10,
      activeConnections: 0,
      availableConnections: 10,
      queuedRequests: 0
    }
    
    // Initialize cleanup interval
    setInterval(() => this.cleanupIdleModels(), 300000) // 5 minutes
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AIModelPool {
    if (!AIModelPool.instance) {
      AIModelPool.instance = new AIModelPool()
    }
    return AIModelPool.instance
  }

  /**
   * Get or create AI model instance
   */
  async getModel(modelType: string, config?: Partial<ModelConfig>): Promise<AIModel> {
    const modelId = this.generateModelId(modelType, config)
    
    // Check if model already exists and is ready
    if (this.models.has(modelId)) {
      const model = this.models.get(modelId)!
      if (model.status === 'ready') {
        this.updateModelUsage(model)
        return model
      } else if (model.status === 'initializing') {
        // Wait for initialization to complete
        return this.waitForModelReady(modelId)
      }
    }

    // Check connection pool availability
    if (this.connectionPool.activeConnections >= this.connectionPool.maxConnections) {
      return this.queueModelRequest(modelType, config)
    }

    // Initialize new model
    return this.initializeModel(modelType, config)
  }

  /**
   * Initialize a new AI model
   */
  private async initializeModel(modelType: string, config?: Partial<ModelConfig>): Promise<AIModel> {
    const modelId = this.generateModelId(modelType, config)
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config, modelType }

    const model: AIModel = {
      id: modelId,
      type: modelType,
      status: 'initializing',
      lastUsed: new Date(),
      usageCount: 0,
      errorCount: 0,
      config: fullConfig as ModelConfig,
      instance: null
    }

    this.models.set(modelId, model)
    this.connectionPool.activeConnections++
    this.connectionPool.availableConnections--

    try {
      // Initialize model based on type
      model.instance = await this.createModelInstance(modelType, fullConfig as ModelConfig)
      model.status = 'ready'
      
      // Set up health check
      this.setupHealthCheck(modelId, model)
      
      // Initialize usage stats
      this.initializeUsageStats(modelId)
      
      console.log(`AI Model ${modelId} initialized successfully`)
      return model
    } catch (error) {
      model.status = 'error'
      model.errorCount++
      this.connectionPool.activeConnections--
      this.connectionPool.availableConnections++
      
      console.error(`Failed to initialize AI Model ${modelId}:`, error)
      throw new Error(`Failed to initialize AI model: ${error}`)
    }
  }

  /**
   * Create model instance based on type
   */
  private async createModelInstance(modelType: string, config: ModelConfig): Promise<any> {
    switch (modelType) {
      case 'gemini-pro':
        return this.createGeminiModel(config)
      case 'document-ai':
        return this.createDocumentAIModel(config)
      case 'vision-api':
        return this.createVisionAPIModel(config)
      case 'openai-gpt':
        return this.createOpenAIModel(config)
      default:
        throw new Error(`Unsupported model type: ${modelType}`)
    }
  }

  /**
   * Create Gemini model instance
   */
  private async createGeminiModel(config: ModelConfig): Promise<any> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured')
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    // Test the connection
    await this.testModelConnection(model, 'gemini')
    
    return model
  }

  /**
   * Create Document AI model instance
   */
  private async createDocumentAIModel(config: ModelConfig): Promise<any> {
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai')
    
    const client = new DocumentProcessorServiceClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    })
    
    // Test the connection
    await this.testModelConnection(client, 'document-ai')
    
    return client
  }

  /**
   * Create Vision API model instance
   */
  private async createVisionAPIModel(config: ModelConfig): Promise<any> {
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    
    const client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    })
    
    // Test the connection
    await this.testModelConnection(client, 'vision-api')
    
    return client
  }

  /**
   * Create OpenAI model instance
   */
  private async createOpenAIModel(config: ModelConfig): Promise<any> {
    const { OpenAI } = await import('openai')
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    
    // Test the connection
    await this.testModelConnection(openai, 'openai')
    
    return openai
  }

  /**
   * Test model connection
   */
  private async testModelConnection(instance: any, type: string): Promise<void> {
    try {
      switch (type) {
        case 'gemini':
          await instance.generateContent('test')
          break
        case 'document-ai':
          // Basic client test - just check if client is properly initialized
          if (!instance.projectPath) {
            throw new Error('Document AI client not properly initialized')
          }
          break
        case 'vision-api':
          // Basic client test
          if (!instance.projectId) {
            throw new Error('Vision API client not properly initialized')
          }
          break
        case 'openai':
          await instance.models.list()
          break
        default:
          throw new Error(`Unknown model type for testing: ${type}`)
      }
    } catch (error) {
      throw new Error(`Model connection test failed: ${error}`)
    }
  }

  /**
   * Set up health check for model
   */
  private setupHealthCheck(modelId: string, model: AIModel): void {
    const interval = setInterval(async () => {
      try {
        const healthResult = await this.performHealthCheck(model)
        
        if (healthResult.status === 'unhealthy') {
          model.status = 'error'
          model.errorCount++
          console.warn(`Model ${modelId} health check failed:`, healthResult.errorMessage)
          
          // Attempt to reinitialize if error count is high
          if (model.errorCount >= 3) {
            await this.reinitializeModel(modelId)
          }
        } else {
          model.status = 'ready'
          // Reset error count on successful health check
          if (healthResult.status === 'healthy') {
            model.errorCount = 0
          }
        }
      } catch (error) {
        console.error(`Health check error for model ${modelId}:`, error)
        model.status = 'error'
        model.errorCount++
      }
    }, model.config.healthCheckInterval)

    this.healthCheckIntervals.set(modelId, interval)
  }

  /**
   * Perform health check on model
   */
  private async performHealthCheck(model: AIModel): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Perform lightweight health check based on model type
      await this.testModelConnection(model.instance, model.type)
      
      const responseTime = Date.now() - startTime
      
      return {
        modelId: model.id,
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        modelId: model.id,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Wait for model to be ready
   */
  private async waitForModelReady(modelId: string, timeout: number = 30000): Promise<AIModel> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const model = this.models.get(modelId)
        
        if (!model) {
          clearInterval(checkInterval)
          reject(new Error(`Model ${modelId} not found`))
          return
        }
        
        if (model.status === 'ready') {
          clearInterval(checkInterval)
          this.updateModelUsage(model)
          resolve(model)
          return
        }
        
        if (model.status === 'error') {
          clearInterval(checkInterval)
          reject(new Error(`Model ${modelId} initialization failed`))
          return
        }
        
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error(`Model ${modelId} initialization timeout`))
          return
        }
      }, 100)
    })
  }

  /**
   * Queue model request when pool is full
   */
  private async queueModelRequest(modelType: string, config?: Partial<ModelConfig>): Promise<AIModel> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        modelType,
        resolve,
        reject,
        timestamp: new Date()
      })
      
      this.connectionPool.queuedRequests++
      
      // Set timeout for queued request
      setTimeout(() => {
        const index = this.requestQueue.findIndex(req => req.resolve === resolve)
        if (index !== -1) {
          this.requestQueue.splice(index, 1)
          this.connectionPool.queuedRequests--
          reject(new Error('Model request timeout in queue'))
        }
      }, 60000) // 1 minute timeout
    })
  }

  /**
   * Process queued requests
   */
  private async processQueuedRequests(): Promise<void> {
    while (this.requestQueue.length > 0 && this.connectionPool.availableConnections > 0) {
      const request = this.requestQueue.shift()!
      this.connectionPool.queuedRequests--
      
      try {
        const model = await this.initializeModel(request.modelType)
        request.resolve(model)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Unknown error'))
      }
    }
  }

  /**
   * Release model back to pool
   */
  releaseModel(modelId: string): void {
    const model = this.models.get(modelId)
    if (model && model.status === 'busy') {
      model.status = 'ready'
      model.lastUsed = new Date()
      
      // Process any queued requests
      this.processQueuedRequests()
    }
  }

  /**
   * Update model usage statistics
   */
  private updateModelUsage(model: AIModel): void {
    model.usageCount++
    model.lastUsed = new Date()
    model.status = 'busy'
    
    const stats = this.usageStats.get(model.id)
    if (stats) {
      stats.totalRequests++
      stats.currentLoad++
    }
  }

  /**
   * Initialize usage statistics for model
   */
  private initializeUsageStats(modelId: string): void {
    this.usageStats.set(modelId, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakUsageTime: new Date(),
      currentLoad: 0
    })
  }

  /**
   * Generate unique model ID
   */
  private generateModelId(modelType: string, config?: Partial<ModelConfig>): string {
    const configHash = config ? this.hashConfig(config) : 'default'
    return `${modelType}-${configHash}`
  }

  /**
   * Hash configuration for unique ID generation
   */
  private hashConfig(config: Partial<ModelConfig>): string {
    const configString = JSON.stringify(config, Object.keys(config).sort())
    return Buffer.from(configString).toString('base64').substring(0, 8)
  }

  /**
   * Clean up idle models
   */
  private cleanupIdleModels(): void {
    const now = new Date()
    const idleThreshold = 30 * 60 * 1000 // 30 minutes
    
    for (const [modelId, model] of this.models.entries()) {
      if (now.getTime() - model.lastUsed.getTime() > idleThreshold && model.status === 'ready') {
        this.removeModel(modelId)
      }
    }
  }

  /**
   * Remove model from pool
   */
  private removeModel(modelId: string): void {
    const model = this.models.get(modelId)
    if (model) {
      // Clear health check interval
      const interval = this.healthCheckIntervals.get(modelId)
      if (interval) {
        clearInterval(interval)
        this.healthCheckIntervals.delete(modelId)
      }
      
      // Update connection pool
      this.connectionPool.activeConnections--
      this.connectionPool.availableConnections++
      
      // Remove from maps
      this.models.delete(modelId)
      this.usageStats.delete(modelId)
      
      console.log(`Removed idle model: ${modelId}`)
    }
  }

  /**
   * Reinitialize failed model
   */
  private async reinitializeModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId)
    if (!model) return
    
    console.log(`Reinitializing model: ${modelId}`)
    
    try {
      // Remove old model
      this.removeModel(modelId)
      
      // Create new model with same config
      await this.initializeModel(model.type, model.config)
    } catch (error) {
      console.error(`Failed to reinitialize model ${modelId}:`, error)
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    connectionPool: ConnectionPool
    models: Array<{
      id: string
      type: string
      status: string
      usageCount: number
      errorCount: number
      lastUsed: Date
    }>
    usageStats: Map<string, ModelUsageStats>
  } {
    const modelStats = Array.from(this.models.values()).map(model => ({
      id: model.id,
      type: model.type,
      status: model.status,
      usageCount: model.usageCount,
      errorCount: model.errorCount,
      lastUsed: model.lastUsed
    }))

    return {
      connectionPool: { ...this.connectionPool },
      models: modelStats,
      usageStats: new Map(this.usageStats)
    }
  }

  /**
   * Shutdown pool and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down AI Model Pool...')
    
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval)
    }
    
    // Clear all models
    this.models.clear()
    this.usageStats.clear()
    this.healthCheckIntervals.clear()
    
    // Reset connection pool
    this.connectionPool = {
      maxConnections: 10,
      activeConnections: 0,
      availableConnections: 10,
      queuedRequests: 0
    }
    
    console.log('AI Model Pool shutdown complete')
  }
}