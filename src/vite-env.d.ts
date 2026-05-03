/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK_PRO_USER?: string;
}

declare const __APP_VERSION__: string;
