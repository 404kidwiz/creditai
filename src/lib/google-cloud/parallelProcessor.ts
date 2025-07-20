/**
 * Parallel PDF Processing Engine
 * Implements concurrent processing with semaphore-based concurrency control
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { AIModelPool } from '@/lib/ai/aiModelPool'
import { ApplicationCache } from '@/lib/cache/applicationCache'
import { generateCacheHash } from '@/lib/cache/applicationCache'

export interface ProcessingChunk {
  id: string
  pageNumber: number
  buffer: Buffer
  size: number
  processingMethod: ProcessingMethod
}

export interface ProcessingResult {
  chunkId: string
  pageNumber: number
  extractedText: string
  confidence: number
  processingTime: number
  method: ProcessingMethod
  metadata: ProcessingMetadata
}

export interface ProcessingMetadata {
  dimensions: { width: number; height: number }
  fileSize: number
  textBlocks: number
  imageQuality: 'high' | 'medium' | 'low'
  processingTimestamp: string
}

export enum ProcessingMethod {
  DOCUMENT_AI = 'document-ai',
  VISION_API = 'vision-api',
  GEMINI_VISION = 'gemini-vision',
  HYBRID = 'hybrid'
}

export interface ParallelProcessingOptions {
  maxConcurrency: number
  chunkSize: number
  timeoutMs: number
  retryAttempts: number
  enableCaching: boolean
  fallbackMethods: ProcessingMethod[]
  qualityThreshold: number
}

export class Semaphore {
  private permits: number
  private waitQueue: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--
        resolve()
      } else {
        this.waitQueue.push(resolve)
      }
    })
  }

  release(): void {
    this.permits++
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift()
      if (next) {
        this.permits--
        next()
      }
    }
  }

  getAvailablePermits(): number {
    return this.permits
  }

  getQueueLength(): number {
    return this.waitQueue.length
  }
}

export class ParallelPDFProcessor {
  private semaphore: Semaphore
  private aiModelPool: AIModelPool
  private cache: ApplicationCache
  private readonly options: ParallelProcessingOptions

  private readonly DEFAULT_OPTIONS: ParallelProcessingOptions = {
    maxConcurrency: 3,
    chunkSize: 5,
    timeoutMs: 30000,
    retryAttempts: 3,
    enableCaching: true,
    fallbackMethods: [ProcessingMethod.VISION_API, ProcessingMethod.GEMINI_VISION],
    qualityThreshold: 0.7
  }

  constructor(options: Partial<ParallelProcessingOptions> = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options }
    this.semaphore = new Semaphore(this.options.maxConcurrency)
    this.aiModelPool = AIModelPool.getInstance()
    this.cache = ApplicationCache.getInstance()
  }

  /**
   * Process PDF pages in parallel with intelligent chunking
   */
  async processPages(
    pages: Buffer[],
    primaryMethod: ProcessingMethod = ProcessingMethod.DOCUMENT_AI
  ): Promise<ProcessingResult[]> {
    const startTime = Date.now()
    
    try {
      // Create processing chunks
      const chunks = this.createProcessingChunks(pages, primaryMethod)
      
      // Process chunks in parallel with concurrency control
      const results = await this.processChunksInParallel(chunks)
      
      // Sort results by page number
      const sortedResults = results.sort((a, b) => a.pageNumber - b.pageNumber)
      
      // Log processing statistics
      this.logProcessingStats(sortedResults, Date.now() - startTime)
      
      return sortedResults
    } catch (error) {
      console.error('Parallel PDF processing failed:', error)
      throw new Error(`Parallel processing failed: ${error}`)
    }
  }

  /**
   * Create processing chunks from PDF pages
   */
  private createProcessingChunks(
    pages: Buffer[],
    primaryMethod: ProcessingMethod
  ): ProcessingChunk[] {
    const chunks: ProcessingChunk[] = []
    
    for (let i = 0; i < pages.length; i++) {
      const chunk: ProcessingChunk = {
        id: `chunk_${i}_${Date.now()}`,
        pageNumber: i + 1,
        buffer: pages[i],
        size: pages[i].length,
        processingMethod: primaryMethod
      }
      chunks.push(chunk)
    }
    
    return chunks
  }

  /**
   * Process chunks in parallel with semaphore control
   */
  private async processChunksInParallel(chunks: ProcessingChunk[]): Promise<ProcessingResult[]> {
    const processingPromises = chunks.map(chunk => this.processChunkWithSemaphore(chunk))
    
    // Use Promise.allSettled to handle partial failures gracefully
    const results = await Promise.allSettled(processingPromises)
    
    const successfulResults: ProcessingResult[] = []
    const failedChunks: ProcessingChunk[] = []
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value)
      } else {
        console.error(`Chunk ${chunks[index].id} failed:`, result.reason)
        failedChunks.push(chunks[index])
      }
    })
    
    // Retry failed chunks with fallback methods
    if (failedChunks.length > 0) {
      const retryResults = await this.retryFailedChunks(failedChunks)
      successfulResults.push(...retryResults)
    }
    
    return successfulResults
  }

  /**
   * Process single chunk with semaphore control
   */
  private async processChunkWithSemaphore(chunk: ProcessingChunk): Promise<ProcessingResult> {
    await this.semaphore.acquire()
    
    try {
      return await this.processChunk(chunk)
    } finally {
      this.semaphore.release()
    }
  }

  /**
   * Process individual chunk with caching and fallback
   */
  private async processChunk(chunk: ProcessingChunk): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    // Check cache first
    if (this.options.enableCaching) {
      const cacheKey = this.generateCacheKey(chunk)
      const cached = await this.cache.getCachedAIResult('pdf-processing', cacheKey)
      
      if (cached) {
        console.log(`Cache hit for chunk ${chunk.id}`)
        return cached
      }
    }
    
    // Process with primary method
    try {
      const result = await this.processWithMethod(chunk, chunk.processingMethod)
      
      // Cache successful result
      if (this.options.enableCaching && result.confidence >= this.options.qualityThreshold) {
        const cacheKey = this.generateCacheKey(chunk)
        await this.cache.cacheAIResult('pdf-processing', cacheKey, result)
      }
      
      return result
    } catch (error) {
      console.warn(`Primary method ${chunk.processingMethod} failed for chunk ${chunk.id}:`, error)
      
      // Try fallback methods
      for (const fallbackMethod of this.options.fallbackMethods) {
        try {
          const result = await this.processWithMethod(chunk, fallbackMethod)
          
          // Cache successful fallback result
          if (this.options.enableCaching) {
            const cacheKey = this.generateCacheKey(chunk)
            await this.cache.cacheAIResult('pdf-processing', cacheKey, result)
          }
          
          return result
        } catch (fallbackError) {
          console.warn(`Fallback method ${fallbackMethod} failed for chunk ${chunk.id}:`, fallbackError)
        }
      }
      
      throw new Error(`All processing methods failed for chunk ${chunk.id}`)
    }
  }

  /**
   * Process chunk with specific method
   */
  private async processWithMethod(
    chunk: ProcessingChunk,
    method: ProcessingMethod
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    switch (method) {
      case ProcessingMethod.DOCUMENT_AI:
        return await this.processWithDocumentAI(chunk, startTime)
      
      case ProcessingMethod.VISION_API:
        return await this.processWithVisionAPI(chunk, startTime)
      
      case ProcessingMethod.GEMINI_VISION:
        return await this.processWithGeminiVision(chunk, startTime)
      
      case ProcessingMethod.HYBRID:
        return await this.processWithHybridMethod(chunk, startTime)
      
      default:
        throw new Error(`Unsupported processing method: ${method}`)
    }
  }

  /**
   * Process with Document AI
   */
  private async processWithDocumentAI(
    chunk: ProcessingChunk,
    startTime: number
  ): Promise<ProcessingResult> {
    const client = await this.aiModelPool.getModel('document-ai')
    
    const request = {
      name: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`,
      rawDocument: {
        content: chunk.buffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    }
    
    const [response] = await client.instance.processDocument(request)
    const document = response.document
    
    if (!document || !document.text) {
      throw new Error('No text extracted from document')
    }
    
    const metadata = this.extractMetadata(document, chunk)
    const confidence = this.calculateConfidence(document, metadata)
    
    return {
      chunkId: chunk.id,
      pageNumber: chunk.pageNumber,
      extractedText: document.text,
      confidence,
      processingTime: Date.now() - startTime,
      method: ProcessingMethod.DOCUMENT_AI,
      metadata
    }
  }

  /**
   * Process with Vision API
   */
  private async processWithVisionAPI(
    chunk: ProcessingChunk,
    startTime: number
  ): Promise<ProcessingResult> {
    const client = await this.aiModelPool.getModel('vision-api')
    
    const request = {
      image: {
        content: chunk.buffer.toString('base64')
      },
      features: [
        { type: 'DOCUMENT_TEXT_DETECTION' },
        { type: 'TEXT_DETECTION' }
      ]
    }
    
    const [response] = await client.instance.annotateImage(request)
    
    if (!response.fullTextAnnotation || !response.fullTextAnnotation.text) {
      throw new Error('No text detected in image')
    }
    
    const extractedText = response.fullTextAnnotation.text
    const metadata = this.extractVisionMetadata(response, chunk)
    const confidence = this.calculateVisionConfidence(response, metadata)
    
    return {
      chunkId: chunk.id,
      pageNumber: chunk.pageNumber,
      extractedText,
      confidence,
      processingTime: Date.now() - startTime,
      method: ProcessingMethod.VISION_API,
      metadata
    }
  }

  /**
   * Process with Gemini Vision
   */
  private async processWithGeminiVision(
    chunk: ProcessingChunk,
    startTime: number
  ): Promise<ProcessingResult> {
    const model = await this.aiModelPool.getModel('gemini-pro')
    
    const prompt = `Extract all text from this credit report page. Maintain the original structure and formatting. Focus on account information, payment history, and personal details.`
    
    const imagePart = {
      inlineData: {
        data: chunk.buffer.toString('base64'),
        mimeType: 'image/png'
      }
    }
    
    const result = await model.instance.generateContent([prompt, imagePart])
    const response = await result.response
    const extractedText = response.text()
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text extracted by Gemini Vision')
    }
    
    const metadata = this.extractGeminiMetadata(chunk)
    const confidence = this.calculateGeminiConfidence(extractedText, metadata)
    
    return {
      chunkId: chunk.id,
      pageNumber: chunk.pageNumber,
      extractedText,
      confidence,
      processingTime: Date.now() - startTime,
      method: ProcessingMethod.GEMINI_VISION,
      metadata
    }
  }

  /**
   * Process with hybrid method (combines multiple approaches)
   */
  private async processWithHybridMethod(
    chunk: ProcessingChunk,
    startTime: number
  ): Promise<ProcessingResult> {
    // Run Document AI and Vision API in parallel
    const [documentAIResult, visionAPIResult] = await Promise.allSettled([
      this.processWithDocumentAI(chunk, startTime),
      this.processWithVisionAPI(chunk, startTime)
    ])
    
    // Use the result with higher confidence
    let bestResult: ProcessingResult
    
    if (documentAIResult.status === 'fulfilled' && visionAPIResult.status === 'fulfilled') {
      bestResult = documentAIResult.value.confidence >= visionAPIResult.value.confidence
        ? documentAIResult.value
        : visionAPIResult.value
    } else if (documentAIResult.status === 'fulfilled') {
      bestResult = documentAIResult.value
    } else if (visionAPIResult.status === 'fulfilled') {
      bestResult = visionAPIResult.value
    } else {
      throw new Error('Both Document AI and Vision API failed')
    }
    
    // Update method to hybrid
    bestResult.method = ProcessingMethod.HYBRID
    bestResult.processingTime = Date.now() - startTime
    
    return bestResult
  }

  /**
   * Retry failed chunks with fallback methods
   */
  private async retryFailedChunks(failedChunks: ProcessingChunk[]): Promise<ProcessingResult[]> {
    console.log(`Retrying ${failedChunks.length} failed chunks`)
    
    const retryPromises = failedChunks.map(async (chunk) => {
      for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
        try {
          // Use exponential backoff
          if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          
          return await this.processChunkWithSemaphore(chunk)
        } catch (error) {
          console.warn(`Retry attempt ${attempt + 1} failed for chunk ${chunk.id}:`, error)
          
          if (attempt === this.options.retryAttempts - 1) {
            // Last attempt failed, create a minimal result
            return this.createFailureResult(chunk)
          }
        }
      }
      
      throw new Error(`All retry attempts failed for chunk ${chunk.id}`)
    })
    
    const results = await Promise.allSettled(retryPromises)
    return results
      .filter((result): result is PromiseFulfilledResult<ProcessingResult> => result.status === 'fulfilled')
      .map(result => result.value)
  }

  /**
   * Create failure result for chunks that couldn't be processed
   */
  private createFailureResult(chunk: ProcessingChunk): ProcessingResult {
    return {
      chunkId: chunk.id,
      pageNumber: chunk.pageNumber,
      extractedText: '',
      confidence: 0,
      processingTime: 0,
      method: chunk.processingMethod,
      metadata: {
        dimensions: { width: 0, height: 0 },
        fileSize: chunk.size,
        textBlocks: 0,
        imageQuality: 'low',
        processingTimestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Generate cache key for chunk
   */
  private generateCacheKey(chunk: ProcessingChunk): string {
    const hash = generateCacheHash({
      size: chunk.size,
      method: chunk.processingMethod,
      // Use first 1KB of buffer for hash to avoid memory issues
      bufferSample: chunk.buffer.subarray(0, 1024).toString('base64')
    })
    return `${chunk.processingMethod}_${hash}`
  }

  /**
   * Extract metadata from Document AI response
   */
  private extractMetadata(document: any, chunk: ProcessingChunk): ProcessingMetadata {
    const pages = document.pages || []
    const firstPage = pages[0] || {}
    
    return {
      dimensions: {
        width: firstPage.dimension?.width || 0,
        height: firstPage.dimension?.height || 0
      },
      fileSize: chunk.size,
      textBlocks: (firstPage.blocks || []).length,
      imageQuality: this.assessImageQuality(firstPage),
      processingTimestamp: new Date().toISOString()
    }
  }

  /**
   * Extract metadata from Vision API response
   */
  private extractVisionMetadata(response: any, chunk: ProcessingChunk): ProcessingMetadata {
    const textAnnotations = response.textAnnotations || []
    
    return {
      dimensions: {
        width: 0, // Vision API doesn't provide page dimensions
        height: 0
      },
      fileSize: chunk.size,
      textBlocks: textAnnotations.length,
      imageQuality: this.assessVisionImageQuality(response),
      processingTimestamp: new Date().toISOString()
    }
  }

  /**
   * Extract metadata for Gemini processing
   */
  private extractGeminiMetadata(chunk: ProcessingChunk): ProcessingMetadata {
    return {
      dimensions: { width: 0, height: 0 },
      fileSize: chunk.size,
      textBlocks: 0, // Gemini doesn't provide block information
      imageQuality: 'medium', // Assume medium quality
      processingTimestamp: new Date().toISOString()
    }
  }

  /**
   * Calculate confidence for Document AI results
   */
  private calculateConfidence(document: any, metadata: ProcessingMetadata): number {
    let confidence = 0.5 // Base confidence
    
    // Boost confidence based on text length
    if (document.text && document.text.length > 100) {
      confidence += 0.2
    }
    
    // Boost confidence based on number of text blocks
    if (metadata.textBlocks > 5) {
      confidence += 0.1
    }
    
    // Boost confidence based on image quality
    if (metadata.imageQuality === 'high') {
      confidence += 0.2
    } else if (metadata.imageQuality === 'medium') {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence)
  }

  /**
   * Calculate confidence for Vision API results
   */
  private calculateVisionConfidence(response: any, metadata: ProcessingMetadata): number {
    let confidence = 0.4 // Base confidence (slightly lower than Document AI)
    
    // Use Vision API confidence scores if available
    const textAnnotations = response.textAnnotations || []
    if (textAnnotations.length > 0) {
      const avgConfidence = textAnnotations
        .filter((annotation: any) => annotation.confidence)
        .reduce((sum: number, annotation: any) => sum + annotation.confidence, 0) / textAnnotations.length
      
      if (avgConfidence > 0) {
        confidence = avgConfidence
      }
    }
    
    // Adjust based on text blocks
    if (metadata.textBlocks > 10) {
      confidence += 0.1
    }
    
    return Math.min(1.0, confidence)
  }

  /**
   * Calculate confidence for Gemini results
   */
  private calculateGeminiConfidence(extractedText: string, metadata: ProcessingMetadata): number {
    let confidence = 0.6 // Base confidence for Gemini
    
    // Boost confidence based on text characteristics
    if (extractedText.length > 200) {
      confidence += 0.1
    }
    
    // Look for credit report indicators
    const creditIndicators = ['account', 'payment', 'balance', 'credit', 'score']
    const foundIndicators = creditIndicators.filter(indicator => 
      extractedText.toLowerCase().includes(indicator)
    ).length
    
    confidence += (foundIndicators / creditIndicators.length) * 0.2
    
    return Math.min(1.0, confidence)
  }

  /**
   * Assess image quality from Document AI page data
   */
  private assessImageQuality(page: any): 'high' | 'medium' | 'low' {
    const dimension = page.dimension || {}
    const width = dimension.width || 0
    const height = dimension.height || 0
    
    if (width > 1200 && height > 1500) {
      return 'high'
    } else if (width > 800 && height > 1000) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * Assess image quality from Vision API response
   */
  private assessVisionImageQuality(response: any): 'high' | 'medium' | 'low' {
    const textAnnotations = response.textAnnotations || []
    
    if (textAnnotations.length > 50) {
      return 'high'
    } else if (textAnnotations.length > 20) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * Log processing statistics
   */
  private logProcessingStats(results: ProcessingResult[], totalTime: number): void {
    const stats = {
      totalPages: results.length,
      totalTime,
      averageTimePerPage: totalTime / results.length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      methodBreakdown: results.reduce((acc, r) => {
        acc[r.method] = (acc[r.method] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      highConfidencePages: results.filter(r => r.confidence >= 0.8).length,
      lowConfidencePages: results.filter(r => r.confidence < 0.5).length
    }
    
    console.log('Parallel PDF Processing Stats:', stats)
    
    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'pdf_processing_complete', stats)
    }
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    semaphore: {
      availablePermits: number
      queueLength: number
    }
    aiModelPool: any
  } {
    return {
      semaphore: {
        availablePermits: this.semaphore.getAvailablePermits(),
        queueLength: this.semaphore.getQueueLength()
      },
      aiModelPool: this.aiModelPool.getPoolStats()
    }
  }

  /**
   * Shutdown processor and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down parallel PDF processor...')
    
    // Wait for all processing to complete
    while (this.semaphore.getAvailablePermits() < this.options.maxConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('Parallel PDF processor shutdown complete')
  }
}