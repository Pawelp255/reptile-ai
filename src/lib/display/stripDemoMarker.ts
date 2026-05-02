/** Stored demo rows keep an internal `[DEMO]` prefix for idempotent seeding / clear-demo. Strip it wherever text is shown to users. */

const DEMO_MARKER = '[DEMO]';

export function stripDemoMarkerForDisplay(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const s = value.trim();
  if (!s) return undefined;
  if (!s.startsWith(DEMO_MARKER)) return s;
  const rest = s.slice(DEMO_MARKER.length).replace(/^\s+/, '').trim();
  return rest || undefined;
}
