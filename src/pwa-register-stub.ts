/** Used when REPTILITA_DISABLE_PWA=1 replaces `virtual:pwa-register` for native bundles. */

export type RegisterSWOptions = {
  immediate?: boolean;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
};

export function registerSW(_options?: RegisterSWOptions): (_reload?: boolean) => Promise<void> {
  return async () => {};
}
