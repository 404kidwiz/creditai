export interface GoogleCloudConfig {
  projectId: string
  location: string
  documentAiProcessorId: string
  documentAiProcessors?: ProcessorInfo[]
  visionApiEnabled: boolean
  documentAiEnabled: boolean
  credentials: {
    type: 'service-account' | 'application-default' | 'environment' | 'api-key'
    keyFile?: string
    credentials?: any
    apiKey?: string
  }
}

export interface ProcessorInfo {
  id: string
  type: string
  displayName: string
  state?: string
}

export const googleCloudConfig: GoogleCloudConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
  documentAiProcessorId: process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID || '',
  documentAiProcessors: process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSORS ? 
    JSON.parse(process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSORS) : undefined,
  visionApiEnabled: process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true',
  documentAiEnabled: process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true',
  credentials: {
    type: process.env.GOOGLE_CLOUD_CREDENTIALS_TYPE as 'service-account' | 'application-default' | 'environment' | 'api-key' || 'service-account',
    keyFile: process.env.GOOGLE_CLOUD_KEY_FILE,
    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ?
      JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined,
    apiKey: process.env.GOOGLE_AI_API_KEY
  }
}

export function validateGoogleCloudConfig(): string[] {
  const errors: string[] = []
  
  if (!googleCloudConfig.projectId) {
    errors.push('GOOGLE_CLOUD_PROJECT_ID is required')
  }
  
  if (!googleCloudConfig.visionApiEnabled && !googleCloudConfig.documentAiEnabled) {
    errors.push('At least one Google Cloud service must be enabled (Vision API or Document AI)')
  }
  
  if (googleCloudConfig.documentAiEnabled && !googleCloudConfig.documentAiProcessorId) {
    errors.push('GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID is required when Document AI is enabled')
  }
  
  // Validate authentication method
  if (googleCloudConfig.credentials.type === 'api-key' && !googleCloudConfig.credentials.apiKey) {
    errors.push('GOOGLE_AI_API_KEY is required when using API key authentication')
  } else if (googleCloudConfig.credentials.type === 'service-account' && !googleCloudConfig.credentials.keyFile && !googleCloudConfig.credentials.credentials) {
    errors.push('Service account key file or credentials are required when using service account authentication')
  }
  
  return errors
}

export function isGoogleCloudConfigured(): boolean {
  return validateGoogleCloudConfig().length === 0
} 