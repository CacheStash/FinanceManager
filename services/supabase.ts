import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// To enable cloud sync, create a project at https://supabase.com
// and add your API keys to a .env file or hardcode them here (not recommended for production).

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''; 
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// We check if keys are present to enable/disable the service logic
export const isSupabaseConfigured = supabaseUrl && supabaseKey && supabaseUrl.length > 0 && supabaseKey.length > 0;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
