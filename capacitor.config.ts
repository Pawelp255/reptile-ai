import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Reptilita.
 *
 * iOS TESTFLIGHT / APP STORE WEB ASSETS:
 * - Use `pnpm run build:ios` (disables service worker — recommended for WKWebView)
 * - Then `pnpm exec cap sync ios`
 * - Omit CAPACITOR_DEV_SERVE so the shell loads bundled files from webDir (`dist`).
 *
 * WEB / PWA (hosting separately):
 * - Use `pnpm run build` (includes vite-plugin-pwa + Workbox SW)
 *
 * Dev live reload against a LAN URL:
 * - CAPACITOR_DEV_SERVE=true and CAPACITOR_DEV_SERVE_URL before cap sync/run.
 */

// Note: Capacitor 8 removed `bundledWebRuntime`; the native bridge ships with @capacitor/core.

const config: CapacitorConfig = {
  appId: 'com.yourcompany.reptilita',
  appName: 'Reptilita',
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
    scheme: 'Reptilita',
  },
  android: {
    backgroundColor: '#2a9d8f',
    allowMixedContent: false,
  },
};

export default config;
