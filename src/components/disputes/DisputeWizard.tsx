'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  FileText,
  Send,
  Download,
  Edit,
  Target,
  Shield,
  Clock,
  HelpCircle,
  Sparkles
} from 'lucide-react'
import { CreditAccount, NegativeItem } from '@/types/credit-ui'
import { motion, AnimatePresence } from 'framer-motion'

interface DisputeWizardProps {
  negativeItems: NegativeItem[]
  accounts: CreditAccount[]
  onComplete: (disputeData: DisputeData) => void
  onCancel: () => void
}

interface DisputeData {
  selectedItems: string[]
  disputeReasons: Record<string, string[]>
  personalStatement: string
  contactInfo: {
    name: string
    address: string
    phone: string
    email: string
  }
  supportingDocs: string[]
  bureausToDispute: string[]
}

type WizardStep = 'selection' | 'reasons' | 'details' | 'review' | 'submit'

export function DisputeWizard({ negativeItems, accounts, onComplete, onCancel }: DisputeWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('selection')
  const [disputeData, setDisputeData] = useState<DisputeData>({
    selectedItems: [],
    disputeReasons: {},
    personalStatement: '',
    contactInfo: {
      name: '',
      address: '',
      phone: '',
      email: ''
    },
    supportingDocs: [],
    bureausToDispute: ['experian', 'equifax', 'transunion']
  })

  const steps: { id: WizardStep; label: string; icon: any }[] = [
    { id: 'selection', label: 'Select Items', icon: Target },
    { id: 'reasons', label: 'Dispute Reasons', icon: Shield },
    { id: 'details', label: 'Your Details', icon: Edit },
    { id: 'review', label: 'Review', icon: FileText },
    { id: 'submit', label: 'Submit', icon: Send }
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  const getItemDetails = (itemId: string): NegativeItem | CreditAccount | undefined => {
    const negativeItem = negativeItems.find(item => item.id === itemId)
    if (negativeItem) return negativeItem
    return accounts.find(acc => acc.id === itemId)
  }

  const getEstimatedImpact = (): number => {
    return disputeData.selectedItems.reduce((total, itemId) => {
      const item = getItemDetails(itemId) as NegativeItem
      return total + (item?.impactScore || 0)
    }, 0)
  }

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['selection', 'reasons', 'details', 'review', 'submit']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    const stepOrder: WizardStep[] = ['selection', 'reasons', 'details', 'review', 'submit']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleSubmit = () => {
    onComplete(disputeData)
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'selection':
        return disputeData.selectedItems.length > 0
      case 'reasons':
        return Object.keys(disputeData.disputeReasons).length === disputeData.selectedItems.length
      case 'details':
        const { name, address, phone, email } = disputeData.contactInfo
        return !!(name && address && phone && email)
      case 'review':
        return true
      default:
        return false
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Dispute Wizard
            </h2>
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-white hover:bg-white/20">
              Cancel
            </Button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isActive ? 'bg-white text-blue-600' : 
                        isCompleted ? 'bg-green-500 text-white' : 'bg-white/30 text-white/70'}
                    `}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-400' : 'bg-white/30'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <AnimatePresence mode="wait">
            {currentStep === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-2">Select Items to Dispute</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose the negative items or accounts you want to dispute. Focus on items with the highest impact on your credit score.
                  </p>
                </div>

                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tip: Start with items that are most likely to be removed, such as duplicate entries, 
                    outdated information, or accounts that don't belong to you.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {negativeItems.map(item => {
                    const isSelected = disputeData.selectedItems.includes(item.id)
                    return (
                      <Card 
                        key={item.id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:shadow-md'
                        }`}
                        onClick={() => {
                          setDisputeData(prev => ({
                            ...prev,
                            selectedItems: isSelected 
                              ? prev.selectedItems.filter(id => id !== item.id)
                              : [...prev.selectedItems, item.id]
                          }))
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{item.creditorName}</h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  item.priority === 'high' 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                    : item.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                }`}>
                                  {item.priority} priority
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-500">Amount: ${item.amount.toLocaleString()}</span>
                                <span className="text-gray-500">Date: {new Date(item.date).toLocaleDateString()}</span>
                                <span className="font-medium text-orange-600">Impact: -{item.impactScore} points</span>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {disputeData.selectedItems.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Selected Items: {disputeData.selectedItems.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Estimated credit score improvement: +{getEstimatedImpact()} points
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 'reasons' && (
              <motion.div
                key="reasons"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-2">Select Dispute Reasons</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose the most accurate reasons for disputing each item. Be specific and truthful.
                  </p>
                </div>

                {disputeData.selectedItems.map(itemId => {
                  const item = getItemDetails(itemId) as NegativeItem
                  const selectedReasons = disputeData.disputeReasons[itemId] || []
                  
                  const commonReasons = [
                    'This account is not mine',
                    'Information is inaccurate',
                    'Account was paid on time',
                    'Account was paid in full',
                    'Account is outdated (over 7 years)',
                    'Duplicate entry',
                    'Identity theft',
                    'Unauthorized account',
                    'Incorrect balance',
                    'Wrong account status'
                  ]

                  return (
                    <Card key={itemId}>
                      <CardHeader>
                        <CardTitle className="text-lg">{item?.creditorName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {commonReasons.map(reason => {
                          const isSelected = selectedReasons.includes(reason)
                          return (
                            <label
                              key={reason}
                              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setDisputeData(prev => ({
                                    ...prev,
                                    disputeReasons: {
                                      ...prev.disputeReasons,
                                      [itemId]: e.target.checked
                                        ? [...selectedReasons, reason]
                                        : selectedReasons.filter(r => r !== reason)
                                    }
                                  }))
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm">{reason}</span>
                            </label>
                          )
                        })}
                      </CardContent>
                    </Card>
                  )
                })}
              </motion.div>
            )}

            {currentStep === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-2">Your Contact Information</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Provide your contact details for the dispute letters.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      value={disputeData.contactInfo.name}
                      onChange={(e) => setDisputeData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={disputeData.contactInfo.email}
                      onChange={(e) => setDisputeData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={disputeData.contactInfo.phone}
                      onChange={(e) => setDisputeData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, phone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={disputeData.contactInfo.address}
                      onChange={(e) => setDisputeData(prev => ({
                        ...prev,
                        contactInfo: { ...prev.contactInfo, address: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="123 Main St, City, ST 12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Personal Statement (Optional)
                  </label>
                  <textarea
                    value={disputeData.personalStatement}
                    onChange={(e) => setDisputeData(prev => ({
                      ...prev,
                      personalStatement: e.target.value
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Provide any additional context or explanation..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Credit Bureaus to Dispute With
                  </label>
                  <div className="flex gap-4">
                    {['experian', 'equifax', 'transunion'].map(bureau => (
                      <label key={bureau} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={disputeData.bureausToDispute.includes(bureau)}
                          onChange={(e) => {
                            setDisputeData(prev => ({
                              ...prev,
                              bureausToDispute: e.target.checked
                                ? [...prev.bureausToDispute, bureau]
                                : prev.bureausToDispute.filter(b => b !== bureau)
                            }))
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="capitalize">{bureau}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-2">Review Your Dispute</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Please review all information before submitting your dispute.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Dispute Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Items to Dispute ({disputeData.selectedItems.length})</h4>
                      {disputeData.selectedItems.map(itemId => {
                        const item = getItemDetails(itemId) as NegativeItem
                        const reasons = disputeData.disputeReasons[itemId] || []
                        return (
                          <div key={itemId} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <p className="font-medium">{item?.creditorName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Reasons: {reasons.join(', ')}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="text-sm space-y-1">
                        <p>Name: {disputeData.contactInfo.name}</p>
                        <p>Email: {disputeData.contactInfo.email}</p>
                        <p>Phone: {disputeData.contactInfo.phone}</p>
                        <p>Address: {disputeData.contactInfo.address}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Credit Bureaus</h4>
                      <p className="text-sm">
                        Disputing with: {disputeData.bureausToDispute.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(', ')}
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">
                            Estimated Impact
                          </p>
                          <p className="text-2xl font-bold text-green-600">
                            +{getEstimatedImpact()} points
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 'submit' && (
              <motion.div
                key="submit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold mb-2">Dispute Submitted Successfully!</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your dispute letters have been generated and are ready to send.
                  </p>
                </div>

                <div className="space-y-3 max-w-md mx-auto">
                  <Button className="w-full" size="lg">
                    <Download className="w-5 h-5 mr-2" />
                    Download Dispute Letters
                  </Button>
                  
                  <Button variant="outline" className="w-full" size="lg">
                    <Send className="w-5 h-5 mr-2" />
                    Send Letters Electronically
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Steps:</strong> Send these letters via certified mail to ensure delivery confirmation. 
                    Keep copies for your records. Credit bureaus have 30 days to investigate your dispute.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 'selection'}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep !== 'submit' ? (
            <Button
              onClick={currentStep === 'review' ? handleSubmit : handleNext}
              disabled={!canProceed()}
            >
              {currentStep === 'review' ? 'Submit Dispute' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={onComplete}>
              Finish
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}