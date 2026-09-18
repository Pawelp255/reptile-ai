/**
 * App Store / Guideline 3.1.1 review build: hide paid tiers, checkout, and cloud AI surfaces.
 * Underlying Pro code stays in the repo; UI and entitlements are gated here.
 *
 * Enable with either:
 *   VITE_APPSTORE_REVIEW_MODE=true
 *   VITE_DISABLE_PRO=true
 */

function envFlag(name: string): boolean {
  return import.meta.env[name] === 'true';
}

/** True when this build must not show Pro, upgrade, billing, or paid AI access. */
export function isAppStoreReviewMode(): boolean {
  return envFlag('VITE_APPSTORE_REVIEW_MODE') || envFlag('VITE_DISABLE_PRO');
}

/** Pro entitlements and paid-feature UI (inverse of review mode). */
export function isProFeaturesEnabled(): boolean {
  return !isAppStoreReviewMode();
}

/** In-app AI assistant chat (basic or smart). */
export function isAiAssistantEnabled(): boolean {
  return !isAppStoreReviewMode();
}
