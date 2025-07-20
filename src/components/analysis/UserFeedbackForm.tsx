/**
 * User Feedback Form for PDF Processing
 * Collects user feedback on extraction accuracy and performance
 */

'use client'

import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Alert } from '../ui/Alert'

interface UserFeedbackFormProps {
  processingId: string
  onFeedbackSubmitted?: () => void
}

export function UserFeedbackForm({ processingId, onFeedbackSubmitted }: UserFeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [accuracyRating, setAccuracyRating] = useState<number | null>(null)
  const [speedRating, setSpeedRating] = useState<number | null>(null)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!rating || !accuracyRating || !speedRating) {
      setError('Please provide ratings before submitting')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      const response = await fetch('/api/feedback/pdf-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processingId,
          rating,
          accuracyRating,
          speedRating,
          comments
        })
      })
      
      if (!response.ok) {
        throw new Error(`Error submitting feedback: ${response.statusText}`)
      }
      
      setSuccess(true)
      
      // Reset form
      setRating(null)
      setAccuracyRating(null)
      setSpeedRating(null)
      setComments('')
      
      // Notify parent component
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted()
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
      console.error('Feedback submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number | null, 
    onChange: (rating: number) => void,
    label: string
  }) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="focus:outline-none"
            >
              <svg
                className={`w-8 h-8 ${
                  (value || 0) >= star ? 'text-yellow-400' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {value ? `${value} star${value !== 1 ? 's' : ''}` : 'Select rating'}
          </span>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <Card className="p-6">
        <Alert variant="success">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Thank you for your feedback!</span>
          </div>
        </Alert>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">How did we do?</h3>
      <p className="text-sm text-gray-600 mb-4">
        Please rate your experience with our PDF processing system. Your feedback helps us improve.
      </p>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <StarRating 
          value={rating} 
          onChange={setRating} 
          label="Overall Experience" 
        />
        
        <StarRating 
          value={accuracyRating} 
          onChange={setAccuracyRating} 
          label="Extraction Accuracy" 
        />
        
        <StarRating 
          value={speedRating} 
          onChange={setSpeedRating} 
          label="Processing Speed" 
        />
        
        <div className="mb-4">
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Comments
          </label>
          <textarea
            id="comments"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us what worked well or what could be improved..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </Card>
  )
}