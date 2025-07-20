'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { ExtractedText } from '@/lib/ocr/textExtractor'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  Shield, 
  Zap, 
  Camera, 
  FileText, 
  BarChart3, 
  Target,
  ArrowRight,
  CheckCircle,
  Lock,
  Sparkles
} from 'lucide-react'
import UploadLoading from './loading'

const CreditReportUpload = dynamic(
  () => import('@/components/upload/CreditReportUpload').then(mod => ({ default: mod.CreditReportUpload })),
  {
    loading: () => <UploadLoading />,
    ssr: false // Disable SSR as upload requires client-side functionality
  }
)

export default function UploadPage() {
  const router = useRouter()

  const handleUploadComplete = (result: {
    fileUrl: string;
    extractedText: ExtractedText;
    aiAnalysis: any;
  }) => {
    console.log('Upload complete - received result:', result)
    
    // Use the AI analysis result directly if available, otherwise create meaningful fallback
    let analysisResult = result.aiAnalysis
    
    if (!analysisResult) {
      console.log('No AI analysis available, creating fallback data')
      // Create fallback only if absolutely no AI analysis was provided
      analysisResult = {
        extractedData: result.extractedText.creditData || {
          personalInfo: { 
            name: 'Information extracted from document', 
            address: 'Address information found'
          },
          creditScores: result.extractedText.creditData?.creditScores || {},
          accounts: result.extractedText.creditData?.accounts || [],
          negativeItems: result.extractedText.creditData?.negativeItems || [],
          inquiries: result.extractedText.creditData?.inquiries || [],
          publicRecords: result.extractedText.creditData?.publicRecords || []
        },
        recommendations: [],
        scoreAnalysis: {
          currentScore: result.extractedText.creditData?.creditScore?.score || null,
          factors: [
            { factor: 'Payment History', impact: 'unknown', weight: 35, description: 'Limited analysis available' },
            { factor: 'Credit Utilization', impact: 'unknown', weight: 30, description: 'Limited analysis available' },
            { factor: 'Length of Credit History', impact: 'unknown', weight: 15, description: 'Limited analysis available' },
            { factor: 'Credit Mix', impact: 'unknown', weight: 10, description: 'Limited analysis available' },
            { factor: 'New Credit', impact: 'unknown', weight: 10, description: 'Limited analysis available' }
          ],
          improvementPotential: null,
          timelineEstimate: 'Unable to estimate with limited data',
          scoreRange: 'unknown'
        },
        summary: result.extractedText.text 
          ? `Document processed with ${result.extractedText.processingMethod || 'basic'} method. Confidence: ${(result.extractedText.confidence || 0).toFixed(1)}%`
          : 'Document uploaded but processing was limited.',
        confidence: result.extractedText.confidence || 0,
        processingTime: 1000,
        processingMethod: result.extractedText.processingMethod || 'fallback'
      }
    } else {
      console.log('Using AI analysis result:', analysisResult)
    }

    // Store both formats for compatibility
    localStorage.setItem('extractedCreditData', JSON.stringify(result.extractedText))
    localStorage.setItem('analysisResult', JSON.stringify(analysisResult))
    localStorage.setItem('uploadedFileUrl', result.fileUrl)
    
    toast.success('Credit report uploaded successfully! Redirecting to analysis results...')
    
    // Redirect to analysis results page where they can review and generate disputes
    setTimeout(() => {
      router.push('/analysis-results')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Upload Your Credit Report
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get AI-powered analysis and automated dispute letter generation in minutes
          </p>
        </div>

        {/* Main Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-0 p-8 mb-12">
          <CreditReportUpload onComplete={handleUploadComplete} />
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                Mobile Optimized
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Take photos directly with your camera for instant OCR processing. 
              Perfect for on-the-go credit report uploads with real-time preview.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                Bank-Level Security
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Your files are encrypted and stored securely in Supabase. 
              Only you have access to your credit reports with enterprise-grade protection.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                AI-Powered Analysis
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Advanced OCR technology extracts and analyzes your credit data 
              for automated dispute letter generation with legal compliance.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                Smart Disputes
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              AI identifies the best dispute opportunities and generates 
              legally-compliant letters with high success probability.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-lg group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                Score Tracking
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Monitor your credit score improvements over time with detailed 
              analytics and progress tracking across all three bureaus.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-0 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                Instant Results
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Get comprehensive analysis results in seconds with detailed 
              breakdowns of accounts, inquiries, and dispute recommendations.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-0 p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Upload your credit report PDF or take a photo with your camera
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analyze</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                AI extracts and analyzes all credit data with high accuracy
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Review detailed analysis and identify dispute opportunities
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Dispute</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Generate and send legally-compliant dispute letters
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Improve Your Credit Score?</h2>
          <p className="text-xl mb-6 opacity-90">
            Join thousands of users who have successfully disputed negative items and improved their credit scores
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Instant results</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Legal compliance guaranteed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 