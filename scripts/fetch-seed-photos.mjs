// One-off helper used to build public/seed from Unsplash (https://unsplash.com/license).
// The processed images are committed, so you never need to run this to use the app.
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-seed-photos.mjs   (the env var only matters behind a proxy)
// Files that already exist are kept; pass --force to download everything again.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await fs.readFile(path.join(root, "scripts/seed-photos.json"), "utf8"));
const out = path.join(root, "public/seed");

async function download(id, width) {
  const url = `https://images.unsplash.com/photo-${id}?w=${width}&q=85&fm=jpg&fit=max`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const force = process.argv.includes("--force");
const exists = (file) => fs.access(file).then(() => true, () => false);
const skip = async (file) => !force && (await exists(file));

const jpeg = (img) => img.jpeg({ quality: 78, progressive: true, mozjpeg: true });
const credits = [];

await fs.mkdir(path.join(out, "listings"), { recursive: true });
await fs.mkdir(path.join(out, "categories"), { recursive: true });
await fs.mkdir(path.join(out, "avatars"), { recursive: true });

// A listing photo is an Unsplash id, or { id, crop: [left, top, width, height] } (fractions of the
// original) for a close-up detail of the same photo, so a gallery always shows the same item.
async function listingPhoto(entry) {
  const { id, crop } = typeof entry === "string" ? { id: entry } : entry;
  if (!crop) return sharp(await download(id, 1600)).rotate();
  const { data, info } = await sharp(await download(id, 2400)).rotate().toBuffer({ resolveWithObject: true });
  const [l, t, w, h] = crop;
  const left = Math.round(l * info.width);
  const top = Math.round(t * info.height);
  const width = Math.min(Math.round(w * info.width), info.width - left);
  const height = Math.min(Math.round(h * info.height), info.height - top);
  return sharp(data).extract({ left, top, width, height });
}

for (const [slug, entries] of Object.entries(manifest.listings)) {
  for (const [i, entry] of entries.entries()) {
    const file = path.join(out, "listings", `${slug}-${i + 1}.jpg`);
    const id = typeof entry === "string" ? entry : entry.id;
    const note = typeof entry === "string" ? "" : " (detail crop)";
    credits.push(`| /seed/listings/${slug}-${i + 1}.jpg | https://images.unsplash.com/photo-${id}${note} |`);
    if (await skip(file)) continue;
    await jpeg((await listingPhoto(entry)).resize(1400, 1400, { fit: "inside", withoutEnlargement: true })).toFile(file);
    console.log("listing", slug, i + 1);
  }
}

const position = (p) => (p === "attention" ? sharp.strategy.attention : p);

for (const [slug, { id, position: pos }] of Object.entries(manifest.categories)) {
  const file = path.join(out, "categories", `${slug}.jpg`);
  credits.push(`| /seed/categories/${slug}.jpg | https://images.unsplash.com/photo-${id} |`);
  if (await skip(file)) continue;
  const buf = await download(id, 1400);
  await jpeg(sharp(buf).rotate().resize(800, 1000, { fit: "cover", position: position(pos) })).toFile(file);
  console.log("category", slug);
}

for (const [slug, { id, position: pos, extract }] of Object.entries(manifest.avatars)) {
  const file = path.join(out, "avatars", `${slug}.jpg`);
  credits.push(`| /seed/avatars/${slug}.jpg | https://images.unsplash.com/photo-${id} |`);
  if (await skip(file)) continue;
  let buf = await download(id, 800);
  if (extract) buf = await sharp(buf).extract(extract).toBuffer();
  await jpeg(sharp(buf).rotate().resize(320, 320, { fit: "cover", position: position(pos ?? "centre") })).toFile(file);
  console.log("avatar", slug);
}

// Made by hand from listing photos (not downloaded here): the return photos for the AI photo comparison demo.
credits.push("| /seed/checks/sony-a7iii-scratched-1.jpg | Edited copy of /seed/listings/sony-a7iii-1.jpg with scratches added to the lens ring, for the photo comparison demo |");
credits.push("| /seed/checks/creator-kit-return-1.jpg | Edited copy of /seed/listings/creator-kit-1.jpg with the microphone removed, for the photo comparison demo |");

await fs.writeFile(
  path.join(out, "CREDITS.md"),
  `# Seed photo credits\n\nAll demo photos come from [Unsplash](https://unsplash.com) and are used under the [Unsplash License](https://unsplash.com/license). People shown in avatars are not real Just Once users.\n\n| File | Source |\n| --- | --- |\n${credits.join("\n")}\n`,
);
console.log("done:", credits.length, "files");
