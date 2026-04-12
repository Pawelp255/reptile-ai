import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const missingEnv: string[] = [];
if (!SUPABASE_URL) missingEnv.push("VITE_SUPABASE_URL");
if (!SUPABASE_PUBLISHABLE_KEY) missingEnv.push("VITE_SUPABASE_PUBLISHABLE_KEY");

export const missingSupabaseEnv = missingEnv;
export const isSupabaseConfigured = missingEnv.length === 0;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
      },
    })
  : null;
