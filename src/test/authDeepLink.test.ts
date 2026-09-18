import { describe, expect, it } from 'vitest';
import {
  AUTH_CALLBACK_PATH,
  AUTH_RESET_PASSWORD_PATH,
  parseAuthDeepLink,
} from '@/lib/auth/authDeepLink';

describe('parseAuthDeepLink', () => {
  it('maps reptilita.com callback URLs to in-app routes', () => {
    expect(parseAuthDeepLink('https://reptilita.com/auth/callback?code=abc123')).toBe(
      '/auth/callback?code=abc123',
    );
    expect(parseAuthDeepLink('https://www.reptilita.com/auth/callback?code=xyz')).toBe(
      '/auth/callback?code=xyz',
    );
  });

  it('maps reset-password URLs and preserves hash tokens', () => {
    expect(
      parseAuthDeepLink(
        'https://reptilita.com/auth/reset-password#access_token=at&refresh_token=rt&type=recovery',
      ),
    ).toBe('/auth/reset-password#access_token=at&refresh_token=rt&type=recovery');
  });

  it('allows localhost for Capacitor dev / emulator', () => {
    expect(parseAuthDeepLink('https://localhost/auth/callback?code=dev')).toBe(
      '/auth/callback?code=dev',
    );
  });

  it('rejects unknown hosts and non-auth paths', () => {
    expect(parseAuthDeepLink('https://evil.example/auth/callback?code=1')).toBeNull();
    expect(parseAuthDeepLink('https://reptilita.com/today')).toBeNull();
    expect(parseAuthDeepLink('not-a-url')).toBeNull();
  });

  it('exports stable auth path constants', () => {
    expect(AUTH_CALLBACK_PATH).toBe('/auth/callback');
    expect(AUTH_RESET_PASSWORD_PATH).toBe('/auth/reset-password');
  });
});
