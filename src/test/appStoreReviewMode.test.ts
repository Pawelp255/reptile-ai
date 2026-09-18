import { describe, expect, it, vi, afterEach } from 'vitest';

describe('appStoreReviewMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to production feature flags off in unit tests', async () => {
    const {
      isAppStoreReviewMode,
      isProFeaturesEnabled,
      isAiAssistantEnabled,
    } = await import('@/lib/plan/appStoreReviewMode');
    expect(isAppStoreReviewMode()).toBe(false);
    expect(isProFeaturesEnabled()).toBe(true);
    expect(isAiAssistantEnabled()).toBe(true);
  });

  it('disables Pro and AI when VITE_APPSTORE_REVIEW_MODE=true', async () => {
    vi.stubEnv('VITE_APPSTORE_REVIEW_MODE', 'true');
    const {
      isAppStoreReviewMode,
      isProFeaturesEnabled,
      isAiAssistantEnabled,
    } = await import('@/lib/plan/appStoreReviewMode');
    expect(isAppStoreReviewMode()).toBe(true);
    expect(isProFeaturesEnabled()).toBe(false);
    expect(isAiAssistantEnabled()).toBe(false);
  });

  it('disables Pro and AI when VITE_DISABLE_PRO=true', async () => {
    vi.stubEnv('VITE_DISABLE_PRO', 'true');
    const {
      isAppStoreReviewMode,
      isProFeaturesEnabled,
      isAiAssistantEnabled,
    } = await import('@/lib/plan/appStoreReviewMode');
    expect(isAppStoreReviewMode()).toBe(true);
    expect(isProFeaturesEnabled()).toBe(false);
    expect(isAiAssistantEnabled()).toBe(false);
  });
});
