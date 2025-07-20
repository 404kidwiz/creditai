import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { abTestingFramework } from '@/lib/analytics/abTestingFramework';

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
      variants,
      targetMetric,
      segments = [],
      trafficAllocation = 0.1,
      startDate,
      endDate
    } = body;

    // Validate required fields
    if (!name || !variants || !targetMetric) {
      return NextResponse.json(
        { error: 'Missing required fields: name, variants, targetMetric' },
        { status: 400 }
      );
    }

    // Validate variants
    if (!Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 variants are required' },
        { status: 400 }
      );
    }

    // Validate variant weights sum to 1
    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      return NextResponse.json(
        { error: 'Variant weights must sum to 1.0' },
        { status: 400 }
      );
    }

    // Add IDs to variants if not present
    const processedVariants = variants.map(variant => ({
      id: variant.id || crypto.randomUUID(),
      name: variant.name,
      description: variant.description,
      weight: variant.weight,
      config: variant.config || {}
    }));

    // Create experiment
    const experimentId = await abTestingFramework.createExperiment({
      name,
      description,
      status: 'draft',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      variants: processedVariants,
      targetMetric,
      segments,
      trafficAllocation
    });

    if (!experimentId) {
      return NextResponse.json(
        { error: 'Failed to create experiment' },
        { status: 500 }
      );
    }

    const experiment = await abTestingFramework.getExperimentSummary(experimentId);

    return NextResponse.json({ experiment: experiment?.experiment });
  } catch (error) {
    console.error('Error creating A/B test:', error);
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

    // Get all experiments
    const experiments = await abTestingFramework.getAllExperiments();

    return NextResponse.json({ experiments });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}