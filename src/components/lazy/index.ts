/**
 * Lazy-loaded components for better bundle splitting and performance
 */

import { LazyLoader } from '@/lib/performance/lazyLoader'
import { Loading } from '@/components/ui/Loading'

// Dashboard Components
export const LazyDashboardContent = LazyLoader.createLazyComponent(
  () => import('@/components/dashboard/DashboardContent'),
  {
    fallback: Loading,
    preload: true,
    priority: 'high'
  }
)

// Upload Components
export const LazyCreditReportUpload = LazyLoader.createLazyComponent(
  () => import('@/components/upload/CreditReportUpload'),
  {
    fallback: Loading,
    preload: true,
    priority: 'high'
  }
)

export const LazyFileDropzone = LazyLoader.createLazyComponent(
  () => import('@/components/upload/FileDropzone'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazyProcessingStatus = LazyLoader.createLazyComponent(
  () => import('@/components/upload/ProcessingStatus'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

// Analysis Components
export const LazyAnalysisResultsContent = LazyLoader.createLazyComponent(
  () => import('@/components/analysis/AnalysisResultsContent'),
  {
    fallback: Loading,
    preload: true,
    priority: 'medium'
  }
)

export const LazyEnhancedAnalysisDashboard = LazyLoader.createLazyComponent(
  () => import('@/components/analysis/EnhancedAnalysisDashboard'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazySimpleAnalysisResults = LazyLoader.createLazyComponent(
  () => import('@/components/analysis/SimpleAnalysisResults'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazyManualReviewModal = LazyLoader.createLazyComponent(
  () => import('@/components/analysis/ManualReviewModal'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Credit Data Components
export const LazyEnhancedCreditDataDisplay = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/EnhancedCreditDataDisplay'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazyCreditScoreOverview = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/CreditScoreOverview'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazyAccountsSection = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/AccountsSection'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazyNegativeItemsCenter = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/NegativeItemsCenter'),
  {
    fallback: Loading,
    priority: 'medium'
  }
)

export const LazyInquiriesSection = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/InquiriesSection'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyPersonalInformationPanel = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/PersonalInformationPanel'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Visualization Components
export const LazyScoreVisualization = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/visualizations/ScoreVisualization'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyPaymentHistoryChart = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/visualizations/PaymentHistoryChart'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyUtilizationChart = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/visualizations/UtilizationChart'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyBureauComparison = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/visualizations/BureauComparison'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Modal Components
export const LazyAccountDetailsModal = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/modals/AccountDetailsModal'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyInquiryDetailsModal = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/modals/InquiryDetailsModal'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyDisputeStrategyModal = LazyLoader.createLazyComponent(
  () => import('@/components/credit-data/modals/DisputeStrategyModal'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Auth Components
export const LazyAuthForm = LazyLoader.createLazyComponent(
  () => import('@/components/auth/AuthForm'),
  {
    fallback: Loading,
    priority: 'high'
  }
)

export const LazyLogin = LazyLoader.createLazyComponent(
  () => import('@/components/auth/Login'),
  {
    fallback: Loading,
    priority: 'high'
  }
)

export const LazySignup = LazyLoader.createLazyComponent(
  () => import('@/components/auth/Signup'),
  {
    fallback: Loading,
    priority: 'high'
  }
)

// Monitoring Components
export const LazyPDFProcessingMonitorDashboard = LazyLoader.createLazyComponent(
  () => import('@/components/monitoring/PDFProcessingMonitorDashboard'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyProductionMonitoringDashboard = LazyLoader.createLazyComponent(
  () => import('@/components/monitoring/ProductionMonitoringDashboard'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Billing Components
export const LazyPricingPlans = LazyLoader.createLazyComponent(
  () => import('@/components/billing/PricingPlans'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazySubscriptionManager = LazyLoader.createLazyComponent(
  () => import('@/components/billing/SubscriptionManager'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Debug Components
export const LazyAnalysisDebugger = LazyLoader.createLazyComponent(
  () => import('@/components/debug/AnalysisDebugger'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

export const LazyCSSDebug = LazyLoader.createLazyComponent(
  () => import('@/components/debug/CSSDebug'),
  {
    fallback: Loading,
    priority: 'low'
  }
)

// Utility function to preload critical components
export const preloadCriticalComponents = () => {
  LazyLoader.preloadCriticalComponents()
}

// Utility function to get loading stats
export const getLazyLoadingStats = () => {
  return LazyLoader.getStats()
}

// Component preloading based on route
export const preloadComponentsForRoute = (route: string) => {
  switch (route) {
    case '/dashboard':
      LazyLoader.preloadComponent(
        () => import('@/components/dashboard/DashboardContent'),
        'dashboard'
      )
      LazyLoader.preloadComponent(
        () => import('@/components/credit-data/CreditScoreOverview'),
        'credit-score-overview'
      )
      break
    
    case '/upload':
      LazyLoader.preloadComponent(
        () => import('@/components/upload/CreditReportUpload'),
        'credit-upload'
      )
      LazyLoader.preloadComponent(
        () => import('@/components/upload/FileDropzone'),
        'file-dropzone'
      )
      break
    
    case '/analysis-results':
      LazyLoader.preloadComponent(
        () => import('@/components/analysis/AnalysisResultsContent'),
        'analysis-results'
      )
      LazyLoader.preloadComponent(
        () => import('@/components/credit-data/EnhancedCreditDataDisplay'),
        'credit-data-display'
      )
      break
    
    default:
      // Preload common components
      LazyLoader.preloadComponent(
        () => import('@/components/auth/AuthForm'),
        'auth-form'
      )
      break
  }
}

// Hook for component preloading on route change
export const useRoutePreloading = () => {
  const preloadForRoute = (route: string) => {
    // Use requestIdleCallback for non-blocking preloading
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        preloadComponentsForRoute(route)
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        preloadComponentsForRoute(route)
      }, 100)
    }
  }

  return { preloadForRoute }
}