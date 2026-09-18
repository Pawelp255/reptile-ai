/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** App Store review build: hide Pro, billing, and paid AI UI. */
  readonly VITE_APPSTORE_REVIEW_MODE?: string;
  /** Alias for review mode — same behavior as VITE_APPSTORE_REVIEW_MODE. */
  readonly VITE_DISABLE_PRO?: string;
}

declare const __APP_VERSION__: string;
declare const __BUILD_TIMESTAMP__: string;
