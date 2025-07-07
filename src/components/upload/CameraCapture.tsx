'use client'

import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Camera, RotateCcw, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
  isOpen: boolean
}

export function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: facingMode,
    aspectRatio: 4 / 3
  }

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        setCapturedImage(imageSrc)
      }
    }
  }, [webcamRef])

  const retake = useCallback(() => {
    setCapturedImage(null)
  }, [])

  const saveImage = useCallback(() => {
    if (capturedImage) {
      // Convert base64 to file
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `credit-report-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          onCapture(file)
        })
        .catch(error => {
          console.error('Error saving image:', error)
        })
    }
  }, [capturedImage, onCapture])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Capture Credit Report
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </Button>
        </div>

        {/* Camera View */}
        <div className="relative">
          {!capturedImage ? (
            <div className="relative">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full h-64 object-cover"
              />
              
              {/* Camera Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={switchCamera}
                  className="bg-white/80 hover:bg-white text-gray-800 rounded-full p-2"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={capture}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4"
                >
                  <Camera className="w-6 h-6" />
                </Button>
              </div>

              {/* Guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 right-4 text-center">
                  <p className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                    Position your credit report within the frame
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured credit report"
                className="w-full h-64 object-cover"
              />
              
              {/* Image Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retake}
                  className="bg-white/80 hover:bg-white text-gray-800 rounded-full p-2"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={saveImage}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4"
                >
                  <Download className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 text-sm text-gray-600 dark:text-gray-400">
          {!capturedImage ? (
            <div className="space-y-2">
              <p>• Ensure good lighting for better OCR results</p>
              <p>• Keep the document flat and in focus</p>
              <p>• Avoid shadows and glare</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p>• Review the captured image</p>
              <p>• Tap the download button to save</p>
              <p>• Or retake if needed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 