/**
 * Fallback OCR Configuration
 * 
 * Provides fallback OCR processing when Vision API is unavailable
 * or when processing fails. Includes client-side OCR options.
 */

export interface FallbackOCRConfig {
  enabled: boolean;
  methods: Array<'tesseract' | 'client-side' | 'manual-review'>;
  tesseract?: {
    language: string;
    oem: number;
    psm: number;
  };
  clientSide?: {
    enabled: boolean;
    libraries: string[];
  };
  manualReview?: {
    enabled: boolean;
    threshold: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    exponentialBackoff: boolean;
  };
}

export const fallbackOCRConfig: FallbackOCRConfig = {
  enabled: true,
  methods: ['tesseract', 'client-side', 'manual-review'],
  tesseract: {
    language: 'eng',
    oem: 3, // Default OCR Engine Mode
    psm: 6  // Uniform block of text
  },
  clientSide: {
    enabled: true,
    libraries: ['tesseract.js']
  },
  manualReview: {
    enabled: true,
    threshold: 0.5 // Trigger manual review if confidence < 50%
  },
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    exponentialBackoff: true
  }
};

export interface FallbackOCRResult {
  text: string;
  confidence: number;
  method: 'tesseract' | 'client-side' | 'manual-review';
  processingTime: number;
  requiresManualReview: boolean;
}

export class FallbackOCRService {
  private config: FallbackOCRConfig;

  constructor(config?: Partial<FallbackOCRConfig>) {
    this.config = { ...fallbackOCRConfig, ...config };
  }

  /**
   * Process image with fallback OCR methods
   */
  async processImage(imageBuffer: Buffer, options: {
    preferredMethod?: 'tesseract' | 'client-side';
    skipManualReview?: boolean;
  } = {}): Promise<FallbackOCRResult> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      throw new Error('Fallback OCR is disabled');
    }

    // Try preferred method first
    if (options.preferredMethod && this.config.methods.includes(options.preferredMethod)) {
      try {
        return await this.processWithMethod(imageBuffer, options.preferredMethod, startTime);
      } catch (error) {
        console.warn(`Preferred method ${options.preferredMethod} failed:`, (error as Error).message);
      }
    }

    // Try each configured method in order
    for (const method of this.config.methods) {
      if (method === 'manual-review' && options.skipManualReview) {
        continue;
      }

      try {
        return await this.processWithMethod(imageBuffer, method, startTime);
      } catch (error) {
        console.warn(`Fallback method ${method} failed:`, (error as Error).message);
        continue;
      }
    }

    // If all methods fail, return manual review result
    return {
      text: '',
      confidence: 0,
      method: 'manual-review',
      processingTime: Date.now() - startTime,
      requiresManualReview: true
    };
  }

  private async processWithMethod(
    imageBuffer: Buffer, 
    method: 'tesseract' | 'client-side' | 'manual-review',
    startTime: number
  ): Promise<FallbackOCRResult> {
    switch (method) {
      case 'tesseract':
        return await this.processTesseract(imageBuffer, startTime);
      
      case 'client-side':
        return await this.processClientSide(imageBuffer, startTime);
      
      case 'manual-review':
        return {
          text: '',
          confidence: 0,
          method: 'manual-review',
          processingTime: Date.now() - startTime,
          requiresManualReview: true
        };
      
      default:
        throw new Error(`Unknown fallback method: ${method}`);
    }
  }

  private async processTesseract(imageBuffer: Buffer, startTime: number): Promise<FallbackOCRResult> {
    // Note: This would require tesseract.js or node-tesseract to be installed
    // For now, we'll return a placeholder implementation
    
    throw new Error('Tesseract OCR not implemented - requires tesseract.js dependency');
    
    // Implementation would look like:
    // const { createWorker } = require('tesseract.js');
    // const worker = createWorker();
    // await worker.load();
    // await worker.loadLanguage(this.config.tesseract.language);
    // await worker.initialize(this.config.tesseract.language);
    // const { data: { text, confidence } } = await worker.recognize(imageBuffer);
    // await worker.terminate();
    // 
    // return {
    //   text,
    //   confidence: confidence / 100,
    //   method: 'tesseract',
    //   processingTime: Date.now() - startTime,
    //   requiresManualReview: confidence < (this.config.manualReview?.threshold || 0.5) * 100
    // };
  }

  private async processClientSide(imageBuffer: Buffer, startTime: number): Promise<FallbackOCRResult> {
    // Client-side OCR would be handled by the frontend
    // This method would typically return instructions for client-side processing
    
    return {
      text: '',
      confidence: 0,
      method: 'client-side',
      processingTime: Date.now() - startTime,
      requiresManualReview: true
    };
  }

  /**
   * Get fallback configuration
   */
  getConfig(): FallbackOCRConfig {
    return { ...this.config };
  }

  /**
   * Update fallback configuration
   */
  updateConfig(updates: Partial<FallbackOCRConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export singleton instance
export const fallbackOCRService = new FallbackOCRService();
export default fallbackOCRService;