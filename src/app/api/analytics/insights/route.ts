import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Default date range if not provided
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date()
    };

    // Generate insights for the date range
    const insights = await businessIntelligenceEngine.generateInsights(dateRange);

    // Filter insights based on query parameters
    let filteredInsights = insights;

    if (type) {
      filteredInsights = filteredInsights.filter(insight => insight.type === type);
    }

    if (severity) {
      filteredInsights = filteredInsights.filter(insight => insight.severity === severity);
    }

    // Limit results
    filteredInsights = filteredInsights.slice(0, limit);

    // Also get stored insights from database
    let dbQuery = supabase
      .from('analytics_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      dbQuery = dbQuery.eq('type', type);
    }

    if (severity) {
      dbQuery = dbQuery.eq('severity', severity);
    }

    if (startDate) {
      dbQuery = dbQuery.gte('created_at', startDate);
    }

    if (endDate) {
      dbQuery = dbQuery.lte('created_at', endDate);
    }

    const { data: storedInsights, error: dbError } = await dbQuery;

    if (dbError) {
      console.error('Database error:', dbError);
    }

    // Combine fresh insights with stored insights
    const allInsights = [
      ...filteredInsights,
      ...(storedInsights?.map(insight => ({
        id: insight.id,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        confidence: insight.confidence,
        data: insight.data,
        recommendations: insight.recommendations,
        createdAt: new Date(insight.created_at),
        acknowledged: insight.acknowledged
      })) || [])
    ];

    // Remove duplicates based on title and sort by confidence
    const uniqueInsights = allInsights
      .filter((insight, index, self) => 
        index === self.findIndex(i => i.title === insight.title)
      )
      .sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      insights: uniqueInsights.slice(0, limit),
      total: uniqueInsights.length,
      dateRange
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { insightId, acknowledged = true } = body;

    if (!insightId) {
      return NextResponse.json(
        { error: 'Missing required field: insightId' },
        { status: 400 }
      );
    }

    // Update insight acknowledgment status
    const { error } = await supabase
      .from('analytics_insights')
      .update({ acknowledged })
      .eq('id', insightId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update insight' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}