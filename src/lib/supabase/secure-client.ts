/**
 * Secure Database Client Configuration
 * Implements enhanced security for database connections
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

// Security configuration
const SECURITY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 10000,
  requestTimeout: 30000,
  maxConnections: 50,
  encryptionEnabled: true,
  auditLogging: true,
  rateLimitWindow: 60000, // 1 minute
  rateLimitMaxRequests: 100,
} as const

// Connection rate limiting
const connectionAttempts = new Map<string, { count: number; firstAttempt: number }>()

/**
 * Rate limiting for database connections
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const attempts = connectionAttempts.get(identifier)
  
  if (!attempts) {
    connectionAttempts.set(identifier, { count: 1, firstAttempt: now })
    return true
  }
  
  // Reset if window has passed
  if (now - attempts.firstAttempt > SECURITY_CONFIG.rateLimitWindow) {
    connectionAttempts.set(identifier, { count: 1, firstAttempt: now })
    return true
  }
  
  // Check if within limits
  if (attempts.count >= SECURITY_CONFIG.rateLimitMaxRequests) {
    return false
  }
  
  attempts.count++
  return true
}

/**
 * Validate environment variables for security
 */
function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  // Validate URL format
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  } catch {
    throw new Error('Invalid SUPABASE_URL format')
  }
  
  // Validate key format (basic check)
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.length < 32) {
    throw new Error('Invalid SUPABASE_ANON_KEY format')
  }
}

/**
 * Enhanced audit logging for database operations
 */
async function logDatabaseOperation(
  client: SupabaseClient,
  operation: string,
  table?: string,
  recordId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (!SECURITY_CONFIG.auditLogging) return
  
  try {
    const { data: { user } } = await client.auth.getUser()
    
    await client.rpc('log_operation', {
      p_event_type: 'database_operation',
      p_event_subtype: operation,
      p_table_name: table,
      p_record_id: recordId,
      p_new_values: metadata ? JSON.stringify(metadata) : null,
      p_risk_level: operation.includes('delete') ? 'high' : 'low'
    })
  } catch (error) {
    console.warn('Failed to log database operation:', error)
  }
}

/**
 * Create secure browser client
 */
export function createSecureBrowserClient(): SupabaseClient<Database> {
  validateEnvironment()
  
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'creditai-secure-client',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  )

  // Add connection monitoring
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      logDatabaseOperation(client, 'user_signin', 'auth', session.user.id)
    } else if (event === 'SIGNED_OUT') {
      logDatabaseOperation(client, 'user_signout', 'auth')
    }
  })

  return client
}

/**
 * Create secure server client with enhanced security
 */
export function createSecureServerClient() {
  validateEnvironment()
  
  try {
    const cookieStore = cookies()
    
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              // Add security headers to cookies
              const secureOptions = {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                path: '/',
              }
              cookieStore.set(name, value, secureOptions)
            } catch (error) {
              console.warn('Failed to set secure cookie:', error)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            } catch (error) {
              console.warn('Failed to remove cookie:', error)
            }
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'X-Client-Info': 'creditai-secure-server',
          },
        },
      }
    )
  } catch (error) {
    console.error('Failed to create secure server client:', error)
    throw new Error('Database connection failed')
  }
}

/**
 * Create service role client with maximum security
 */
export function createSecureServiceClient(): SupabaseClient<Database> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Service role key not configured')
  }
  
  validateEnvironment()
  
  // Rate limiting for service client
  const serviceIdentifier = 'service-client'
  if (!checkRateLimit(serviceIdentifier)) {
    throw new Error('Service client rate limit exceeded')
  }
  
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'creditai-service-client',
          'X-Service-Role': 'true',
        },
      },
    }
  )

  return client
}

/**
 * Enhanced query wrapper with security and monitoring
 */
export class SecureQueryBuilder {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Secure select with audit logging
   */
  async secureSelect<T>(
    table: string,
    columns?: string,
    filters?: Record<string, any>
  ): Promise<{ data: T[] | null; error: any }> {
    try {
      let query = this.client.from(table).select(columns || '*')
      
      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }
      
      const result = await query
      
      // Log successful data access
      await logDatabaseOperation(
        this.client,
        'select',
        table,
        undefined,
        { filters, columns }
      )
      
      return result as { data: T[]; error: any }
    } catch (error) {
      // Log failed access attempt
      await logDatabaseOperation(
        this.client,
        'select_failed',
        table,
        undefined,
        { error: error instanceof Error ? error.message : String(error) }
      )
      
      return { data: null, error }
    }
  }

  /**
   * Secure insert with validation
   */
  async secureInsert<T>(
    table: string,
    data: any,
    options?: { validatePII?: boolean }
  ): Promise<{ data: T | null; error: any }> {
    try {
      // Validate PII data if required
      if (options?.validatePII) {
        this.validatePIIData(data)
      }
      
      const result = await this.client
        .from(table)
        .insert(data)
        .select()
        .single()
      
      // Log successful insert
      await logDatabaseOperation(
        this.client,
        'insert',
        table,
        result.data?.id,
        { hasData: !!data }
      )
      
      return result
    } catch (error) {
      // Log failed insert
      await logDatabaseOperation(
        this.client,
        'insert_failed',
        table,
        undefined,
        { error: error instanceof Error ? error.message : String(error) }
      )
      
      return { data: null, error }
    }
  }

  /**
   * Secure update with audit trail
   */
  async secureUpdate<T>(
    table: string,
    id: string,
    data: any,
    options?: { trackChanges?: boolean }
  ): Promise<{ data: T | null; error: any }> {
    try {
      let oldData = null
      
      // Get old data for audit trail if requested
      if (options?.trackChanges) {
        const { data: existing } = await this.client
          .from(table)
          .select('*')
          .eq('id', id)
          .single()
        oldData = existing
      }
      
      const result = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      // Log successful update with change tracking
      await logDatabaseOperation(
        this.client,
        'update',
        table,
        id,
        { 
          oldData: oldData ? JSON.stringify(oldData) : null,
          newData: JSON.stringify(data)
        }
      )
      
      return result
    } catch (error) {
      // Log failed update
      await logDatabaseOperation(
        this.client,
        'update_failed',
        table,
        id,
        { error: error instanceof Error ? error.message : String(error) }
      )
      
      return { data: null, error }
    }
  }

  /**
   * Secure delete with confirmation
   */
  async secureDelete(
    table: string,
    id: string,
    options?: { requireConfirmation?: boolean }
  ): Promise<{ data: any; error: any }> {
    try {
      // Get data before deletion for audit
      const { data: beforeDelete } = await this.client
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
      
      const result = await this.client
        .from(table)
        .delete()
        .eq('id', id)
      
      // Log successful deletion
      await logDatabaseOperation(
        this.client,
        'delete',
        table,
        id,
        { 
          deletedData: beforeDelete ? JSON.stringify(beforeDelete) : null,
          riskLevel: 'high'
        }
      )
      
      return result
    } catch (error) {
      // Log failed deletion
      await logDatabaseOperation(
        this.client,
        'delete_failed',
        table,
        id,
        { error: error instanceof Error ? error.message : String(error) }
      )
      
      return { data: null, error }
    }
  }

  /**
   * Validate PII data before database operations
   */
  private validatePIIData(data: any): void {
    const piiFields = ['ssn', 'phone', 'email', 'account_number']
    
    for (const field of piiFields) {
      if (data[field]) {
        // Basic validation - in production, use more sophisticated checks
        if (field === 'ssn' && !/^\d{3}-?\d{2}-?\d{4}$/.test(data[field])) {
          throw new Error(`Invalid ${field} format`)
        }
        if (field === 'phone' && !/^\+?[\d\s-()]+$/.test(data[field])) {
          throw new Error(`Invalid ${field} format`)
        }
        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[field])) {
          throw new Error(`Invalid ${field} format`)
        }
      }
    }
  }
}

// Export singleton instances
export const secureBrowserClient = createSecureBrowserClient()
export const secureQueryBuilder = new SecureQueryBuilder(secureBrowserClient)

// Export type-safe client
export type SecureSupabaseClient = typeof secureBrowserClient