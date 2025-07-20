// Base skeleton components
export {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  CreditScoreSkeleton,
  AccountCardSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
  NavigationSkeleton,
  ProgressiveSkeleton,
  StaggeredSkeleton
} from '../SkeletonScreens'

// Page-specific skeleton screens
export {
  DashboardPageSkeleton,
  AnalysisResultsPageSkeleton,
  UploadPageSkeleton,
  CreditReportsPageSkeleton,
  SettingsPageSkeleton,
  MobileDashboardSkeleton
} from '../PageSkeletons'

// Enhanced loading states
export {
  EnhancedLoading,
  ProgressiveDashboardLoading,
  ContentSectionLoading,
  AnalysisLoading,
  SmartLoading
} from '../EnhancedLoadingStates'

// Progressive loading hooks
export {
  useProgressiveLoading,
  useStaggeredAnimation,
  useContentLoading,
  type LoadingStage
} from '../../hooks/useProgressiveLoading'

// Re-export main skeleton types for convenience
export type SkeletonVariant = 'default' | 'circle' | 'text' | 'button' | 'card'
export type SkeletonRounded = 'none' | 'sm' | 'md' | 'lg' | 'full'