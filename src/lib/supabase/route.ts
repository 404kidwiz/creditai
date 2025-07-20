import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

export function createRouteHandlerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // During build time, return a mock client that throws helpful errors
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          })
        }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        rpc: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      }),
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ error: new Error('Supabase not configured') }),
          getPublicUrl: () => ({ data: { publicUrl: '' } })
        })
      }
    } as any
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Can't set cookies in API route handlers during build
          // This will be handled by middleware in production
        },
        remove(name: string, options: any) {
          // Can't remove cookies in API route handlers during build
          // This will be handled by middleware in production
        },
      },
    }
  )
}