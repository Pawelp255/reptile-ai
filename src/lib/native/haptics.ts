import { Capacitor } from '@capacitor/core';

type ImpactKind = 'light' | 'medium';

function shouldSkipHaptics(): boolean {
  if (!Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function impact(kind: ImpactKind): Promise<void> {
  if (shouldSkipHaptics()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({
      style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
    });
  } catch {
    // Gracefully no-op when plugin is unavailable.
  }
}

export function lightHaptic(): Promise<void> {
  return impact('light');
}

export function mediumHaptic(): Promise<void> {
  return impact('medium');
}
