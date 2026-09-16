import { Capacitor } from "@capacitor/core";

/** Public App Store listing (iOS). Do not point Android users at a public Play listing. */
export const APP_STORE_ID = "6765940034";
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
export const APP_STORE_REVIEW_URL = `${APP_STORE_URL}?action=write-review`;
export const IOS_APP_STORE_REVIEW_DEEP_LINK = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;

export const APP_STORE_BADGE_SRC = "/badges/download-on-the-app-store.svg";
export const APP_STORE_BADGE_ALT = "Download on the App Store";

export function openAppStoreReview(): void {
  if (typeof window === "undefined") return;
  if (Capacitor.getPlatform() === "ios") {
    window.location.assign(IOS_APP_STORE_REVIEW_DEEP_LINK);
    return;
  }
  window.open(APP_STORE_REVIEW_URL, "_blank", "noopener,noreferrer");
}
