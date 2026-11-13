import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PER_HOUR = 120;

/** Recognise the image type from its first bytes rather than trusting the file name. */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to upload photos." }, { status: 401 });

  const recent = await db.imageBlob.count({ where: { ownerId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_PER_HOUR) return NextResponse.json({ error: "That's a lot of photos in one go. Try again in a little while." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No photo received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That photo is too large. Try one under 4 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return NextResponse.json({ error: "Use a JPEG, PNG or WebP photo." }, { status: 415 });

  const dimension = (key: string) => {
    const n = Number(form?.get(key));
    return Number.isInteger(n) && n > 0 && n < 20000 ? n : null;
  };
  const image = await db.imageBlob.create({
    data: { ownerId: user.id, mimeType, data: bytes, width: dimension("width"), height: dimension("height") },
    select: { id: true },
  });
  return NextResponse.json({ url: `/api/images/${image.id}` }, { status: 201 });
}
