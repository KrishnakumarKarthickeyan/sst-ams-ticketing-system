// Supabase client wrapper with environment checks and local data fallback toggle
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if keys are active
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Log initialization mode
if (typeof window !== 'undefined') {
  if (isSupabaseConfigured) {
    console.log('SST SAP Support Desk: Supabase client connected successfully.');
  } else {
    console.warn(
      'SST SAP Support Desk: Supabase keys missing. Running in high-fidelity LOCAL FALLBACK mode (State stored in LocalStorage).'
    );
  }
}
