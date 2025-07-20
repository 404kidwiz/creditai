import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { customReportingEngine } from '@/lib/analytics/customReporting';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    
    // Check if report exists and user has access
    const report = await customReportingEngine.getReport(reportId);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    if (report.userId !== user.id && !report.isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Generate report
    const result = await customReportingEngine.generateReport(reportId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate report' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Check if report exists and user has access
    const report = await customReportingEngine.getReport(reportId);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    if (report.userId !== user.id && !report.isPublic) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Export report in requested format
    const exportData = await customReportingEngine.exportReport(reportId, format as any);

    if (!exportData) {
      return NextResponse.json(
        { error: 'Failed to export report' },
        { status: 500 }
      );
    }

    // Set appropriate headers based on format
    const headers: Record<string, string> = {
      'Content-Disposition': `attachment; filename="${report.name}.${format}"`
    };

    switch (format) {
      case 'csv':
        headers['Content-Type'] = 'text/csv';
        break;
      case 'json':
        headers['Content-Type'] = 'application/json';
        break;
      case 'pdf':
        headers['Content-Type'] = 'application/pdf';
        break;
    }

    return new NextResponse(exportData, { headers });
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}