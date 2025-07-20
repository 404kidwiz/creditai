'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { EnhancedCreditDataDisplay } from '@/components/credit-data/EnhancedCreditDataDisplay'
import { EnhancedAnalysisResult } from '@/types/credit-ui'

interface AnalysisData {
  extractedData?: {
    personalInfo?: {
      name?: string
      address?: string
    }
    creditScores?: {
      [bureau: string]: {
        score?: number
        bureau?: string
        date?: string
      }
    }
    accounts?: any[]
    negativeItems?: any[]
    inquiries?: any[]
  }
  recommendations?: any[]
  scoreAnalysis?: {
    currentScore?: number
    factors?: Array<{
      factor: string
      impact: string
      weight: number
      description: string
    }>
    improvementPotential?: number
    timelineEstimate?: string
    scoreRange?: string
  }
  summary?: string
  confidence?: number
  processingTime?: number
  processingMethod?: string
}

export function SimpleAnalysisResults() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalysisResult = async () => {
      try {
        setLoading(true)
        setError(null)

        const stored = localStorage.getItem('analysisResult')
        if (!stored) {
          setError('No analysis results found. Please upload a credit report first.')
          return
        }

        const result = JSON.parse(stored)
        console.log('🚀 [ENHANCED UI] Loaded analysis result:', result)
        setAnalysisData(result)

      } catch (err) {
        console.error('Error loading analysis result:', err)
        setError('Failed to load analysis results. The data may be corrupted.')
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadAnalysisResult()
    }
  }, [authLoading])

  // Convert legacy analysis data to enhanced format
  const convertToEnhancedFormat = (data: AnalysisData): EnhancedAnalysisResult => {
    return {
      extractedData: {
        personalInfo: data.extractedData?.personalInfo || { name: '', address: '' },
        creditScores: data.extractedData?.creditScores || {},
        accounts: (data.extractedData?.accounts || []).map((acc, index) => ({
          id: `account-${index}`,
          creditorName: acc.creditorName || 'Unknown Creditor',
          accountNumber: acc.accountNumber || '****',
          accountType: acc.accountType || 'other',
          balance: acc.balance || 0,
          creditLimit: acc.creditLimit,
          paymentHistory: acc.paymentHistory || [],
          status: acc.status || 'open',
          openDate: acc.openDate || new Date().toISOString(),
          lastReported: acc.lastReported || new Date().toISOString(),
          bureaus: acc.bureaus || ['experian'],
          confidence: acc.confidence || 70
        })),
        negativeItems: (data.extractedData?.negativeItems || []).map((item, index) => ({
          id: `negative-${index}`,
          type: item.type || 'late_payment',
          creditorName: item.creditorName || 'Unknown Creditor',
          accountNumber: item.accountNumber,
          amount: item.amount || 0,
          date: item.date || new Date().toISOString(),
          status: item.status || 'Active',
          description: item.description || 'Negative item',
          disputeReasons: item.disputeReasons || [],
          impactScore: item.impactScore || 50,
          confidence: item.confidence || 70,
          priority: item.priority || 'medium'
        })),
        inquiries: (data.extractedData?.inquiries || []).map((inq, index) => ({
          id: `inquiry-${index}`,
          creditorName: inq.creditorName || 'Unknown',
          date: inq.date || new Date().toISOString(),
          type: inq.type || 'hard',
          purpose: inq.purpose || 'Credit application',
          bureau: inq.bureau || 'experian',
          confidence: inq.confidence || 70
        })),
        publicRecords: []
      },
      scoreAnalysis: data.scoreAnalysis || {
        currentScore: 650,
        factors: [],
        improvementPotential: 0,
        timelineEstimate: 'Unknown',
        scoreRange: 'fair'
      },
      recommendations: (data.recommendations || []).map((rec, index) => ({
        negativeItemId: rec.negativeItemId || `negative-${index}`,
        priority: rec.priority || 'medium',
        disputeReason: rec.disputeReason || 'Dispute inaccurate information',
        legalBasis: rec.legalBasis || 'Fair Credit Reporting Act',
        expectedImpact: rec.expectedImpact || 'Potential score improvement',
        letterTemplate: rec.letterTemplate || 'general_dispute',
        successProbability: rec.successProbability || 70
      })),
      uiMetadata: {
        confidence: data.confidence || 70,
        processingMethod: data.processingMethod || 'standard',
        completeness: {
          personalInfo: data.extractedData?.personalInfo ? 80 : 20,
          creditScores: data.extractedData?.creditScores ? 80 : 20,
          accounts: (data.extractedData?.accounts?.length || 0) > 0 ? 80 : 20,
          negativeItems: (data.extractedData?.negativeItems?.length || 0) >= 0 ? 80 : 20,
          inquiries: (data.extractedData?.inquiries?.length || 0) >= 0 ? 80 : 20,
          overall: data.confidence || 70
        },
        visualizations: {
          scoreCharts: { current: { labels: [], datasets: [] }, projected: { labels: [], datasets: [] } },
          utilizationCharts: [],
          paymentPatterns: [],
          impactProjections: []
        },
        actionableItems: [],
        lastUpdated: new Date().toISOString()
      },
      exportOptions: [
        { format: 'pdf', label: 'PDF Report', description: 'Comprehensive PDF report', includeSensitive: false, available: true },
        { format: 'csv', label: 'CSV Data', description: 'Raw data export', includeSensitive: false, available: true },
        { format: 'json', label: 'JSON Data', description: 'Technical data export', includeSensitive: false, available: true }
      ],
      processingStatus: {
        stage: 'complete',
        progress: 100,
        message: 'Analysis complete'
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading Analysis Results...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: '32px',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #fecaca'
        }}>
          <h2 style={{ 
            color: '#dc2626',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '12px'
          }}>
            Analysis Results Error
          </h2>
          <p style={{ color: '#374151', marginBottom: '16px' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/upload')}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Upload Credit Report
          </button>
        </div>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: '32px',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            color: '#374151',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '12px'
          }}>
            No Analysis Results
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            No analysis results found. Please upload a credit report first.
          </p>
          <button
            onClick={() => router.push('/upload')}
            style={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Upload Credit Report
          </button>
        </div>
      </div>
    )
  }

  // Check for limited analysis more accurately
  const isLimitedAnalysis = (() => {
    const confidence = analysisData.confidence || 0
    const method = analysisData.processingMethod
    
    // Check if this is truly limited analysis
    if (confidence < 70) return true
    if (method === 'fallback') return true
    
    // Check for placeholder content patterns
    const hasPlaceholderContent = (
      analysisData.extractedData?.personalInfo?.name?.includes('Extracted from document') ||
      analysisData.extractedData?.personalInfo?.name?.includes('Information extracted') ||
      analysisData.scoreAnalysis?.factors?.some(f => 
        f.description?.includes('Analysis in progress') || 
        f.description?.includes('Limited analysis available')
      ) ||
      analysisData.scoreAnalysis?.timelineEstimate?.includes('Unable to estimate')
    )
    
    return hasPlaceholderContent
  })()

  // Use enhanced UI if analysis data is available
  if (analysisData) {
    console.log('🚀 [ENHANCED UI] Rendering enhanced credit data display')
    const enhancedData = convertToEnhancedFormat(analysisData)
    
    return (
      <EnhancedCreditDataDisplay
        analysisResult={enhancedData}
        onExport={(format) => {
          console.log('Export requested:', format)
          // TODO: Implement export functionality
        }}
        onRefresh={() => {
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ 
                fontSize: '30px', 
                fontWeight: 'bold', 
                color: '#111827',
                margin: '0 0 4px 0'
              }}>
                Credit Report Analysis
              </h1>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                margin: 0
              }}>
                Analysis completed • Confidence: {(analysisData.confidence || 0).toFixed(1)}%
                {isLimitedAnalysis && ' • Limited analysis mode'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Processing Warning */}
        {isLimitedAnalysis && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h3 style={{ 
              color: '#92400e',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              Limited Analysis Mode
            </h3>
            <p style={{ 
              color: '#92400e',
              fontSize: '14px',
              margin: 0
            }}>
              This analysis was processed with limited capabilities due to technical constraints. 
              Some information may be incomplete or require manual review.
              {analysisData.processingMethod === 'fallback' && ' Advanced AI analysis was not available.'}
            </p>
          </div>
        )}

        {/* Summary Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Analysis Summary
          </h2>
          <p style={{ 
            color: '#374151', 
            marginBottom: '16px',
            lineHeight: '1.5'
          }}>
            {analysisData.summary}
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Confidence</span>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: (analysisData.confidence || 0) >= 85 ? '#059669' :
                         (analysisData.confidence || 0) >= 70 ? '#d97706' : '#dc2626'
                }}>
                  {(analysisData.confidence || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Processing Time</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                  {((analysisData.processingTime || 0) / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Method</span>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#111827',
                  textTransform: 'capitalize'
                }}>
                  {analysisData.processingMethod || 'Standard'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Data Summary */}
        {analysisData.extractedData && !isLimitedAnalysis && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              Extracted Information
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px' 
            }}>
              <div style={{
                backgroundColor: '#dbeafe',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8' }}>
                  {analysisData.extractedData.accounts?.length || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#1e40af' }}>Credit Accounts</div>
              </div>
              <div style={{
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>
                  {analysisData.extractedData.inquiries?.length || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#92400e' }}>Credit Inquiries</div>
              </div>
              <div style={{
                backgroundColor: '#fecaca',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                  {analysisData.extractedData.negativeItems?.length || 0}
                </div>
                <div style={{ fontSize: '14px', color: '#991b1b' }}>Negative Items</div>
              </div>
              {analysisData.extractedData.creditScores && Object.keys(analysisData.extractedData.creditScores).length > 0 && (
                <div style={{
                  backgroundColor: '#dcfce7',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                    {Object.values(analysisData.extractedData.creditScores)[0]?.score || 'N/A'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#047857' }}>Credit Score</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Credit Score Analysis */}
        {analysisData.scoreAnalysis && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              Credit Score Analysis
            </h2>
            {analysisData.scoreAnalysis.currentScore && analysisData.scoreAnalysis.currentScore > 0 ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '24px' 
              }}>
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                      fontSize: '48px',
                      fontWeight: 'bold',
                      color: '#3b82f6',
                      marginBottom: '8px'
                    }}>
                      {analysisData.scoreAnalysis.currentScore}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      color: '#6b7280',
                      textTransform: 'capitalize'
                    }}>
                      {analysisData.scoreAnalysis.scoreRange} Credit
                    </div>
                  </div>
                  {analysisData.scoreAnalysis.improvementPotential && (
                    <div style={{
                      backgroundColor: '#ecfdf5',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#065f46' }}>Improvement Potential</span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#059669'
                        }}>
                          +{analysisData.scoreAnalysis.improvementPotential} points
                        </span>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#059669',
                        marginTop: '8px'
                      }}>
                        Timeline: {analysisData.scoreAnalysis.timelineEstimate}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h4 style={{ fontWeight: '600', marginBottom: '16px' }}>Score Factors</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {analysisData.scoreAnalysis.factors?.map((factor, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{factor.factor}</span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{factor.weight}%</span>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            {factor.description}
                          </div>
                        </div>
                        <div style={{
                          marginLeft: '16px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: factor.impact === 'positive' ? '#dcfce7' :
                                         factor.impact === 'negative' ? '#fecaca' : '#f3f4f6',
                          color: factor.impact === 'positive' ? '#166534' :
                                factor.impact === 'negative' ? '#dc2626' : '#374151'
                        }}>
                          {factor.impact === 'unknown' ? 'Limited Data' : factor.impact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '8px'
                }}>
                  Score Analysis Unavailable
                </h4>
                <p style={{ color: '#6b7280' }}>
                  Credit score information could not be extracted reliably from this document.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          '@media (min-width: 640px)': {
            flexDirection: 'row'
          }
        }}>
          <button
            onClick={() => router.push('/upload')}
            style={{
              flex: 1,
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Upload New Report
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              color: '#374151',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            View Dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}