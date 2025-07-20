import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { customReportingEngine } from '@/lib/analytics/customReporting';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      isPublic = false,
      config,
      schedule
    } = body;

    // Validate required fields
    if (!name || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, config' },
        { status: 400 }
      );
    }

    // Validate config
    if (!config.metrics || !Array.isArray(config.metrics) || config.metrics.length === 0) {
      return NextResponse.json(
        { error: 'Config must include at least one metric' },
        { status: 400 }
      );
    }

    if (!config.dateRange || !config.dateRange.start || !config.dateRange.end) {
      return NextResponse.json(
        { error: 'Config must include a valid date range' },
        { status: 400 }
      );
    }

    // Create report
    const reportId = await customReportingEngine.createReport({
      name,
      description,
      userId: user.id,
      isPublic,
      config: {
        ...config,
        dateRange: {
          start: new Date(config.dateRange.start),
          end: new Date(config.dateRange.end),
          preset: config.dateRange.preset
        }
      },
      schedule
    });

    if (!reportId) {
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    const report = await customReportingEngine.getReport(reportId);

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error creating report:', error);
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

    // Get user's reports
    const reports = await customReportingEngine.getUserReports(user.id);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}