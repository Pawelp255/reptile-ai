/**
 * Open web intents for third-party share targets (profile URL + optional text).
 * Does not post on the user's behalf; opens the platform in the browser or app.
 */
export function openUrlInNewTab(url: string): void {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    window.location.assign(url);
  }
}

export function buildFacebookSharerUrl(profileUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
}

export function buildXIntentUrl(profileUrl: string, shareText: string): string {
  const params = new URLSearchParams({
    text: shareText,
    url: profileUrl,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildWhatsAppShareUrl(shareText: string, profileUrl: string): string {
  const body = `${shareText}\n${profileUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function buildTelegramShareUrl(profileUrl: string, shareText: string): string {
  const params = new URLSearchParams({
    url: profileUrl,
    text: shareText,
  });
  return `https://t.me/share/url?${params.toString()}`;
}
