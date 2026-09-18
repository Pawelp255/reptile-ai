import { Capacitor } from '@capacitor/core';

/**
 * Public origin used in Supabase email links for native apps.
 * Must match Android App Links / iOS Universal Links host and SPA routes on reptilita.com.
 */
export const NATIVE_AUTH_REDIRECT_ORIGIN = 'https://reptilita.com';

/**
 * OAuth / email redirect targets for Supabase Auth.
 * - Web/PWA: current origin (e.g. https://reptilita.com or localhost dev server).
 * - Native (iOS/Android): public HTTPS domain so email links open the installed app.
 */
export function getAuthRedirectBase(): string {
  if (typeof window === 'undefined') return NATIVE_AUTH_REDIRECT_ORIGIN;
  if (Capacitor.isNativePlatform()) {
    return NATIVE_AUTH_REDIRECT_ORIGIN;
  }
  return window.location.origin.replace(/\/$/, '');
}

export function getAuthCallbackUrl(): string {
  return `${getAuthRedirectBase()}/auth/callback`;
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAuthRedirectBase()}/auth/reset-password`;
}
