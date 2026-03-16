// Light haptic feedback on native (iOS/Android); no-op on web
import { Capacitor } from '@capacitor/core';

export async function lightHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Ignore if plugin not available
  }
}
