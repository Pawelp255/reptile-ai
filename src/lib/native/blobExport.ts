import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNative } from "./sharing";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 200) || "export";
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? (result.split(",")[1] ?? result) : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Web/Desktop: object URL download. */
export function triggerWebDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Writes the blob to Cache and opens the system share sheet (works where programmatic
 * downloads are unreliable, e.g. WKWebView).
 */
export async function shareBlobViaNativeSheet(blob: Blob, fileName: string): Promise<void> {
  const safeName = sanitizeFileName(fileName);
  const base64 = await blobToBase64(blob);
  const saved = await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({
    title: safeName,
    url: saved.uri,
  });
}

/** Native: share sheet. Web: programmatic download. Returns false if every path failed. */
export async function downloadOrShareBlob(blob: Blob, fileName: string): Promise<boolean> {
  if (isNative()) {
    try {
      await shareBlobViaNativeSheet(blob, fileName);
      return true;
    } catch {
      return false;
    }
  }
  try {
    triggerWebDownload(blob, fileName);
    return true;
  } catch {
    return false;
  }
}
