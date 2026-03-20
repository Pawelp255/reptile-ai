/**
 * Resize and encode an image file as a JPEG data URL for local storage (IndexedDB).
 * Matches the event-photo pipeline (max dimension + quality) for consistent size.
 */
export function compressImageFileToJpegDataUrl(
  file: File,
  options?: { maxDimension?: number; quality?: number },
): Promise<string> {
  const maxSize = options?.maxDimension ?? 800;
  const quality = options?.quality ?? 0.7;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (event) => {
      const raw = event.target?.result;
      if (typeof raw !== "string") {
        reject(new Error("Invalid file data"));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width / height) * maxSize;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
