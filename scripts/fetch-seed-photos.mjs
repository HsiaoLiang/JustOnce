// One-off helper used to build public/seed from Unsplash (https://unsplash.com/license).
// The processed images are committed, so you never need to run this to use the app.
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-seed-photos.mjs   (the env var only matters behind a proxy)
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

const jpeg = (img) => img.jpeg({ quality: 78, progressive: true, mozjpeg: true });
const credits = [];

await fs.mkdir(path.join(out, "listings"), { recursive: true });
await fs.mkdir(path.join(out, "categories"), { recursive: true });
await fs.mkdir(path.join(out, "avatars"), { recursive: true });

for (const [slug, ids] of Object.entries(manifest.listings)) {
  for (const [i, id] of ids.entries()) {
    const buf = await download(id, 1600);
    const file = path.join(out, "listings", `${slug}-${i + 1}.jpg`);
    await jpeg(sharp(buf).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true })).toFile(file);
    credits.push(`| /seed/listings/${slug}-${i + 1}.jpg | https://images.unsplash.com/photo-${id} |`);
    console.log("listing", slug, i + 1);
  }
}

const position = (p) => (p === "attention" ? sharp.strategy.attention : p);

for (const [slug, { id, position: pos }] of Object.entries(manifest.categories)) {
  const buf = await download(id, 1400);
  await jpeg(sharp(buf).rotate().resize(800, 1000, { fit: "cover", position: position(pos) })).toFile(path.join(out, "categories", `${slug}.jpg`));
  credits.push(`| /seed/categories/${slug}.jpg | https://images.unsplash.com/photo-${id} |`);
  console.log("category", slug);
}

for (const [slug, { id, position: pos, extract }] of Object.entries(manifest.avatars)) {
  let buf = await download(id, 800);
  if (extract) buf = await sharp(buf).extract(extract).toBuffer();
  await jpeg(sharp(buf).rotate().resize(320, 320, { fit: "cover", position: position(pos ?? "centre") })).toFile(path.join(out, "avatars", `${slug}.jpg`));
  credits.push(`| /seed/avatars/${slug}.jpg | https://images.unsplash.com/photo-${id} |`);
  console.log("avatar", slug);
}

await fs.writeFile(
  path.join(out, "CREDITS.md"),
  `# Seed photo credits\n\nAll demo photos come from [Unsplash](https://unsplash.com) and are used under the [Unsplash License](https://unsplash.com/license). People shown in avatars are not real Just Once users.\n\n| File | Source |\n| --- | --- |\n${credits.join("\n")}\n`,
);
console.log("done:", credits.length, "files");
