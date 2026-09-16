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
  if (Capacitor.getPlatform() === "ios") return true;
  if (Capacitor.getPlatform() === "android") return false;
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
}
