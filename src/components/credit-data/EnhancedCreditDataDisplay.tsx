'use client'

import React, { useState } from 'react'
import { EnhancedAnalysisResult } from '@/types/credit-ui'
import { CreditScoreOverview } from './CreditScoreOverview'
import { PersonalInformationPanel } from './PersonalInformationPanel'
import { AccountsSection } from './AccountsSection'
import { NegativeItemsCenter } from './NegativeItemsCenter'
import { InquiriesSection } from './InquiriesSection'
import { DataQualityIndicator } from './DataQualityIndicator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ResponsiveSection, ResponsiveGrid, ResponsiveStack } from '@/components/ui/ResponsiveSection'
import { useResponsive } from '@/hooks/useResponsive'
import { 
  BarChart3, 
  User, 
  CreditCard, 
  AlertTriangle, 
  Search, 
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Menu,
  X
} from 'lucide-react'

interface EnhancedCreditDataDisplayProps {
  analysisResult: EnhancedAnalysisResult
  onExport?: (format: 'pdf' | 'csv' | 'json') => void
  onRefresh?: () => void
}

export function EnhancedCreditDataDisplay({
  analysisResult,
  onExport,
  onRefresh
}: EnhancedCreditDataDisplayProps) {
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { isMobile, isTablet } = useResponsive()

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId)
  }

  const handleDisputeStart = (itemId: string) => {
    console.log('Starting dispute for item:', itemId)
    // Implement dispute workflow
  }

  const handleViewDetails = (itemId: string) => {
    console.log('Viewing details for item:', itemId)
    // Implement detail view
  }

  const handleToggleSensitive = () => {
    setShowSensitiveData(!showSensitiveData)
  }

  const handleRequestManualReview = () => {
    console.log('Requesting manual review')
    // Implement manual review request
  }

  const handleInquirySelect = (inquiryId: string) => {
    console.log('Inquiry selected:', inquiryId)
    // Implement inquiry selection logic
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile-Responsive Header */}
      <div className="mobile-sticky-header bg-white dark:bg-gray-800 shadow-lg">
        <div className="mobile-container">
          <ResponsiveStack
            direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
            justify="between"
            align="start"
            spacing="gap-4"
            className="py-4 sm:py-6"
          >
            <div className="flex-1">
              <h1 className="mobile-title text-gray-900 dark:text-white">
                Enhanced Credit Analysis
              </h1>
              <p className="mobile-caption text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive credit report analysis with AI-powered insights
              </p>
            </div>
            
            {/* Mobile Menu Toggle */}
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="touch-button sm:hidden"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
            
            {/* Desktop Actions */}
            <ResponsiveStack
              direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
              spacing="gap-2 sm:gap-3"
              className={`${isMobile && !showMobileMenu ? 'hidden' : 'flex'} ${isMobile ? 'w-full mt-4' : ''}`}
            >
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={onRefresh}
                className={`touch-button flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <RefreshCw className="w-4 h-4" />
                <span className={isMobile ? 'block' : 'hidden sm:block'}>Refresh</span>
              </Button>
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={() => onExport?.('pdf')}
                className={`touch-button flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <Download className="w-4 h-4" />
                <span className={isMobile ? 'block' : 'hidden sm:block'}>Export</span>
              </Button>
            </ResponsiveStack>
          </ResponsiveStack>
        </div>
      </div>

      <div className="mobile-container mobile-section py-4 sm:py-8 mobile-safe-bottom">
        {/* Data Quality Indicator - High Priority */}
        <ResponsiveSection
          title="Data Quality & Confidence"
          icon={<BarChart3 className="w-5 h-5" />}
          priority="high"
          collapsibleOnMobile={false}
        >
          <DataQualityIndicator
            overallConfidence={analysisResult.uiMetadata.confidence}
            sectionConfidence={{
              personalInfo: analysisResult.uiMetadata.completeness.personalInfo,
              creditScores: analysisResult.uiMetadata.completeness.creditScores,
              accounts: analysisResult.uiMetadata.completeness.accounts,
              negativeItems: analysisResult.uiMetadata.completeness.negativeItems
            }}
            processingMethod={analysisResult.uiMetadata.processingMethod}
            missingData={[]} // TODO: Calculate missing data
            onRequestManualReview={handleRequestManualReview}
          />
        </ResponsiveSection>

        {/* Credit Score Overview - High Priority */}
        <ResponsiveSection
          title="Credit Score Overview"
          icon={<BarChart3 className="w-5 h-5" />}
          priority="high"
          collapsibleOnMobile={false}
        >
          <CreditScoreOverview
            scores={{
              experian: analysisResult.extractedData.creditScores?.experian,
              equifax: analysisResult.extractedData.creditScores?.equifax,
              transunion: analysisResult.extractedData.creditScores?.transunion
            }}
            analysis={analysisResult.scoreAnalysis}
            confidence={analysisResult.uiMetadata.completeness.creditScores}
            onScoreClick={(bureau) => console.log('Score clicked:', bureau)}
          />
        </ResponsiveSection>

        {/* Negative Items Center - High Priority */}
        <ResponsiveSection
          title="Negative Items & Disputes"
          icon={<AlertTriangle className="w-5 h-5" />}
          priority="high"
          collapsibleOnMobile={false}
        >
          <NegativeItemsCenter
            negativeItems={analysisResult.extractedData.negativeItems || []}
            recommendations={analysisResult.recommendations || []}
            onDisputeStart={handleDisputeStart}
            onViewDetails={handleViewDetails}
          />
        </ResponsiveSection>

        {/* Accounts Section - Medium Priority */}
        <ResponsiveSection
          title="Credit Accounts"
          icon={<CreditCard className="w-5 h-5" />}
          priority="medium"
          collapsibleOnMobile={true}
          defaultCollapsed={false}
        >
          <AccountsSection
            accounts={analysisResult.extractedData.accounts || []}
            onAccountSelect={handleAccountSelect}
            selectedAccount={selectedAccount}
            viewMode={isMobile ? "cards" : "cards"}
          />
        </ResponsiveSection>

        {/* Personal Information - Medium Priority */}
        <ResponsiveSection
          title="Personal Information"
          icon={<User className="w-5 h-5" />}
          priority="medium"
          collapsibleOnMobile={true}
          defaultCollapsed={isMobile}
        >
          <PersonalInformationPanel
            personalInfo={{
              name: analysisResult.extractedData.personalInfo?.name || '',
              address: analysisResult.extractedData.personalInfo?.address || '',
              ssn: analysisResult.extractedData.personalInfo?.ssn,
              dateOfBirth: analysisResult.extractedData.personalInfo?.dateOfBirth,
              confidence: analysisResult.uiMetadata.completeness.personalInfo
            }}
            confidence={analysisResult.uiMetadata.completeness.personalInfo}
            showSensitive={showSensitiveData}
            onToggleSensitive={handleToggleSensitive}
          />
        </ResponsiveSection>

        {/* Inquiries Section - Low Priority */}
        <ResponsiveSection
          title="Credit Inquiries"
          icon={<Search className="w-5 h-5" />}
          priority="low"
          collapsibleOnMobile={true}
          defaultCollapsed={isMobile}
        >
          <InquiriesSection
            inquiries={analysisResult.extractedData.inquiries || []}
            onInquirySelect={handleInquirySelect}
          />
        </ResponsiveSection>

        {/* Summary Statistics - Always Visible */}
        <ResponsiveSection
          title="Analysis Summary"
          icon={<BarChart3 className="w-5 h-5" />}
          priority="medium"
          collapsibleOnMobile={false}
        >
          <div className="mobile-stat-grid">
            <div className="mobile-stat-card">
              <div className="mobile-stat-value text-blue-600">
                {analysisResult.extractedData.accounts?.length || 0}
              </div>
              <div className="mobile-stat-label">
                Credit Accounts
              </div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-value text-red-600">
                {analysisResult.extractedData.negativeItems?.length || 0}
              </div>
              <div className="mobile-stat-label">
                Negative Items
              </div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-value text-purple-600">
                {analysisResult.extractedData.inquiries?.length || 0}
              </div>
              <div className="mobile-stat-label">
                Credit Inquiries
              </div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-value text-green-600">
                {analysisResult.recommendations?.length || 0}
              </div>
              <div className="mobile-stat-label">
                Dispute Opportunities
              </div>
            </div>
            {/* Confidence on separate row for mobile */}
            <div className="mobile-stat-card col-span-2 sm:col-span-1">
              <div className={`mobile-stat-value ${
                analysisResult.uiMetadata.confidence >= 85 ? 'text-green-600' :
                analysisResult.uiMetadata.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {analysisResult.uiMetadata.confidence.toFixed(0)}%
              </div>
              <div className="mobile-stat-label">
                Overall Confidence
              </div>
            </div>
          </div>
        </ResponsiveSection>
      </div>
    </div>
  )
}