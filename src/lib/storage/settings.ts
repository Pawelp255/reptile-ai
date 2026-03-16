// Settings storage
import { getDB } from './db';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const SETTINGS_KEY = 'app-settings';

const defaultSettings: AppSettings = { ...DEFAULT_SETTINGS };

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
  
  const updated: AppSettings & { id: string } = {
    id: SETTINGS_KEY,
    ...current,
    ...settings,
  };

  await db.put('settings', updated as any);
  return updated;
}

// Reset settings to defaults
export async function resetSettings(): Promise<AppSettings> {
  const db = await getDB();
  const reset: AppSettings & { id: string } = {
    id: SETTINGS_KEY,
    ...defaultSettings,
  };
  
  await db.put('settings', reset as any);
  return reset;
}
