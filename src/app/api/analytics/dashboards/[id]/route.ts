import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';

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

    const dashboardId = params.id;
    const dashboard = await businessIntelligenceEngine.getDashboard(dashboardId);

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Check if user owns the dashboard
    if (dashboard.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboardId = params.id;
    const body = await request.json();
    
    // Check if dashboard exists and user owns it
    const existingDashboard = await businessIntelligenceEngine.getDashboard(dashboardId);
    if (!existingDashboard || existingDashboard.userId !== user.id) {
      return NextResponse.json(
        { error: 'Dashboard not found or access denied' },
        { status: 404 }
      );
    }

    // Update dashboard
    const success = await businessIntelligenceEngine.updateDashboard(dashboardId, body);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update dashboard' },
        { status: 500 }
      );
    }

    const updatedDashboard = await businessIntelligenceEngine.getDashboard(dashboardId);

    return NextResponse.json({ dashboard: updatedDashboard });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboardId = params.id;
    
    // Check if dashboard exists and user owns it
    const existingDashboard = await businessIntelligenceEngine.getDashboard(dashboardId);
    if (!existingDashboard || existingDashboard.userId !== user.id) {
      return NextResponse.json(
        { error: 'Dashboard not found or access denied' },
        { status: 404 }
      );
    }

    // Delete dashboard
    const { error } = await supabase
      .from('analytics_dashboards')
      .delete()
      .eq('id', dashboardId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete dashboard' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}