/**
 * supabaseClient.ts - Supabase Client Initialization
 *
 * Initializes the Supabase client using environment variables.
 * Used for anonymous authentication and leaderboard functionality.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[SupabaseClient] Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_KEY'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseKey || ''
);
