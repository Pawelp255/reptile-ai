import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getAuthCallbackUrl,
  getPasswordResetRedirectUrl,
  NATIVE_AUTH_REDIRECT_ORIGIN,
} from '@/lib/auth/authRedirectUrl';

const { isNativePlatformMock } = vi.hoisted(() => ({
  isNativePlatformMock: vi.fn(() => false),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: isNativePlatformMock,
  },
}));

describe('authRedirectUrl', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses window origin on web', () => {
    expect(getAuthCallbackUrl()).toMatch(/\/auth\/callback$/);
    expect(getPasswordResetRedirectUrl()).toMatch(/\/auth\/reset-password$/);
  });

  it('uses public HTTPS origin on native for email links', () => {
    isNativePlatformMock.mockReturnValue(true);
    expect(getAuthCallbackUrl()).toBe(`${NATIVE_AUTH_REDIRECT_ORIGIN}/auth/callback`);
    expect(getPasswordResetRedirectUrl()).toBe(
      `${NATIVE_AUTH_REDIRECT_ORIGIN}/auth/reset-password`,
    );
  });
});
