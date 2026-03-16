// Native sharing utilities for Capacitor + Web fallback
import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Copy text to clipboard with Capacitor fallback.
 * Returns true on success, false if all methods fail.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: text });
      return true;
    } catch {
      // Fall through to web
    }
  }

  // Web: try navigator.clipboard
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through
    }
  }

  // Legacy fallback: execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Share or save a base64 PNG image.
 * Native: writes temp file then opens share sheet.
 * Web: triggers a download.
 */
export async function shareImage(
  base64Data: string,
  fileName: string,
  title?: string,
): Promise<void> {
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      // Strip data URL prefix if present
      const pureBase64 = base64Data.replace(/^data:image\/png;base64,/, '');

      const saved = await Filesystem.writeFile({
        path: fileName,
        data: pureBase64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: title || fileName,
        text: title || 'Care Card',
        url: saved.uri,
      });
      return;
    } catch (err) {
      console.warn('Native share failed, falling back to download:', err);
      // Fall through to web download
    }
  }

  // Web: trigger download
  const link = document.createElement('a');
  link.href = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
