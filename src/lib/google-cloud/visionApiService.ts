/**
 * Google Cloud Vision API Service
 * 
 * Provides text detection, image analysis, and fallback OCR processing
 * with comprehensive error handling and quality assessment.
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { googleCloudConfig } from './config';

export interface VisionAPIConfig {
  projectId: string;
  location: string;
  features: string[];
  supportedFormats: string[];
  maxImageSize: number;
  confidenceThreshold: number;
  languageHints: string[];
  fallbackEnabled: boolean;
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;
  };
  qualityAssessment: {
    enabled: boolean;
    minConfidence: number;
  };
  safeSearch: {
    enabled: boolean;
    adultThreshold: string;
    violenceThreshold: string;
  };
}

export interface VisionAPIResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    confidence: number;
    vertices: Array<{ x: number; y: number }>;
  }>;
  imageProperties?: {
    dominantColors: string[];
    quality: 'high' | 'medium' | 'low';
  };
  safeSearch?: {
    adult: string;
    violence: string;
    racy: string;
    medical: string;
  };
  processingTime: number;
  method: 'vision-api';
}

export interface VisionAPIError {
  code: string;
  message: string;
  details?: any;
}

class VisionAPIService {
  private client: ImageAnnotatorClient;
  private config: VisionAPIConfig;

  constructor() {
    // Initialize Vision API client
    this.client = new ImageAnnotatorClient({
      projectId: googleCloudConfig.projectId,
      keyFilename: googleCloudConfig.credentials.keyFile,
      credentials: googleCloudConfig.credentials.credentials
    });

    // Load configuration
    this.config = this.loadConfig();
  }

  private loadConfig(): VisionAPIConfig {
    try {
      const configPath = require.resolve('./vision-api-config.json');
      return require(configPath);
    } catch (error) {
      // Fallback configuration
      return {
        projectId: googleCloudConfig.projectId,
        location: googleCloudConfig.location,
        features: ['TEXT_DETECTION', 'DOCUMENT_TEXT_DETECTION', 'IMAGE_PROPERTIES', 'SAFE_SEARCH_DETECTION'],
        supportedFormats: ['PDF', 'PNG', 'JPEG', 'JPG', 'TIFF', 'GIF', 'BMP', 'WEBP'],
        maxImageSize: 20 * 1024 * 1024,
        confidenceThreshold: 0.8,
        languageHints: ['en'],
        fallbackEnabled: true,
        batchProcessing: {
          enabled: true,
          maxBatchSize: 16
        },
        qualityAssessment: {
          enabled: true,
          minConfidence: 0.7
        },
        safeSearch: {
          enabled: true,
          adultThreshold: 'LIKELY',
          violenceThreshold: 'LIKELY'
        }
      };
    }
  }  /**

   * Extract text from image using Vision API
   */
  async extractText(imageBuffer: Buffer, options: {
    features?: string[];
    languageHints?: string[];
    includeImageProperties?: boolean;
    includeSafeSearch?: boolean;
  } = {}): Promise<VisionAPIResult> {
    const startTime = Date.now();

    try {
      // Validate image size
      if (imageBuffer.length > this.config.maxImageSize) {
        throw new Error(`Image size (${imageBuffer.length} bytes) exceeds maximum allowed size (${this.config.maxImageSize} bytes)`);
      }

      // Prepare request features
      const features = [
        { type: 'DOCUMENT_TEXT_DETECTION' },
        { type: 'TEXT_DETECTION' }
      ];

      if (options.includeImageProperties || this.config.qualityAssessment.enabled) {
        features.push({ type: 'IMAGE_PROPERTIES' });
      }

      if (options.includeSafeSearch || this.config.safeSearch.enabled) {
        features.push({ type: 'SAFE_SEARCH_DETECTION' });
      }

      // Prepare image context
      const imageContext = {
        languageHints: options.languageHints || this.config.languageHints
      };

      // Make Vision API request
      const [result] = await this.client.annotateImage({
        image: { content: imageBuffer },
        features: features,
        imageContext: imageContext
      });

      // Process text annotations
      const textAnnotations = result.textAnnotations || [];
      const fullTextAnnotation = result.fullTextAnnotation;

      let extractedText = '';
      let confidence = 0;
      const boundingBoxes: Array<{
        text: string;
        confidence: number;
        vertices: Array<{ x: number; y: number }>;
      }> = [];

      if (fullTextAnnotation && fullTextAnnotation.text) {
        extractedText = fullTextAnnotation.text;
        
        // Calculate average confidence from pages
        if (fullTextAnnotation.pages) {
          const confidences = fullTextAnnotation.pages
            .flatMap(page => page.blocks || [])
            .flatMap(block => block.paragraphs || [])
            .flatMap(paragraph => paragraph.words || [])
            .map(word => word.confidence || 0)
            .filter(conf => conf > 0);
          
          confidence = confidences.length > 0 
            ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
            : 0;
        }
      } else if (textAnnotations.length > 0) {
        extractedText = textAnnotations[0].description || '';
        confidence = 0.8; // Default confidence for basic text detection
      }

      // Process bounding boxes
      textAnnotations.slice(1).forEach(annotation => {
        if (annotation.boundingPoly && annotation.boundingPoly.vertices) {
          boundingBoxes.push({
            text: annotation.description || '',
            confidence: 0.8, // Vision API doesn't provide word-level confidence
            vertices: annotation.boundingPoly.vertices.map(vertex => ({
              x: vertex.x || 0,
              y: vertex.y || 0
            }))
          });
        }
      });

      // Process image properties
      let imageProperties;
      if (result.imagePropertiesAnnotation) {
        const props = result.imagePropertiesAnnotation;
        imageProperties = {
          dominantColors: props.dominantColors?.colors?.map(color => 
            `rgb(${Math.round((color.color?.red || 0) * 255)}, ${Math.round((color.color?.green || 0) * 255)}, ${Math.round((color.color?.blue || 0) * 255)})`
          ) || [],
          quality: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low'
        };
      }

      // Process safe search
      let safeSearch;
      if (result.safeSearchAnnotation) {
        const safe = result.safeSearchAnnotation;
        safeSearch = {
          adult: safe.adult || 'UNKNOWN',
          violence: safe.violence || 'UNKNOWN', 
          racy: safe.racy || 'UNKNOWN',
          medical: safe.medical || 'UNKNOWN'
        };
      }

      const processingTime = Date.now() - startTime;

      return {
        text: extractedText,
        confidence,
        boundingBoxes,
        imageProperties,
        safeSearch,
        processingTime,
        method: 'vision-api'
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      const errorObj = error as any;
      throw {
        code: errorObj.code || 'VISION_API_ERROR',
        message: errorObj.message || 'Unknown Vision API error',
        details: error,
        processingTime
      } as VisionAPIError;
    }
  }  /**

   * Batch process multiple images
   */
  async batchExtractText(imageBuffers: Buffer[], options: {
    features?: string[];
    languageHints?: string[];
    includeImageProperties?: boolean;
    includeSafeSearch?: boolean;
  } = {}): Promise<VisionAPIResult[]> {
    if (!this.config.batchProcessing.enabled) {
      // Process sequentially if batch processing is disabled
      const results: VisionAPIResult[] = [];
      for (const buffer of imageBuffers) {
        results.push(await this.extractText(buffer, options));
      }
      return results;
    }

    // Process in batches
    const results: VisionAPIResult[] = [];
    const batchSize = Math.min(imageBuffers.length, this.config.batchProcessing.maxBatchSize);
    
    for (let i = 0; i < imageBuffers.length; i += batchSize) {
      const batch = imageBuffers.slice(i, i + batchSize);
      const batchPromises = batch.map(buffer => this.extractText(buffer, options));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Validate image format and quality
   */
  validateImage(imageBuffer: Buffer, filename?: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (imageBuffer.length > this.config.maxImageSize) {
      errors.push(`Image size (${imageBuffer.length} bytes) exceeds maximum allowed size (${this.config.maxImageSize} bytes)`);
    }

    // Check format based on filename extension
    if (filename) {
      const extension = filename.split('.').pop()?.toUpperCase();
      if (extension && !this.config.supportedFormats.includes(extension)) {
        errors.push(`Unsupported image format: ${extension}. Supported formats: ${this.config.supportedFormats.join(', ')}`);
      }
    }

    // Basic image header validation
    const header = imageBuffer.slice(0, 8);
    const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    const isJPEG = header[0] === 0xFF && header[1] === 0xD8;
    const isPDF = header.toString('ascii', 0, 4) === '%PDF';
    const isTIFF = (header[0] === 0x49 && header[1] === 0x49) || (header[0] === 0x4D && header[1] === 0x4D);

    if (!isPNG && !isJPEG && !isPDF && !isTIFF) {
      errors.push('Invalid or unsupported image format detected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get service configuration
   */
  getConfig(): VisionAPIConfig {
    return { ...this.config };
  }

  /**
   * Test Vision API connectivity
   */
  async testConnectivity(): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      // Create a minimal test image (1x1 pixel PNG)
      const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      
      await this.extractText(testImage, { features: ['TEXT_DETECTION'] });
      
      return {
        success: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message || 'Unknown error',
        latency: Date.now() - startTime
      };
    }
  }
}

// Export singleton instance
export const visionApiService = new VisionAPIService();
export default visionApiService;