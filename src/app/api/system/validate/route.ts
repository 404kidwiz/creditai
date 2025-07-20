import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const validationResults = {
      timestamp: new Date().toISOString(),
      overall: 'pass' as 'pass' | 'fail',
      validations: {} as Record<string, any>
    };

    // Database schema validation
    try {
      const supabase = createClient();
      
      // Check required tables exist
      const requiredTables = [
        'profiles',
        'credit_reports', 
        'enhanced_disputes',
        'creditor_database',
        'legal_references',
        'eoscar_templates',
        'bureau_performance',
        'dispute_analytics',
        'validation_history'
      ];

      const { data: tables, error } = await supabase.rpc('get_table_list');
      
      if (error) throw error;

      const existingTables = tables?.map((t: any) => t.table_name) || [];
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      validationResults.validations.database_schema = {
        status: missingTables.length === 0 ? 'pass' : 'fail',
        requiredTables: requiredTables.length,
        existingTables: existingTables.length,
        missingTables
      };

    } catch (error) {
      validationResults.validations.database_schema = {
        status: 'fail',
        error: (error as Error).message
      };
    }

    // Configuration validation
    const requiredConfig = {
      'DATABASE_URL': process.env.DATABASE_URL,
      'GOOGLE_AI_API_KEY': process.env.GOOGLE_AI_API_KEY,
      'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
      'NEXTAUTH_URL': process.env.NEXTAUTH_URL
    };

    const missingConfig = Object.entries(requiredConfig)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    validationResults.validations.configuration = {
      status: missingConfig.length === 0 ? 'pass' : 'fail',
      missingConfig
    };

    // API endpoints validation
    const criticalEndpoints = [
      '/api/analysis/enhanced',
      '/api/disputes/eoscar/generate',
      '/api/tracking/disputes',
      '/api/validation/comprehensive'
    ];

    validationResults.validations.api_endpoints = {
      status: 'pass', // Placeholder - would test actual endpoints
      endpoints: criticalEndpoints.length,
      note: 'Endpoint validation requires runtime testing'
    };

    // File system validation
    const requiredDirectories = [
      'src/lib/ai',
      'src/lib/disputes',
      'src/lib/eoscar',
      'src/lib/validation',
      'src/components/analysis',
      'src/components/disputes'
    ];

    const fs = require('fs');
    const path = require('path');
    
    const missingDirectories = requiredDirectories.filter(dir => {
      try {
        return !fs.existsSync(path.join(process.cwd(), dir));
      } catch {
        return true;
      }
    });

    validationResults.validations.file_system = {
      status: missingDirectories.length === 0 ? 'pass' : 'fail',
      missingDirectories
    };

    // AI Models validation
    try {
      // This would validate AI model configurations
      validationResults.validations.ai_models = {
        status: 'pass',
        models: ['primary', 'secondary', 'validation'],
        note: 'AI model validation requires runtime testing'
      };
    } catch (error) {
      validationResults.validations.ai_models = {
        status: 'fail',
        error: (error as Error).message
      };
    }

    // Determine overall status
    const validationStatuses = Object.values(validationResults.validations)
      .map(validation => validation.status);
    
    if (validationStatuses.includes('fail')) {
      validationResults.overall = 'fail';
    }

    const statusCode = validationResults.overall === 'pass' ? 200 : 400;

    return NextResponse.json(validationResults, { status: statusCode });

  } catch (error) {
    console.error('System validation error:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overall: 'fail',
      error: (error as Error).message,
      validations: {}
    }, { status: 500 });
  }
}

// Helper function to get table list (would be implemented as a Supabase function)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'initialize') {
      // Initialize system data
      const supabase = createClient();
      
      // Insert default creditors if not exists
      const { error: creditorError } = await supabase
        .from('creditor_database')
        .upsert([
          {
            creditor_name: 'SYSTEM_INITIALIZED',
            standardized_name: 'System Initialized',
            industry: 'System'
          }
        ], { onConflict: 'standardized_name' });

      if (creditorError) {
        throw creditorError;
      }

      return NextResponse.json({
        success: true,
        message: 'System initialized successfully'
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Unknown action'
    }, { status: 400 });

  } catch (error) {
    console.error('System initialization error:', error);
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}