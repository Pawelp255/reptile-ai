import type { SupabaseClient } from '@supabase/supabase-js';

/** Hosts allowed to open auth deep links in the native app. */
export const ALLOWED_AUTH_DEEP_LINK_HOSTS = new Set([
  'reptilita.com',
  'www.reptilita.com',
  'localhost',
]);

export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_RESET_PASSWORD_PATH = '/auth/reset-password';

const AUTH_DEEP_LINK_PATHS = new Set([AUTH_CALLBACK_PATH, AUTH_RESET_PASSWORD_PATH]);

/**
 * Parse an incoming app/deep link URL into an in-app route (path + query + hash).
 * Returns null when the URL is not a supported auth link.
 */
export function parseAuthDeepLink(incomingUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(incomingUrl);
  } catch {
    return null;
  }

  if (!ALLOWED_AUTH_DEEP_LINK_HOSTS.has(url.hostname)) {
    return null;
  }

  const path = url.pathname.replace(/\/$/, '') || '/';
  if (!AUTH_DEEP_LINK_PATHS.has(path)) {
    return null;
  }

  return `${path}${url.search}${url.hash}`;
}

/**
 * Apply Supabase session tokens from the current browser URL (query `code` or hash tokens).
 * Safe to call on auth callback / reset-password routes after deep-link navigation.
 */
export async function applyAuthSessionFromCurrentUrl(
  supabase: SupabaseClient,
): Promise<{ ok: boolean; error?: string }> {
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) {
    return { ok: true };
  }

  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  return { ok: true };
}

/**
 * Sync window.location with an in-app auth route so Supabase and React Router agree.
 */
export function replaceBrowserUrl(internalPath: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', internalPath);
}
