import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('Test signin called with email:', email)
    
    // Test sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    console.log('Test signin result:', { 
      hasData: !!data, 
      hasUser: !!data?.user, 
      hasSession: !!data?.session,
      error 
    })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.status
      }, { status: 400 })
    }
    
    // Test profile loading
    if (data?.user) {
      console.log('Testing profile loading for user:', data.user.id)
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      
      console.log('Profile test result:', { profile, profileError })
      
      return NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at
        },
        session: !!data.session,
        profile: profile,
        profileError: profileError?.message
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'No user data returned'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Test signin error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 