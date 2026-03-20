/** Base URL for shareable deep links (Settings → public base or current origin). */
export function buildShareBase(publicBaseUrl?: string): string {
  return publicBaseUrl ? publicBaseUrl.replace(/\/$/, "") : window.location.origin;
}

export function buildCareCardShareUrl(reptileId: string, publicBaseUrl?: string): string {
  return `${buildShareBase(publicBaseUrl)}/care-card/${reptileId}`;
}

export function buildProfileShareUrl(reptileId: string, publicBaseUrl?: string): string {
  return `${buildShareBase(publicBaseUrl)}/share-profile/${reptileId}`;
}
