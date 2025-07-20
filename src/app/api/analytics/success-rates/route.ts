import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get success rates from the database
    const { data, error } = await supabase
      .from('dispute_analytics')
      .select('success_rate, total_disputes, successful_disputes, period_end')
      .order('period_end', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching success rates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch success rates' },
        { status: 500 }
      )
    }

    const analytics = {
      overall_success_rate: data.length > 0 ? data[0].success_rate : 0,
      recent_disputes: data.reduce((sum, record) => sum + record.total_disputes, 0),
      successful_disputes: data.reduce((sum, record) => sum + record.successful_disputes, 0),
      trends: data.map(record => ({
        period: record.period_end,
        success_rate: record.success_rate,
        total_disputes: record.total_disputes
      }))
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in success-rates API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createClient()
    
    // Calculate and store new success rate analytics
    const { data, error } = await supabase
      .from('dispute_analytics')
      .insert(body)
      .select()

    if (error) {
      console.error('Error storing success rates:', error)
      return NextResponse.json(
        { error: 'Failed to store success rates' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error in success-rates POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}