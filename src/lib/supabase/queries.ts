import { SupabaseClient } from './client'
import {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  CreditReport,
  CreditReportInsert,
  CreditReportUpdate,
  NegativeItem,
  NegativeItemInsert,
  NegativeItemUpdate,
  Dispute,
  DisputeInsert,
  DisputeUpdate,
  Document,
  DocumentInsert,
  DocumentUpdate,
  UserProgress,
  UserProgressInsert,
  UserProgressUpdate,
  CreditReportFilters,
  NegativeItemFilters,
  DisputeFilters,
  DocumentFilters,
  DatabaseResponse,
  PaginatedResponse,
  CreditScoreHistory,
  ProgressStats,
  DisputeStats,
} from '@/types/database'

// =============================================
// PROFILE QUERIES
// =============================================

export const getProfile = async (
  supabase: SupabaseClient,
  userId: string
): Promise<DatabaseResponse<Profile>> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error: error?.message || null }
}

export const createProfile = async (
  supabase: SupabaseClient,
  profile: ProfileInsert
): Promise<DatabaseResponse<Profile>> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const updateProfile = async (
  supabase: SupabaseClient,
  userId: string,
  updates: ProfileUpdate
): Promise<DatabaseResponse<Profile>> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error: error?.message || null }
}

// =============================================
// CREDIT REPORT QUERIES
// =============================================

export const getCreditReports = async (
  supabase: SupabaseClient,
  userId: string,
  filters?: CreditReportFilters
): Promise<DatabaseResponse<CreditReport[]>> => {
  let query = supabase
    .from('credit_reports')
    .select('*')
    .eq('user_id', userId)
    .order('report_date', { ascending: false })

  if (filters?.bureau) {
    query = query.eq('bureau', filters.bureau)
  }

  if (filters?.dateRange) {
    query = query
      .gte('report_date', filters.dateRange.start)
      .lte('report_date', filters.dateRange.end)
  }

  if (filters?.scoreRange) {
    query = query
      .gte('score', filters.scoreRange.min)
      .lte('score', filters.scoreRange.max)
  }

  const { data, error } = await query

  return { data, error: error?.message || null }
}

export const getCreditReport = async (
  supabase: SupabaseClient,
  reportId: string
): Promise<DatabaseResponse<CreditReport>> => {
  const { data, error } = await supabase
    .from('credit_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  return { data, error: error?.message || null }
}

export const createCreditReport = async (
  supabase: SupabaseClient,
  report: CreditReportInsert
): Promise<DatabaseResponse<CreditReport>> => {
  const { data, error } = await supabase
    .from('credit_reports')
    .insert(report)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const updateCreditReport = async (
  supabase: SupabaseClient,
  reportId: string,
  updates: CreditReportUpdate
): Promise<DatabaseResponse<CreditReport>> => {
  const { data, error } = await supabase
    .from('credit_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const deleteCreditReport = async (
  supabase: SupabaseClient,
  reportId: string
): Promise<DatabaseResponse<null>> => {
  const { error } = await supabase
    .from('credit_reports')
    .delete()
    .eq('id', reportId)

  return { data: null, error: error?.message || null }
}

// =============================================
// NEGATIVE ITEM QUERIES
// =============================================

export const getNegativeItems = async (
  supabase: SupabaseClient,
  userId: string,
  filters?: NegativeItemFilters
): Promise<DatabaseResponse<NegativeItem[]>> => {
  let query = supabase
    .from('negative_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.creditorName) {
    query = query.ilike('creditor_name', `%${filters.creditorName}%`)
  }

  if (filters?.impactRange) {
    query = query
      .gte('impact_score', filters.impactRange.min)
      .lte('impact_score', filters.impactRange.max)
  }

  if (filters?.balanceRange) {
    query = query
      .gte('balance', filters.balanceRange.min)
      .lte('balance', filters.balanceRange.max)
  }

  const { data, error } = await query

  return { data, error: error?.message || null }
}

export const getNegativeItem = async (
  supabase: SupabaseClient,
  itemId: string
): Promise<DatabaseResponse<NegativeItem>> => {
  const { data, error } = await supabase
    .from('negative_items')
    .select('*')
    .eq('id', itemId)
    .single()

  return { data, error: error?.message || null }
}

export const createNegativeItem = async (
  supabase: SupabaseClient,
  item: NegativeItemInsert
): Promise<DatabaseResponse<NegativeItem>> => {
  const { data, error } = await supabase
    .from('negative_items')
    .insert(item)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const updateNegativeItem = async (
  supabase: SupabaseClient,
  itemId: string,
  updates: NegativeItemUpdate
): Promise<DatabaseResponse<NegativeItem>> => {
  const { data, error } = await supabase
    .from('negative_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const deleteNegativeItem = async (
  supabase: SupabaseClient,
  itemId: string
): Promise<DatabaseResponse<null>> => {
  const { error } = await supabase
    .from('negative_items')
    .delete()
    .eq('id', itemId)

  return { data: null, error: error?.message || null }
}

// =============================================
// DISPUTE QUERIES
// =============================================

export const getDisputes = async (
  supabase: SupabaseClient,
  userId: string,
  filters?: DisputeFilters
): Promise<DatabaseResponse<Dispute[]>> => {
  let query = supabase
    .from('disputes')
    .select(`
      *,
      negative_item:negative_items(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.start)
      .lte('created_at', filters.dateRange.end)
  }

  const { data, error } = await query

  return { data, error: error?.message || null }
}

export const getDispute = async (
  supabase: SupabaseClient,
  disputeId: string
): Promise<DatabaseResponse<Dispute>> => {
  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      negative_item:negative_items(*)
    `)
    .eq('id', disputeId)
    .single()

  return { data, error: error?.message || null }
}

export const createDispute = async (
  supabase: SupabaseClient,
  dispute: DisputeInsert
): Promise<DatabaseResponse<Dispute>> => {
  const { data, error } = await supabase
    .from('disputes')
    .insert(dispute)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const updateDispute = async (
  supabase: SupabaseClient,
  disputeId: string,
  updates: DisputeUpdate
): Promise<DatabaseResponse<Dispute>> => {
  const { data, error } = await supabase
    .from('disputes')
    .update(updates)
    .eq('id', disputeId)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const deleteDispute = async (
  supabase: SupabaseClient,
  disputeId: string
): Promise<DatabaseResponse<null>> => {
  const { error } = await supabase
    .from('disputes')
    .delete()
    .eq('id', disputeId)

  return { data: null, error: error?.message || null }
}

// =============================================
// DOCUMENT QUERIES
// =============================================

export const getDocuments = async (
  supabase: SupabaseClient,
  userId: string,
  filters?: DocumentFilters
): Promise<DatabaseResponse<Document[]>> => {
  let query = supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (filters?.documentType) {
    query = query.eq('document_type', filters.documentType)
  }

  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.start)
      .lte('created_at', filters.dateRange.end)
  }

  if (filters?.hasOCR !== undefined) {
    query = filters.hasOCR
      ? query.not('ocr_text', 'is', null)
      : query.is('ocr_text', null)
  }

  if (filters?.hasAIAnalysis !== undefined) {
    query = filters.hasAIAnalysis
      ? query.not('ai_analysis', 'is', null)
      : query.is('ai_analysis', null)
  }

  const { data, error } = await query

  return { data, error: error?.message || null }
}

export const getDocument = async (
  supabase: SupabaseClient,
  documentId: string
): Promise<DatabaseResponse<Document>> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  return { data, error: error?.message || null }
}

export const createDocument = async (
  supabase: SupabaseClient,
  document: DocumentInsert
): Promise<DatabaseResponse<Document>> => {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const updateDocument = async (
  supabase: SupabaseClient,
  documentId: string,
  updates: DocumentUpdate
): Promise<DatabaseResponse<Document>> => {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const deleteDocument = async (
  supabase: SupabaseClient,
  documentId: string
): Promise<DatabaseResponse<null>> => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  return { data: null, error: error?.message || null }
}

// =============================================
// USER PROGRESS QUERIES
// =============================================

export const getUserProgress = async (
  supabase: SupabaseClient,
  userId: string
): Promise<DatabaseResponse<UserProgress>> => {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  return { data, error: error?.message || null }
}

export const createUserProgress = async (
  supabase: SupabaseClient,
  progress: UserProgressInsert
): Promise<DatabaseResponse<UserProgress>> => {
  const { data, error } = await supabase
    .from('user_progress')
    .insert(progress)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const updateUserProgress = async (
  supabase: SupabaseClient,
  userId: string,
  updates: UserProgressUpdate
): Promise<DatabaseResponse<UserProgress>> => {
  const { data, error } = await supabase
    .from('user_progress')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  return { data, error: error?.message || null }
}

export const addUserPoints = async (
  supabase: SupabaseClient,
  userId: string,
  points: number
): Promise<DatabaseResponse<UserProgress>> => {
  const { data, error } = await supabase.rpc('add_user_points', {
    user_id: userId,
    points_to_add: points,
  })

  return { data, error: error?.message || null }
}

// =============================================
// ANALYTICS QUERIES
// =============================================

export const getCreditScoreHistory = async (
  supabase: SupabaseClient,
  userId: string,
  days: number = 365
): Promise<DatabaseResponse<CreditScoreHistory[]>> => {
  const { data, error } = await supabase
    .from('credit_reports')
    .select('report_date, score, bureau')
    .eq('user_id', userId)
    .gte('report_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('report_date', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const history = data?.map((report, index) => {
    const prevReport = index > 0 ? data[index - 1] : null
    const change = prevReport?.score !== null && report.score !== null && prevReport ? 
      report.score - prevReport.score : 0
    
    return {
      date: report.report_date,
      score: report.score,
      bureau: report.bureau,
      change,
    }
  }) || []

  return { data: history, error: null }
}

export const getProgressStats = async (
  supabase: SupabaseClient,
  userId: string
): Promise<DatabaseResponse<ProgressStats>> => {
  const { data: progress, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const completedAchievements = progress.achievements.filter(
    (achievement: any) => achievement.earned
  ).length

  const stats: ProgressStats = {
    totalPoints: progress.points,
    currentLevel: progress.level,
    nextLevelPoints: progress.level * 100, // Simple level calculation
    completedAchievements,
    totalAchievements: progress.achievements.length,
    streakDays: progress.streak_days,
    recentActivity: [], // TODO: Add recent activity tracking
  }

  return { data: stats, error: null }
}

export const getDisputeStats = async (
  supabase: SupabaseClient,
  userId: string
): Promise<DatabaseResponse<DisputeStats>> => {
  const { data, error } = await supabase
    .from('disputes')
    .select('status, created_at, resolution_date')
    .eq('user_id', userId)

  if (error) {
    return { data: null, error: error.message }
  }

  const stats: DisputeStats = {
    total: data.length,
    pending: data.filter(d => d.status === 'pending').length,
    investigating: data.filter(d => d.status === 'investigating').length,
    resolved: data.filter(d => d.status === 'resolved').length,
    rejected: data.filter(d => d.status === 'rejected').length,
    averageResolutionTime: 0, // TODO: Calculate average resolution time
  }

  return { data: stats, error: null }
}

// =============================================
// DASHBOARD QUERIES
// =============================================

export const getDashboardData = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const [
    profileResponse,
    progressResponse,
    recentReportsResponse,
    activeDisputesResponse,
    recentDocumentsResponse,
  ] = await Promise.all([
    getProfile(supabase, userId),
    getUserProgress(supabase, userId),
    getCreditReports(supabase, userId),
    getDisputes(supabase, userId, { status: 'pending' }),
    getDocuments(supabase, userId),
  ])

  return {
    profile: profileResponse.data,
    progress: progressResponse.data,
    recentReports: recentReportsResponse.data?.slice(0, 3) || [],
    activeDisputes: activeDisputesResponse.data?.slice(0, 5) || [],
    recentDocuments: recentDocumentsResponse.data?.slice(0, 3) || [],
    errors: [
      profileResponse.error,
      progressResponse.error,
      recentReportsResponse.error,
      activeDisputesResponse.error,
      recentDocumentsResponse.error,
    ].filter(Boolean),
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

export const checkUserExists = async (
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  return !error && !!data
}

export const initializeNewUser = async (
  supabase: SupabaseClient,
  userId: string,
  userData: Partial<ProfileInsert>
): Promise<DatabaseResponse<Profile>> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: userData.full_name || '',
      phone: userData.phone || null,
      subscription_tier: 'free',
      subscription_status: 'active',
    })
    .select()
    .single()

  return { data, error: error?.message || null }
}