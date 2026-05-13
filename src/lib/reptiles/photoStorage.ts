import { supabase } from "@/integrations/supabase/client";
import type { Reptile } from "@/types";

const REPTILE_PHOTO_BUCKET = "reptile-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_SKEW_MS = 2 * 60 * 1000;
const SIGNED_URL_RETRY_COOLDOWN_MS = 5 * 60 * 1000;

type EnsurePhotoStoredResult = {
  reptile: Reptile;
  uploaded: boolean;
  skipped: boolean;
  error?: Error;
};

export function isInlineDataUrl(value?: string): boolean {
  return typeof value === "string" && value.trim().startsWith("data:");
}

function guessMimeTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;,]+)[;,]/i.exec(dataUrl);
  return match?.[1]?.toLowerCase() || "image/jpeg";
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",", 2);
  if (!header || !body) throw new Error("Invalid data URL");
  const mimeType = guessMimeTypeFromDataUrl(header);
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function getCurrentSupabaseUserId(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

function buildPhotoPath(userId: string, reptileId: string): string {
  return `${userId}/${reptileId}/profile_v${Date.now()}.jpg`;
}

export async function uploadReptilePhotoDataUrl(params: {
  userId?: string;
  reptileId: string;
  dataUrl: string;
  throwOnError?: boolean;
}): Promise<{ photoPath?: string; error?: Error }> {
  const { reptileId, dataUrl, throwOnError } = params;
  const userId = params.userId ?? (await getCurrentSupabaseUserId());
  if (!supabase || !userId || !isInlineDataUrl(dataUrl)) return {};

  try {
    const blob = dataUrlToBlob(dataUrl);
    const photoPath = buildPhotoPath(userId, reptileId);
    const { error } = await supabase.storage
      .from(REPTILE_PHOTO_BUCKET)
      .upload(photoPath, blob, {
        upsert: true,
        contentType: blob.type || "image/jpeg",
      });
    if (error) throw error;
    return { photoPath };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (throwOnError) throw err;
    return { error: err };
  }
}

export async function createSignedReptilePhotoUrl(
  photoPath?: string,
  options?: { expiresInSeconds?: number; throwOnError?: boolean },
): Promise<{ signedUrl: string; expiresAt: string } | undefined> {
  if (!supabase || !photoPath?.trim()) return undefined;
  const ttl = options?.expiresInSeconds ?? SIGNED_URL_TTL_SECONDS;
  try {
    const { data, error } = await supabase.storage
      .from(REPTILE_PHOTO_BUCKET)
      .createSignedUrl(photoPath, ttl);
    if (error) throw error;
    if (!data?.signedUrl) return undefined;
    return {
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  } catch (error) {
    if (options?.throwOnError) throw error;
    return undefined;
  }
}

export function needsPhotoUrlRefresh(reptile: Reptile, nowMs = Date.now()): boolean {
  if (!reptile.photoPath?.trim()) return false;
  const failedAt = reptile.photoUrlRefreshFailedAt?.trim();
  if (failedAt) {
    const failedMs = Date.parse(failedAt);
    if (!Number.isNaN(failedMs) && nowMs - failedMs < SIGNED_URL_RETRY_COOLDOWN_MS) {
      return false;
    }
  }
  if (!reptile.photoUrl?.trim()) return true;
  const expiresAt = reptile.photoUrlExpiresAt?.trim();
  if (!expiresAt) return true;
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) return true;
  return expiresMs - nowMs <= SIGNED_URL_REFRESH_SKEW_MS;
}

export async function resolveDisplayPhotoForReptile(
  reptile: Reptile,
  options?: { throwOnError?: boolean; forceRefresh?: boolean },
): Promise<{ reptile: Reptile; refreshed: boolean; error?: Error }> {
  if (!reptile.photoPath?.trim()) {
    return { reptile, refreshed: false };
  }
  if (!options?.forceRefresh && !needsPhotoUrlRefresh(reptile)) {
    return { reptile, refreshed: false };
  }

  const inlineFallback =
    reptile.photoInlineFallbackUrl?.trim() ||
    (isInlineDataUrl(reptile.photoUrl) ? reptile.photoUrl.trim() : undefined);

  try {
    const signed = await createSignedReptilePhotoUrl(reptile.photoPath, {
      throwOnError: options?.throwOnError,
    });
    if (!signed) {
      const next: Reptile = {
        ...reptile,
        photoInlineFallbackUrl: inlineFallback,
        photoUrl: inlineFallback ?? undefined,
        photoUrlExpiresAt: undefined,
        photoUrlRefreshFailedAt: new Date().toISOString(),
      };
      return { reptile: next, refreshed: true };
    }
    const next: Reptile = {
      ...reptile,
      photoUrl: signed.signedUrl,
      photoUrlExpiresAt: signed.expiresAt,
      photoInlineFallbackUrl: inlineFallback,
      photoUrlRefreshFailedAt: undefined,
    };
    return {
      reptile: next,
      refreshed: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (options?.throwOnError) throw err;
    const next: Reptile = {
      ...reptile,
      photoInlineFallbackUrl: inlineFallback,
      photoUrl: inlineFallback ?? undefined,
      photoUrlExpiresAt: undefined,
      photoUrlRefreshFailedAt: new Date().toISOString(),
    };
    return { reptile: next, refreshed: true, error: err };
  }
}

export async function ensureInlinePhotoBackedUp(params: {
  reptile: Reptile;
  userId?: string;
  throwOnError?: boolean;
}): Promise<EnsurePhotoStoredResult> {
  const { reptile, throwOnError } = params;
  const inline = reptile.photoUrl?.trim();
  if (!inline || !isInlineDataUrl(inline) || reptile.photoPath) {
    return { reptile, uploaded: false, skipped: true };
  }

  const { photoPath, error } = await uploadReptilePhotoDataUrl({
    userId: params.userId,
    reptileId: reptile.id,
    dataUrl: inline,
    throwOnError,
  });
  if (!photoPath) return { reptile, uploaded: false, skipped: true, error };

  return {
    reptile: {
      ...reptile,
      photoPath,
    },
    uploaded: true,
    skipped: false,
  };
}
