/** Client-only hints for sync UI (never contains secrets). */

const LAST_OK_MS = "reptilita_last_cloud_sync_ok_ms";

export function readLastSuccessfulCloudSyncMs(): number | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(LAST_OK_MS);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeLastSuccessfulCloudSyncMs(ms: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LAST_OK_MS, String(ms));
}
