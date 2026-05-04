/**
 * Client-side compression for Pro AI vision (one attachment per message).
 * No secrets; output is bounded for Edge + OpenAI.
 */

/** Longest edge of image after resize (px). */
export const VISION_MAX_WIDTH_PX = 1024;

/** JPEG quality (canvas API 0–1). */
export const VISION_JPEG_QUALITY = 0.75;

/** Reject compressed binary larger than this (bytes). */
export const VISION_MAX_OUTPUT_BYTES = 450_000;

/** Reject base64 payload larger than this (characters), ~matches binary cap. */
export const VISION_MAX_BASE64_CHARS = 600_000;

/** Max file size before decode (bytes). */
export const VISION_MAX_INPUT_FILE_BYTES = 25 * 1024 * 1024;

export type VisionImagePayload = {
  mimeType: 'image/jpeg';
  /** Raw base64 only (no data: prefix). */
  base64Data: string;
  /** Object URL for UI preview; caller must revoke when cleared */
  previewUrl: string;
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, Math.min(bytes.length, i + chunk));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

/**
 * Resize (max width), encode as JPEG, return base64 without data URL prefix.
 */
export async function compressImageFileForVision(file: File): Promise<VisionImagePayload> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > VISION_MAX_INPUT_FILE_BYTES) {
    throw new Error('Image file is too large. Try one under 25 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, VISION_MAX_WIDTH_PX / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not read image.');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', VISION_JPEG_QUALITY);
    });
    if (!blob) throw new Error('Image compression failed.');

    if (blob.size > VISION_MAX_OUTPUT_BYTES) {
      throw new Error(
        'Image is still too large after compression. Try a smaller or simpler photo.',
      );
    }

    const buf = new Uint8Array(await blob.arrayBuffer());
    const base64Data = uint8ToBase64(buf);
    if (base64Data.length > VISION_MAX_BASE64_CHARS) {
      throw new Error('Encoded image exceeds the size limit. Try a smaller photo.');
    }

    const previewUrl = URL.createObjectURL(blob);
    return { mimeType: 'image/jpeg', base64Data, previewUrl };
  } finally {
    bitmap.close();
  }
}
