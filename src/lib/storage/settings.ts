// Settings storage
import { getDB } from './db';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const SETTINGS_KEY = 'app-settings';

const defaultSettings: AppSettings = { ...DEFAULT_SETTINGS };
type StoredAppSettings = AppSettings & { id: string };

// Get app settings
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const stored = await db.get('settings', SETTINGS_KEY);
  return stored || defaultSettings;
}

// Update settings
export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDB();
  const current = await getSettings();
  
  const updated: StoredAppSettings = {
    id: SETTINGS_KEY,
    ...current,
    ...settings,
  };

  await db.put('settings', updated);
  return updated;
}

// Reset settings to defaults
export async function resetSettings(): Promise<AppSettings> {
  const db = await getDB();
  const reset: StoredAppSettings = {
    id: SETTINGS_KEY,
    ...defaultSettings,
  };
  
  await db.put('settings', reset);
  return reset;
}
