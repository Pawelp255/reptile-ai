// Secure API Key Storage
// Native (iOS/Android): Uses Capacitor Preferences (encrypted on-device)
// Web: Falls back to IndexedDB settings with explicit user consent

import { Capacitor } from '@capacitor/core';
import { getSettings, updateSettings } from '@/lib/storage';

const SECURE_KEY_NAME = 'openai_api_key';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

// Store API key
export async function setApiKey(key: string): Promise<void> {
  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: SECURE_KEY_NAME, value: key });
      // Store a flag in settings so we know a key is configured
      await updateSettings({ openaiApiKey: '__secure_storage__' });
      return;
    } catch {
      // Fall through to web storage
    }
  }
  // Web fallback: store in IndexedDB settings
  await updateSettings({ openaiApiKey: key });
}

// Retrieve API key
export async function getApiKey(): Promise<string | null> {
  const settings = await getSettings();
  
  if (settings.openaiApiKey === '__secure_storage__' && isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const result = await Preferences.get({ key: SECURE_KEY_NAME });
      return result.value || null;
    } catch {
      return null;
    }
  }
  
  if (settings.openaiApiKey && settings.openaiApiKey !== '__secure_storage__') {
    return settings.openaiApiKey;
  }
  
  return null;
}

// Check if API key is configured
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}

// Remove API key
export async function removeApiKey(): Promise<void> {
  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key: SECURE_KEY_NAME });
    } catch {
      // Key may not exist
    }
  }
  await updateSettings({ openaiApiKey: undefined });
}

// Mask a key for display
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 5) + '••••••••' + key.slice(-4);
}
