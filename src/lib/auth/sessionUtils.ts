/**
 * Session utilities for authentication
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get the current session user from a NextRequest
 */
export async function getSessionUser(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email || 'anonymous',
    };
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}