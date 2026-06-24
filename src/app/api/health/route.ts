import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'sin1';

export async function GET() {
  try {
    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    // Run one trivial database query (selecting a single profile ID) to keep connection warm
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      databaseConnected: true,
      hasData: !!data
    });
  } catch (error: unknown) {
    console.error('Database keep-warm healthcheck failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: getErrorMessage(error) || 'Unknown database connection error'
      },
      { status: 500 }
    );
  }
}
