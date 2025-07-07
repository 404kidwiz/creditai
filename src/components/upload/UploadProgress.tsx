'use client'

import React from 'react'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadProgressProps {
  status: 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  message: string
  className?: string
}

export function UploadProgress({ status, progress, message, className }: UploadProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  const getStatusBg = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20'
    }
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      getStatusBg(),
      "border-gray-200 dark:border-gray-700",
      className
    )}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {status === 'uploading' && 'Uploading File...'}
              {status === 'processing' && 'Processing...'}
              {status === 'complete' && 'Upload Complete'}
              {status === 'error' && 'Upload Failed'}
            </p>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progress}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300 ease-out",
                getStatusColor()
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

interface OCRProgressProps {
  status: 'loading' | 'recognizing' | 'parsing' | 'complete' | 'error'
  progress: number
  message: string
  className?: string
}

export function OCRProgress({ status, progress, message, className }: OCRProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-purple-500'
    }
  }

  const getStatusBg = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-50 dark:bg-green-900/20'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20'
      default:
        return 'bg-purple-50 dark:bg-purple-900/20'
    }
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      getStatusBg(),
      "border-gray-200 dark:border-gray-700",
      className
    )}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {status === 'loading' && 'Initializing OCR...'}
              {status === 'recognizing' && 'Extracting Text...'}
              {status === 'parsing' && 'Parsing Credit Data...'}
              {status === 'complete' && 'OCR Complete'}
              {status === 'error' && 'OCR Failed'}
            </p>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progress}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300 ease-out",
                getStatusColor()
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
} 