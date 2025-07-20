'use client'

import React, { useState } from 'react'
import { TabbedAnalysisView } from '@/components/analysis/TabbedAnalysisView'
import { DisputeWizard } from '@/components/disputes/DisputeWizard'
import { EnhancedAccountDetailsModal } from '@/components/credit-data/modals/EnhancedAccountDetailsModal'
import { EnhancedScoreVisualization } from '@/components/credit-data/visualizations/EnhancedScoreVisualization'
import { EnhancedDataQualityIndicator } from '@/components/credit-data/EnhancedDataQualityIndicator'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

// Mock data for demonstration
const mockAnalysisResult = {
  extractedData: {
    creditScores: {
      experian: { score: 720, bureau: 'experian', date: '2024-01-15', scoreRange: { min: 300, max: 850 }, confidence: 95 },
      equifax: { score: 715, bureau: 'equifax', date: '2024-01-15', scoreRange: { min: 300, max: 850 }, confidence: 92 },
      transUnion: { score: 725, bureau: 'transunion', date: '2024-01-15', scoreRange: { min: 300, max: 850 }, confidence: 94 }
    },
    personalInfo: {
      name: 'John Doe',
      address: '123 Main St, Anytown, USA',
      ssn: '***-**-1234',
      dateOfBirth: '1985-01-01',
      phone: '(555) 123-4567',
      confidence: 98
    },
    accounts: [
      {
        id: 'acc1',
        creditorName: 'Chase Freedom Card',
        accountNumber: '****1234',
        accountType: 'credit_card',
        balance: 2500,
        creditLimit: 10000,
        paymentHistory: [
          { month: 'Jan 2024', status: 'current' },
          { month: 'Dec 2023', status: 'current' },
          { month: 'Nov 2023', status: 'current' },
          { month: 'Oct 2023', status: '30_days_late' }
        ],
        status: 'open',
        openDate: '2020-03-15',
        lastReported: '2024-01-15',
        bureaus: ['experian', 'equifax', 'transunion'],
        confidence: 96,
        utilizationRate: 25
      },
      {
        id: 'acc2',
        creditorName: 'Wells Fargo Auto Loan',
        accountNumber: '****5678',
        accountType: 'auto_loan',
        balance: 15000,
        paymentHistory: [
          { month: 'Jan 2024', status: 'current' },
          { month: 'Dec 2023', status: 'current' },
          { month: 'Nov 2023', status: 'current' }
        ],
        status: 'open',
        openDate: '2022-06-01',
        lastReported: '2024-01-15',
        bureaus: ['experian', 'equifax'],
        confidence: 94
      }
    ],
    negativeItems: [
      {
        id: 'neg1',
        type: 'late_payment',
        creditorName: 'Capital One',
        accountNumber: '****9012',
        amount: 125,
        date: '2023-10-15',
        status: 'unresolved',
        description: '30 days late payment',
        disputeReasons: ['Payment was made on time', 'Bank error'],
        impactScore: 25,
        confidence: 88,
        priority: 'high'
      },
      {
        id: 'neg2',
        type: 'collection',
        creditorName: 'Medical Collections Inc',
        amount: 450,
        date: '2023-05-20',
        status: 'unresolved',
        description: 'Medical bill in collections',
        disputeReasons: ['Not my debt', 'Already paid'],
        impactScore: 45,
        confidence: 82,
        priority: 'high'
      }
    ],
    inquiries: [
      {
        id: 'inq1',
        creditorName: 'Toyota Financial',
        date: '2024-01-10',
        type: 'hard',
        purpose: 'Auto loan application',
        bureau: 'experian',
        confidence: 95,
        impact: 'low'
      }
    ]
  },
  scoreAnalysis: {
    currentScore: 720,
    projectedScore: 765,
    keyFactors: [
      'Payment history is mostly positive',
      'Credit utilization is below 30%',
      'Length of credit history is good',
      'Recent hard inquiry may temporarily impact score'
    ],
    recommendations: [
      'Continue making on-time payments',
      'Consider paying down credit card balances',
      'Avoid new credit applications for 6 months'
    ]
  },
  recommendations: [
    {
      id: 'rec1',
      itemId: 'neg1',
      type: 'dispute',
      priority: 'high',
      estimatedImpact: 25,
      successProbability: 75,
      timeframe: '30-45 days',
      description: 'Dispute late payment with Capital One'
    },
    {
      id: 'rec2',
      itemId: 'neg2',
      type: 'dispute',
      priority: 'high',
      estimatedImpact: 45,
      successProbability: 80,
      timeframe: '30-45 days',
      description: 'Dispute medical collection'
    }
  ],
  uiMetadata: {
    confidence: 88,
    processingMethod: 'google-documentai',
    completeness: {
      personalInfo: 98,
      creditScores: 94,
      accounts: 95,
      negativeItems: 85,
      inquiries: 95,
      overall: 93
    },
    visualizations: {
      scoreCharts: {
        current: {
          labels: ['Experian', 'Equifax', 'TransUnion'],
          datasets: [{
            label: 'Current Scores',
            data: [720, 715, 725],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
          }]
        },
        projected: {
          labels: ['Current', 'After Disputes', '6 Months'],
          datasets: [{
            label: 'Score Projection',
            data: [720, 745, 765],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }]
        }
      },
      utilizationCharts: [],
      paymentPatterns: [],
      impactProjections: []
    },
    actionableItems: [
      {
        id: 'action1',
        type: 'dispute',
        priority: 'high',
        title: 'Dispute Late Payment',
        description: 'Capital One late payment can be disputed',
        expectedImpact: 25,
        timeToComplete: '30-45 days',
        difficulty: 'easy'
      },
      {
        id: 'action2',
        type: 'dispute',
        priority: 'high',
        title: 'Remove Medical Collection',
        description: 'Medical collection may be removable',
        expectedImpact: 45,
        timeToComplete: '30-45 days',
        difficulty: 'medium'
      },
      {
        id: 'action3',
        type: 'utilization',
        priority: 'medium',
        title: 'Reduce Credit Card Balance',
        description: 'Lower Chase card balance to improve utilization',
        expectedImpact: 15,
        timeToComplete: '1-2 months',
        difficulty: 'easy'
      }
    ],
    lastUpdated: new Date().toISOString()
  },
  exportOptions: [
    { format: 'pdf', label: 'PDF Report', description: 'Full credit analysis report', includeSensitive: false, available: true },
    { format: 'csv', label: 'CSV Data', description: 'Raw data export', includeSensitive: false, available: true }
  ],
  processingStatus: {
    stage: 'complete',
    progress: 100,
    message: 'Analysis complete'
  }
}

export default function EnhancedAnalysisPage() {
  const router = useRouter()
  const [showDisputeWizard, setShowDisputeWizard] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<any>(null)

  const handleDisputeStart = (items: string[]) => {
    setShowDisputeWizard(true)
  }

  const handleDisputeComplete = (disputeData: any) => {
    console.log('Dispute completed:', disputeData)
    setShowDisputeWizard(false)
    // Here you would typically submit the dispute data to your backend
  }

  const handleExport = (format: string) => {
    console.log('Exporting in format:', format)
    // Here you would typically trigger the export functionality
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Back Button */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <TabbedAnalysisView
        analysisResult={mockAnalysisResult}
        onDisputeStart={handleDisputeStart}
        onExport={handleExport}
      />

      {/* Dispute Wizard Modal */}
      {showDisputeWizard && (
        <DisputeWizard
          negativeItems={mockAnalysisResult.extractedData.negativeItems}
          accounts={mockAnalysisResult.extractedData.accounts}
          onComplete={handleDisputeComplete}
          onCancel={() => setShowDisputeWizard(false)}
        />
      )}

      {/* Account Details Modal */}
      {selectedAccount && (
        <EnhancedAccountDetailsModal
          account={selectedAccount}
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onDispute={() => {
            setSelectedAccount(null)
            setShowDisputeWizard(true)
          }}
          onExport={() => handleExport('pdf')}
        />
      )}
    </div>
  )
}