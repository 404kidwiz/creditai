'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, Image as ImageIcon, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  maxSize?: number
  accept?: string[]
  disabled?: boolean
}

export function FileDropzone({ 
  onFileSelect, 
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  disabled = false 
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('File type not supported. Please upload JPG, PNG, or PDF files.')
      } else {
        setError('File upload failed. Please try again.')
      }
      return
    }

    if (acceptedFiles.length > 0 && acceptedFiles[0]) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    multiple: false,
    disabled
  })

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />
    } else if (type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />
    }
    return <File className="w-8 h-8 text-gray-500" />
  }

  const getFileTypeText = (type: string) => {
    if (type.startsWith('image/')) {
      return 'Image'
    } else if (type === 'application/pdf') {
      return 'PDF'
    }
    return 'File'
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          "hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20",
          isDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
          disabled && "opacity-50 cursor-not-allowed hover:border-gray-300 hover:bg-transparent",
          error && "border-red-300 bg-red-50 dark:bg-red-900/20"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            "p-4 rounded-full",
            isDragActive ? "bg-blue-100 dark:bg-blue-800" : "bg-gray-100 dark:bg-gray-800"
          )}>
            <Upload className={cn(
              "w-8 h-8",
              isDragActive ? "text-blue-600" : "text-gray-600 dark:text-gray-400"
            )} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isDragActive ? 'Drop your file here' : 'Upload Credit Report'}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop your file here, or click to browse
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Supports JPG, PNG, PDF • Max {maxSize / (1024 * 1024)}MB
            </p>
          </div>

          {/* File Type Icons */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              {getFileIcon('image/jpeg')}
              <span>Images</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              {getFileIcon('application/pdf')}
              <span>PDF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
          <X className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Upload Tips:
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Ensure good lighting for better OCR results</li>
          <li>• Keep documents flat and in focus</li>
          <li>• Avoid shadows, glare, and blur</li>
          <li>• For PDFs, ensure text is selectable (not scanned images)</li>
        </ul>
      </div>
    </div>
  )
} 