'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  FileText, 
  MessageSquare,
  Phone,
  Mail,
  Clock
} from 'lucide-react'

interface ManualReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reviewData: {
    issues: string[]
    additionalNotes: string
    contactPreference: string
  }) => void
  extractedData: any
}

export const ManualReviewModal: React.FC<ManualReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  extractedData
}) => {
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [contactPreference, setContactPreference] = useState('email')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const commonIssues = [
    'Credit scores not extracted correctly',
    'Account information is incomplete or inaccurate',
    'Payment history data is missing or wrong',
    'Personal information extraction errors',
    'Negative items not properly identified',
    'Credit inquiries missing or incorrect',
    'Document quality issues affecting extraction',
    'Processing method used fallback OCR',
    'Low confidence scores on critical data',
    'Bureau-specific data inconsistencies'
  ]

  const handleIssueToggle = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    )
  }

  const handleSubmit = async () => {
    if (selectedIssues.length === 0 && !additionalNotes.trim()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit({
        issues: selectedIssues,
        additionalNotes: additionalNotes.trim(),
        contactPreference
      })
      
      // Reset form
      setSelectedIssues([])
      setAdditionalNotes('')
      setContactPreference('email')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const extractionConfidence = extractedData?.extractedText?.confidence || 0
  const processingMethod = extractedData?.extractedText?.processingMethod || 'unknown'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <Eye className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Request Manual Review
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our experts will manually review your credit report for improved accuracy
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Current Analysis Summary */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Current Analysis Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Extraction Confidence:</span>
                <span className={`font-medium ${
                  extractionConfidence >= 85 ? 'text-green-600 dark:text-green-400' :
                  extractionConfidence >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {extractionConfidence.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Processing Method:</span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  processingMethod === 'document_ai' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : processingMethod === 'vision_api'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                }`}>
                  {processingMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Credit Scores Found:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {extractedData?.creditScores ? Object.keys(extractedData.creditScores).length : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Accounts Found:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {extractedData?.accounts?.length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Issue Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              What issues did you notice? (Select all that apply)
            </h3>
            <div className="space-y-2">
              {commonIssues.map((issue, index) => (
                <label
                  key={index}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIssues.includes(issue)}
                    onChange={() => handleIssueToggle(issue)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-gray-900 dark:text-white">{issue}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Describe any specific issues or provide additional context..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Contact Preference */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              How would you like us to contact you with the results?
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="contact"
                  value="email"
                  checked={contactPreference === 'email'}
                  onChange={(e) => setContactPreference(e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Email</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">We'll send you the improved results via email</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="contact"
                  value="phone"
                  checked={contactPreference === 'phone'}
                  onChange={(e) => setContactPreference(e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Phone Call</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">We'll call you to discuss the results</p>
                </div>
              </label>
            </div>
          </div>

          {/* Timeline Info */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-900 dark:text-blue-100">Review Timeline</span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Our expert team will manually review your credit report and provide improved results within 24-48 hours. 
              You'll receive a notification when the review is complete.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedIssues.length === 0 && !additionalNotes.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Submit Review Request</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ManualReviewModal