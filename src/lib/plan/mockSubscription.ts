/** Mock entitlement until billing is wired. Set `VITE_MOCK_PRO_USER=true` to preview Pro styling. */
export function isProUser(): boolean {
  return import.meta.env.VITE_MOCK_PRO_USER === 'true';
}

/** Future Pro surface area — UI teaser only (no gated behavior yet). */
export const FEATURE_ADVANCED_GENETICS_INSIGHTS_PLACEHOLDER = true;

/** Placeholder banner for roadmap “smart insights” — Settings copy only for now. */
export const FEATURE_SMART_INSIGHTS_PLACEHOLDER = true;
