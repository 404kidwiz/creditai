'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { disputeLetterGenerator, DisputeLetter, DisputeLetterTemplate } from '@/lib/disputes/disputeLetterGenerator'
import { DisputeRecommendation } from '@/lib/ai/creditAnalyzer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

interface DisputeLetterGeneratorProps {
  recommendations: DisputeRecommendation[]
  onLetterGenerated?: (letter: DisputeLetter) => void
}

export function DisputeLetterGenerator({ 
  recommendations, 
  onLetterGenerated 
}: DisputeLetterGeneratorProps) {
  const { user } = useAuth()
  const [selectedRecommendation, setSelectedRecommendation] = useState<DisputeRecommendation | null>(null)
  const [templates, setTemplates] = useState<DisputeLetterTemplate[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLetter, setGeneratedLetter] = useState<DisputeLetter | null>(null)
  const [userInfo, setUserInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  })
  const [creditorInfo, setCreditorInfo] = useState({
    name: '',
    address: '',
    accountNumber: ''
  })

  useEffect(() => {
    const availableTemplates = disputeLetterGenerator.getTemplates()
    setTemplates(availableTemplates)
  }, [])

  const handleGenerateLetter = async () => {
    if (!selectedRecommendation || !user) return

    setIsGenerating(true)
    try {
      const letter = await disputeLetterGenerator.generateLetter(
        user.id,
        selectedRecommendation,
        userInfo,
        creditorInfo
      )
      
      setGeneratedLetter(letter)
      onLetterGenerated?.(letter)
    } catch (error) {
      console.error('Error generating letter:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const getTemplate = (templateType: string) => {
    return templates.find(t => t.type === templateType)
  }

  if (recommendations.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dispute Recommendations</h3>
          <p className="text-gray-600">
            Upload a credit report to get AI-powered dispute recommendations.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Recommendation */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📋 Step 1: Select Dispute Item
        </h3>
        <div className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="recommendation"
                  value={index}
                  checked={selectedRecommendation === recommendation}
                  onChange={() => setSelectedRecommendation(recommendation)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {recommendation.disputeReason}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                      recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {recommendation.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {recommendation.legalBasis}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Expected Impact: {recommendation.expectedImpact}
                  </p>
                </div>
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* Step 2: Template Info */}
      {selectedRecommendation && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📝 Step 2: Letter Template
          </h3>
          {(() => {
            const template = getTemplate(selectedRecommendation.letterTemplate)
            if (!template) return <p className="text-red-600">Template not found</p>
            
            return (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900">{template.title}</h4>
                <p className="text-sm text-blue-700 mt-1">{template.description}</p>
                <p className="text-xs text-blue-600 mt-2">
                  <span className="font-medium">Legal Basis:</span> {template.legalBasis}
                </p>
              </div>
            )
          })()}
        </Card>
      )}

      {/* Step 3: User Information */}
      {selectedRecommendation && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            👤 Step 3: Your Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={userInfo.name}
                onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                placeholder="Your full legal name"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={userInfo.phone}
                onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                placeholder="(555) 123-4567"
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Full Address *</Label>
              <Input
                id="address"
                value={userInfo.address}
                onChange={(e) => setUserInfo({...userInfo, address: e.target.value})}
                placeholder="123 Main St, City, State 12345"
                required
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Creditor Information */}
      {selectedRecommendation && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🏢 Step 4: Creditor Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="creditorName">Creditor Name *</Label>
              <Input
                id="creditorName"
                value={creditorInfo.name}
                onChange={(e) => setCreditorInfo({...creditorInfo, name: e.target.value})}
                placeholder="Company name"
                required
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={creditorInfo.accountNumber}
                onChange={(e) => setCreditorInfo({...creditorInfo, accountNumber: e.target.value})}
                placeholder="Account or reference number"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="creditorAddress">Creditor Address</Label>
              <Input
                id="creditorAddress"
                value={creditorInfo.address}
                onChange={(e) => setCreditorInfo({...creditorInfo, address: e.target.value})}
                placeholder="Company address (optional)"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 5: Generate Letter */}
      {selectedRecommendation && userInfo.name && userInfo.email && creditorInfo.name && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🚀 Step 5: Generate Letter
          </h3>
          <Button
            onClick={handleGenerateLetter}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? 'Generating Letter...' : 'Generate Dispute Letter'}
          </Button>
        </Card>
      )}

      {/* Generated Letter Display */}
      {generatedLetter && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            ✅ Generated Dispute Letter
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Letter ID: {generatedLetter.id}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                generatedLetter.status === 'generated' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {generatedLetter.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Type:</span> {generatedLetter.letterType}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Creditor:</span> {generatedLetter.creditorName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Created:</span> {generatedLetter.createdAt.toLocaleDateString()}
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label>Letter Content:</Label>
              <pre className="bg-white border rounded-lg p-4 text-sm whitespace-pre-wrap overflow-auto max-h-96">
                {generatedLetter.letterContent}
              </pre>
            </div>
            
            <div className="flex space-x-4">
              <Button
                onClick={() => navigator.clipboard.writeText(generatedLetter.letterContent)}
                variant="outline"
              >
                📋 Copy Letter
              </Button>
              <Button
                onClick={() => {
                  const blob = new Blob([generatedLetter.letterContent], { type: 'text/plain' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `dispute-letter-${generatedLetter.id}.txt`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
                variant="outline"
              >
                📥 Download Letter
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}