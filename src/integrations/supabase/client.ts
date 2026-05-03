import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { resolveSupabaseUrl } from './env';

/** Resolved URL used by the client (production always canonical project). */
const VITE_SUPABASE_URL = resolveSupabaseUrl();
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

console.log('SUPABASE URL:', VITE_SUPABASE_URL);

const missingEnv: string[] = [];
if (!SUPABASE_PUBLISHABLE_KEY) missingEnv.push('VITE_SUPABASE_PUBLISHABLE_KEY');

export const missingSupabaseEnv = missingEnv;
export const isSupabaseConfigured = missingEnv.length === 0;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = isSupabaseConfigured
  ? createClient<Database>(VITE_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  : null;
