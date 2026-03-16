import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export function useCapacitor() {
  useEffect(() => {
    const initCapacitor = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        // Configure status bar for native platforms
        await StatusBar.setStyle({ style: Style.Light });
        
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#2a9d8f' });
        }

        // Hide splash screen after app is ready
        await SplashScreen.hide();
      } catch (error) {
        console.warn('Capacitor plugin error:', error);
      }
    };

    initCapacitor();
  }, []);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}
