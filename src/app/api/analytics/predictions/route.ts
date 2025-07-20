import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { creditPredictionEngine } from '@/lib/analytics/creditPredictionModels';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      currentScore,
      paymentHistory,
      creditUtilization,
      lengthOfHistory,
      creditMix,
      newCredit,
      derogatory,
      income,
      debtToIncome,
      timeframe = 6
    } = body;

    // Validate required fields
    if (!currentScore || paymentHistory === undefined || creditUtilization === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: currentScore, paymentHistory, creditUtilization' },
        { status: 400 }
      );
    }

    // Initialize prediction engine
    await creditPredictionEngine.initializeModels();

    // Create prediction data
    const creditData = {
      userId: user.id,
      currentScore,
      paymentHistory,
      creditUtilization,
      lengthOfHistory: lengthOfHistory || 0,
      creditMix: creditMix || 1,
      newCredit: newCredit || 0,
      derogatory: derogatory || 0,
      income,
      debtToIncome,
      timeframe
    };

    // Generate prediction
    const prediction = await creditPredictionEngine.predictCreditScore(
      user.id,
      creditData,
      timeframe
    );

    if (!prediction) {
      return NextResponse.json(
        { error: 'Failed to generate prediction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error('Error generating prediction:', error);
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's credit score predictions
    const { data, error, count } = await supabase
      .from('credit_score_predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      predictions: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}