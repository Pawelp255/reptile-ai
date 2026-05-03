/**
 * Canonical production Supabase project for Reptilita web + Capacitor builds.
 * Production bundles always use this URL so hosting misconfiguration cannot point at the wrong project.
 */

export const REPTILITA_SUPABASE_PROJECT_REF = 'mkgdgxsrykwmopokvxlx';

export const REPTILITA_SUPABASE_URL = `https://${REPTILITA_SUPABASE_PROJECT_REF}.supabase.co`;

/** Production: fixed project URL. Development: `VITE_SUPABASE_URL` when set, else canonical URL. */
export function resolveSupabaseUrl(): string {
  if (import.meta.env.PROD) {
    return REPTILITA_SUPABASE_URL;
  }
  const fromEnv = import.meta.env.VITE_SUPABASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : REPTILITA_SUPABASE_URL;
}
