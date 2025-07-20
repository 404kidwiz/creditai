import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';

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
      isDefault = false,
      widgets = [],
      layout = { columns: 12, rows: 10, responsive: true },
      refreshInterval
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Create dashboard
    const dashboardId = await businessIntelligenceEngine.createDashboard({
      name,
      description,
      userId: user.id,
      isDefault,
      widgets,
      layout,
      refreshInterval
    });

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Failed to create dashboard' },
        { status: 500 }
      );
    }

    const dashboard = await businessIntelligenceEngine.getDashboard(dashboardId);

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('Error creating dashboard:', error);
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

    // Get user's dashboards
    const dashboards = await businessIntelligenceEngine.getUserDashboards(user.id);

    return NextResponse.json({ dashboards });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}