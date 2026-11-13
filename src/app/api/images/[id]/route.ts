import { db } from "@/server/db";

// Uploaded photos are immutable: a new upload always gets a new id, so they can be cached forever.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const image = await db.imageBlob.findUnique({ where: { id }, select: { data: true, mimeType: true } });
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
