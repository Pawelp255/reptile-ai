import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Reptile AI.
 *
 * RELEASE BUILDS (App Store / Play Store):
 * - Run: npm run build
 * - Then: npx cap sync
 * - Do NOT set CAPACITOR_DEV_SERVE — app will load from webDir (dist).
 *
 * OPTIONAL — Development with remote host:
 * - Set env: CAPACITOR_DEV_SERVE=true before cap run/sync to load from a remote URL.
 * - For local builds, leave unset to use dist/.
 */

const config: CapacitorConfig = {
  appId: 'com.reptileai.app',
  appName: 'Reptile AI',
  webDir: 'dist',
  // Only use remote server when explicitly requested (dev/preview). Omit for production.
  ...(process.env.CAPACITOR_DEV_SERVE === 'true' &&
    process.env.CAPACITOR_DEV_SERVE_URL && {
      server: {
        // Keep the remote URL configurable so this file contains no vendor branding.
        url: process.env.CAPACITOR_DEV_SERVE_URL,
        cleartext: true,
        androidScheme: 'https',
      },
    }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2a9d8f',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#2a9d8f',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Reptile AI',
  },
  android: {
    backgroundColor: '#2a9d8f',
    allowMixedContent: false,
  },
};

export default config;
