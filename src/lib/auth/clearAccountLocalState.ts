import { clearAllData } from '@/lib/storage';

const PENDING_DELETE_PREFIXES = [
  'reptilita.pendingDeletes.reptiles.',
  'reptilita.pendingDeletes.events.',
] as const;

const SYNC_TELEMETRY_KEY = 'reptilita.lastSuccessfulCloudSyncMs';

/** Removes per-user sync queues and cloud sync telemetry from localStorage. */
export function clearAccountSyncLocalStorage(userId?: string): void {
  if (typeof localStorage === 'undefined') return;

  if (userId) {
    for (const prefix of PENDING_DELETE_PREFIXES) {
      localStorage.removeItem(`${prefix}${userId}`);
    }
  } else {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PENDING_DELETE_PREFIXES.some((p) => key.startsWith(p))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }

  localStorage.removeItem(SYNC_TELEMETRY_KEY);
}

/**
 * Clears on-device animal data and account-related local caches after server-side account deletion.
 */
export async function clearAccountLocalState(userId?: string): Promise<void> {
  clearAccountSyncLocalStorage(userId);
  await clearAllData();
  try {
    const { clearWatchTodaySnapshot } = await import('@/lib/native/watchTodaySync');
    await clearWatchTodaySnapshot();
  } catch {
    /* Watch bridge unavailable (web / no paired Watch) */
  }
}
