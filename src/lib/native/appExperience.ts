import { Capacitor } from "@capacitor/core";

/** Native Capacitor shell or an installed PWA — should open the app, not marketing. */
export function isInstalledAppExperience(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return Boolean(displayStandalone || iosStandalone);
}

export function isIosRatingSurface(): boolean {
  if (Capacitor.getPlatform() === "android") return false;
  if (Capacitor.getPlatform() === "ios") return true;
  // Local Vite so keepers/dev can preview the prompt; production stays iOS/Mac only.
  if (import.meta.env.DEV) return true;
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
}
