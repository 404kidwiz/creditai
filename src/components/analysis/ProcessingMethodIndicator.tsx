'use client'

import React from 'react'
import { 
  Zap, 
  Eye, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'

interface ProcessingMethodIndicatorProps {
  method: string
  confidence?: number
  showIcon?: boolean
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ProcessingMethodIndicator: React.FC<ProcessingMethodIndicatorProps> = ({
  method,
  confidence,
  showIcon = true,
  showTooltip = true,
  size = 'md',
  className = ''
}) => {
  const getMethodInfo = (method: string) => {
    switch (method) {
      case 'document_ai':
        return {
          label: 'Document AI',
          description: 'Google Cloud Document AI - Highest accuracy OCR processing',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
          icon: Zap,
          quality: 'excellent'
        }
      case 'vision_api':
        return {
          label: 'Vision API',
          description: 'Google Cloud Vision API - High quality OCR processing',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
          icon: Eye,
          quality: 'good'
        }
      case 'tesseract':
        return {
          label: 'Tesseract OCR',
          description: 'Open source OCR - Good quality text extraction',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
          icon: FileText,
          quality: 'fair'
        }
      case 'fallback':
        return {
          label: 'Fallback OCR',
          description: 'Basic OCR processing - May have reduced accuracy',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
          icon: AlertTriangle,
          quality: 'basic'
        }
      default:
        return {
          label: method || 'Unknown',
          description: 'Processing method not specified',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          icon: Info,
          quality: 'unknown'
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-sm'
      default:
        return 'px-3 py-1 text-sm'
    }
  }

  const methodInfo = getMethodInfo(method)
  const Icon = methodInfo.icon
  const sizeClasses = getSizeClasses(size)

  const badge = (
    <span 
      className={`inline-flex items-center space-x-1 font-medium rounded-full ${methodInfo.color} ${sizeClasses} ${className}`}
      title={showTooltip ? methodInfo.description : undefined}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      <span>{methodInfo.label}</span>
      {confidence && (
        <span className="ml-1 opacity-75">
          ({confidence.toFixed(0)}%)
        </span>
      )}
    </span>
  )

  if (showTooltip) {
    return (
      <div className="group relative">
        {badge}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {methodInfo.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      </div>
    )
  }

  return badge
}

// Quality indicator component
export const DataQualityIndicator: React.FC<{
  confidence: number
  processingMethod: string
  showDetails?: boolean
}> = ({ confidence, processingMethod, showDetails = false }) => {
  const getQualityLevel = (confidence: number) => {
    if (confidence >= 85) return { level: 'high', color: 'text-green-600 dark:text-green-400', icon: CheckCircle }
    if (confidence >= 70) return { level: 'medium', color: 'text-yellow-600 dark:text-yellow-400', icon: AlertTriangle }
    return { level: 'low', color: 'text-red-600 dark:text-red-400', icon: AlertTriangle }
  }

  const quality = getQualityLevel(confidence)
  const Icon = quality.icon

  return (
    <div className="flex items-center space-x-2">
      <Icon className={`w-4 h-4 ${quality.color}`} />
      <span className={`font-medium ${quality.color}`}>
        {confidence.toFixed(1)}% confidence
      </span>
      {showDetails && (
        <ProcessingMethodIndicator 
          method={processingMethod} 
          size="sm" 
          showIcon={false}
        />
      )}
    </div>
  )
}

export default ProcessingMethodIndicator