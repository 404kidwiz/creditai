import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export function createClient() {
  // Check if environment variables are available (they won't be during build)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found, returning mock client')
    return createMockClient()
  }

  try {
    const cookieStore = cookies()

    return createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            } catch {
              // The `remove` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  } catch (error) {
    console.warn('Failed to create Supabase client, using mock client:', error)
    return createMockClient()
  }
}

// Mock client for build time and when environment variables are missing
function createMockClient(): any {
  const mockResponse = { data: [], error: null }
  const mockAuth = { getUser: () => Promise.resolve({ data: { user: null }, error: null }) }
  
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(mockResponse),
          limit: () => Promise.resolve(mockResponse),
          order: () => Promise.resolve(mockResponse),
        }),
        order: () => ({
          limit: () => Promise.resolve(mockResponse),
        }),
        limit: () => Promise.resolve(mockResponse),
      }),
      insert: () => ({
        select: () => Promise.resolve(mockResponse),
      }),
      update: () => ({
        eq: () => ({
          select: () => Promise.resolve(mockResponse),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve(mockResponse),
      }),
    }),
    rpc: () => Promise.resolve(mockResponse),
    auth: mockAuth,
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }
}

// Separate client for API routes that doesn't use cookies
export function createApiClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found for API client, returning mock client')
    return createMockClient()
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // No-op for API routes
        },
        remove(name: string, options: any) {
          // No-op for API routes
        },
      },
    }
  )
}

// Export singleton for convenience
export const supabase = createClient()

// Re-export createServerClient for compatibility
export { createServerClient }