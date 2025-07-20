import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EventType } from '@/types/analytics';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      eventType,
      eventData = {},
      page,
      metadata = {}
    } = body;

    // Validate required fields
    if (!sessionId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, eventType' },
        { status: 400 }
      );
    }

    // Validate event type
    if (!Object.values(EventType).includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    // Get client info from headers
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.ip || '';

    // Insert event
    const { data, error } = await supabase
      .from('user_behavior_events')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        page: page || '',
        timestamp: new Date().toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, eventId: data.id });
  } catch (error) {
    console.error('Error handling event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('user_behavior_events')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}