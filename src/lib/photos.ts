// Photos can only point at our own uploads or the bundled seed images, never arbitrary URLs.

const UPLOAD_RE = /^\/api\/images\/[a-z0-9]{10,40}$/;
const SEED_RE = /^\/seed\/[a-z0-9/_-]+\.jpg$/;

export function isAllowedPhotoUrl(value: unknown): value is string {
  return typeof value === "string" && (UPLOAD_RE.test(value) || SEED_RE.test(value));
}

export const MAX_LISTING_PHOTOS = 8;
export const MAX_CHECK_PHOTOS = 6;
