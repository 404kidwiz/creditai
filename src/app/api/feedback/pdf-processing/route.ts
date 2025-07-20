import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('api:feedback:pdf-processing');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      processingId, 
      rating, 
      accuracyRating, 
      speedRating, 
      comments 
    } = body;

    // Validate required fields
    if (!processingId || !rating || !accuracyRating || !speedRating) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: processingId, rating, accuracyRating, speedRating'
      }, { status: 400 });
    }

    // Validate rating values
    const ratings = [rating, accuracyRating, speedRating];
    if (ratings.some(r => r < 1 || r > 5 || !Number.isInteger(r))) {
      return NextResponse.json({
        success: false,
        error: 'Ratings must be integers between 1 and 5'
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();

    // Insert feedback
    const { data, error } = await supabase
      .from('pdf_processing_feedback')
      .insert({
        user_id: user?.id || null,
        processing_id: processingId,
        rating,
        accuracy_rating: accuracyRating,
        speed_rating: speedRating,
        comments: comments || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to save PDF processing feedback', error as Error);
      return NextResponse.json({
        success: false,
        error: 'Failed to save feedback'
      }, { status: 500 });
    }

    logger.info('PDF processing feedback saved', {
      feedbackId: data.id,
      processingId,
      rating,
      accuracyRating,
      speedRating,
      userId: user?.id
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully',
      feedbackId: data.id
    });

  } catch (error) {
    logger.error('PDF processing feedback API error', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = createClient();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get feedback data
    const { data: feedback, error } = await supabase
      .from('pdf_processing_feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch PDF processing feedback', error as Error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch feedback'
      }, { status: 500 });
    }

    // Calculate summary statistics
    const summary = {
      totalFeedback: feedback.length,
      averageRating: 0,
      averageAccuracyRating: 0,
      averageSpeedRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      timeframe
    };

    if (feedback.length > 0) {
      summary.averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
      summary.averageAccuracyRating = feedback.reduce((sum, f) => sum + f.accuracy_rating, 0) / feedback.length;
      summary.averageSpeedRating = feedback.reduce((sum, f) => sum + f.speed_rating, 0) / feedback.length;
      
      // Calculate rating distribution
      feedback.forEach(f => {
        summary.ratingDistribution[f.rating as keyof typeof summary.ratingDistribution]++;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        feedback: feedback.map(f => ({
          id: f.id,
          processingId: f.processing_id,
          rating: f.rating,
          accuracyRating: f.accuracy_rating,
          speedRating: f.speed_rating,
          comments: f.comments,
          createdAt: f.created_at
        }))
      }
    });

  } catch (error) {
    logger.error('PDF processing feedback fetch API error', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}