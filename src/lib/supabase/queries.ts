import { SupabaseClient } from '@supabase/supabase-js'
import { PIIMasker } from '@/lib/security/piiMasker'
import { DataEncryption } from '@/lib/security/encryption'

/**
 * Secure dashboard data retrieval with user isolation and optimized queries
 */
export async function getDashboardData(supabase: SupabaseClient, userId: string) {
  if (!userId) {
    throw new Error('User ID is required for data access')
  }

  try {
    // Parallel execution of optimized queries using covering indexes
    const [reportsResult, disputesResult] = await Promise.all([
      // Optimized query using covering index idx_credit_reports_dashboard_covering
      supabase
        .from('credit_reports')
        .select(`
          id,
          created_at,
          updated_at,
          processing_method,
          confidence_score,
          status,
          file_name
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Optimized query using partial index for active disputes
      supabase
        .from('disputes')
        .select(`
          id,
          created_at,
          updated_at,
          status,
          dispute_type,
          priority,
          expected_resolution_date
        `)
        .eq('user_id', userId)
        .in('status', ['submitted', 'in_progress', 'under_review'])
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    if (reportsResult.error) {
      console.error('Error fetching recent reports:', reportsResult.error)
    }

    if (disputesResult.error) {
      console.error('Error fetching active disputes:', disputesResult.error)
    }

    return {
      recentReports: reportsResult.data || [],
      activeDisputes: disputesResult.data || [],
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return {
      recentReports: [],
      activeDisputes: [],
    }
  }
}

/**
 * Securely store credit report data with encryption
 */
export async function storeCreditReportData(
  supabase: SupabaseClient,
  userId: string,
  reportData: any,
  metadata: any
) {
  if (!userId) {
    throw new Error('User ID is required for data storage')
  }

  try {
    // Encrypt sensitive data before storage
    const encryptedData = DataEncryption.encryptCreditReportData(reportData, userId)
    
    // Generate a hash of the user ID for additional security
    const userHash = DataEncryption.hashIdentifier(userId)
    
    const { data, error } = await supabase
      .from('credit_reports')
      .insert({
        user_id: userId,
        user_hash: userHash,
        encrypted_data: encryptedData.encryptedData,
        encryption_iv: encryptedData.iv,
        encryption_auth_tag: encryptedData.authTag,
        processing_method: metadata.processingMethod,
        confidence_score: metadata.confidence,
        file_name: metadata.fileName,
        file_size: metadata.fileSize,
        processing_time: metadata.processingTime,
        bureau: metadata.bureau || 'experian', // Default bureau if not provided
        report_date: metadata.reportDate || new Date().toISOString().split('T')[0], // Default to today
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error storing credit report data:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to store credit report data:', error)
    throw error
  }
}

/**
 * Securely retrieve and decrypt credit report data
 */
export async function getCreditReportData(
  supabase: SupabaseClient,
  userId: string,
  reportId: string
) {
  if (!userId || !reportId) {
    throw new Error('User ID and Report ID are required')
  }

  try {
    const { data, error } = await supabase
      .from('credit_reports')
      .select(`
        id,
        encrypted_data,
        encryption_iv,
        encryption_auth_tag,
        processing_method,
        confidence_score,
        created_at
      `)
      .eq('user_id', userId)
      .eq('id', reportId)
      .single()

    if (error) {
      console.error('Error retrieving credit report data:', error)
      throw error
    }

    if (!data) {
      throw new Error('Credit report not found or access denied')
    }

    // Decrypt the data
    const decryptedData = DataEncryption.decrypt({
      encryptedData: data.encrypted_data,
      iv: data.encryption_iv,
      authTag: data.encryption_auth_tag
    })

    return {
      ...data,
      decryptedData: JSON.parse(decryptedData)
    }
  } catch (error) {
    console.error('Failed to retrieve credit report data:', error)
    throw error
  }
}

/**
 * Securely delete user data with verification
 */
export async function deleteUserData(
  supabase: SupabaseClient,
  userId: string,
  dataType: 'credit_reports' | 'disputes' | 'all'
) {
  if (!userId) {
    throw new Error('User ID is required for data deletion')
  }

  try {
    const results = []

    if (dataType === 'credit_reports' || dataType === 'all') {
      const { error: reportsError } = await supabase
        .from('credit_reports')
        .delete()
        .eq('user_id', userId)

      if (reportsError) {
        console.error('Error deleting credit reports:', reportsError)
        throw reportsError
      }
      results.push('credit_reports')
    }

    if (dataType === 'disputes' || dataType === 'all') {
      const { error: disputesError } = await supabase
        .from('disputes')
        .delete()
        .eq('user_id', userId)

      if (disputesError) {
        console.error('Error deleting disputes:', disputesError)
        throw disputesError
      }
      results.push('disputes')
    }

    return { deletedTables: results }
  } catch (error) {
    console.error('Failed to delete user data:', error)
    throw error
  }
}

/**
 * Audit log for security monitoring
 */
export async function logSecurityEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: string,
  details: any
) {
  try {
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_details: details,
        ip_address: details.ipAddress || null,
        user_agent: details.userAgent || null,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log security event:', error)
    // Don't throw error to avoid breaking main functionality
  }
}

/**
 * Check user data access permissions with optimized query
 */
export async function verifyUserAccess(
  supabase: SupabaseClient,
  userId: string,
  resourceId: string,
  resourceType: 'credit_report' | 'dispute'
) {
  if (!userId || !resourceId) {
    return false
  }

  try {
    const tableName = resourceType === 'credit_report' ? 'credit_reports' : 'disputes'
    
    // Use EXISTS query for better performance
    const { data, error } = await supabase
      .rpc('verify_user_resource_access', {
        p_user_id: userId,
        p_resource_id: resourceId,
        p_table_name: tableName
      })

    if (error) {
      // Fallback to direct query if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', userId)
        .eq('id', resourceId)
        .single()

      return !fallbackError && !!fallbackData
    }

    return !!data
  } catch (error) {
    console.error('Error verifying user access:', error)
    return false
  }
}

/**
 * Get user's credit report summary with optimized aggregation
 */
export async function getCreditReportSummary(
  supabase: SupabaseClient,
  userId: string,
  timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const timeRangeMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  }

  try {
    const { data, error } = await supabase
      .rpc('get_credit_report_summary', {
        p_user_id: userId,
        p_days_back: timeRangeMap[timeRange]
      })

    if (error) {
      console.error('Error fetching credit report summary:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to get credit report summary:', error)
    throw error
  }
}

/**
 * Get dispute analytics with optimized aggregation
 */
export async function getDisputeAnalytics(
  supabase: SupabaseClient,
  userId: string,
  timeRange: '30d' | '90d' | '1y' = '90d'
) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const timeRangeMap = {
    '30d': 30,
    '90d': 90,
    '1y': 365
  }

  try {
    const { data, error } = await supabase
      .rpc('get_dispute_analytics', {
        p_user_id: userId,
        p_days_back: timeRangeMap[timeRange]
      })

    if (error) {
      console.error('Error fetching dispute analytics:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to get dispute analytics:', error)
    throw error
  }
}

/**
 * Batch insert credit report data with optimized performance
 */
export async function batchInsertCreditReports(
  supabase: SupabaseClient,
  userId: string,
  reports: Array<{
    reportData: any
    metadata: any
  }>
) {
  if (!userId || !reports.length) {
    throw new Error('User ID and reports are required')
  }

  try {
    const insertData = reports.map(({ reportData, metadata }) => {
      const encryptedData = DataEncryption.encryptCreditReportData(reportData, userId)
      const userHash = DataEncryption.hashIdentifier(userId)

      return {
        user_id: userId,
        user_hash: userHash,
        encrypted_data: encryptedData.encryptedData,
        encryption_iv: encryptedData.iv,
        encryption_auth_tag: encryptedData.authTag,
        processing_method: metadata.processingMethod,
        confidence_score: metadata.confidence,
        file_name: metadata.fileName,
        file_size: metadata.fileSize,
        processing_time: metadata.processingTime,
        bureau: metadata.bureau || 'experian',
        report_date: metadata.reportDate || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    const { data, error } = await supabase
      .from('credit_reports')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Error batch inserting credit reports:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to batch insert credit reports:', error)
    throw error
  }
}

/**
 * Get paginated credit reports with cursor-based pagination for better performance
 */
export async function getPaginatedCreditReports(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit?: number
    cursor?: string
    status?: string
    bureau?: string
    sortBy?: 'created_at' | 'confidence_score' | 'report_date'
    sortOrder?: 'asc' | 'desc'
  } = {}
) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const {
    limit = 20,
    cursor,
    status,
    bureau,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options

  try {
    let query = supabase
      .from('credit_reports')
      .select(`
        id,
        created_at,
        updated_at,
        processing_method,
        confidence_score,
        status,
        file_name,
        bureau,
        report_date
      `)
      .eq('user_id', userId)

    // Add filters
    if (status) {
      query = query.eq('status', status)
    }
    if (bureau) {
      query = query.eq('bureau', bureau)
    }

    // Add cursor-based pagination
    if (cursor) {
      const cursorValue = Buffer.from(cursor, 'base64').toString('utf-8')
      if (sortOrder === 'desc') {
        query = query.lt(sortBy, cursorValue)
      } else {
        query = query.gt(sortBy, cursorValue)
      }
    }

    // Add sorting and limit
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit + 1) // Get one extra to check if there are more results

    const { data, error } = await query

    if (error) {
      console.error('Error fetching paginated credit reports:', error)
      throw error
    }

    const hasMore = data.length > limit
    const results = hasMore ? data.slice(0, -1) : data
    const nextCursor = hasMore && results.length > 0
      ? Buffer.from(results[results.length - 1][sortBy]).toString('base64')
      : null

    return {
      data: results,
      hasMore,
      nextCursor
    }
  } catch (error) {
    console.error('Failed to get paginated credit reports:', error)
    throw error
  }
}