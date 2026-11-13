// Browser-only: shrink a photo before upload. Re-encoding through a canvas also
// drops EXIF metadata, so phone photos don't leak their GPS location.

export async function resizeImage(file: File, maxSize = 1600, quality = 0.82): Promise<{ blob: Blob; width: number; height: number }> {
  const source = await decode(file);
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that photo.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Your browser couldn't process that photo."))), "image/jpeg", quality),
  );
  return { blob, width, height };
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("That file isn't a photo we can read. Try a JPEG or PNG."));
        img.src = url;
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

export async function uploadPhoto(file: File): Promise<string> {
  const { blob, width, height } = await resizeImage(file);
  const body = new FormData();
  body.append("file", blob, "photo.jpg");
  body.append("width", String(width));
  body.append("height", String(height));
  const res = await fetch("/api/uploads", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed. Check your connection and try again.");
  return data.url;
}
