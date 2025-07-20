import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    console.log('Database test result:', { testData, testError })
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: testError.message,
        details: 'Database connection or table access issue'
      }, { status: 500 })
    }
    
    // Test if we can query the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)
    
    console.log('Profiles query result:', { profiles, profilesError })
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      profilesCount: profiles?.length || 0,
      profiles: profiles || []
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Exception during database test'
    }, { status: 500 })
  }
} 