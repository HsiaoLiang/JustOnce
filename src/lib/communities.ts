// Pure rules for school and company communities, shared by server actions, pages and tests.

export const COMMUNITY_SLUG_RE = /^[a-z0-9-]{2,40}$/;

/** Lower-cases and trims an email; returns null when it isn't a plausible address. */
export function normaliseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** True when the email belongs to one of the community's domains (subdomains such as "student.london.edu" count). */
export function emailMatchesDomains(email: string, domains: string[]): boolean {
  const normalised = normaliseEmail(email);
  if (!normalised) return false;
  const host = normalised.slice(normalised.lastIndexOf("@") + 1);
  return domains.some((d) => {
    const domain = d.trim().toLowerCase();
    return !!domain && (host === domain || host.endsWith(`.${domain}`));
  });
}

/** Shows "ma•••@london.edu" so a pending verification can be recognised without exposing the address. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return email;
  return `${email.slice(0, Math.min(2, at))}•••${email.slice(at)}`;
}

export const EMAIL_CODE_TTL_MINUTES = 15;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
/** Minimum gap between two codes for the same membership, so codes can't be re-requested to reset the tries or flood an inbox. */
export const EMAIL_CODE_RESEND_SECONDS = 60;

/** Seconds until another code may be sent, given when the current one expires (0 when one can be sent now). */
export function codeCooldownLeft(codeExpiresAt: Date | null, now: Date = new Date()): number {
  if (!codeExpiresAt) return 0;
  const issuedAt = codeExpiresAt.getTime() - EMAIL_CODE_TTL_MINUTES * 60_000;
  return Math.max(0, Math.ceil((issuedAt + EMAIL_CODE_RESEND_SECONDS * 1000 - now.getTime()) / 1000));
}

export type CommunityKind = "UNIVERSITY" | "COMPANY";

/** The words that change between a school and a company community. */
export function communityWords(type: CommunityKind) {
  return type === "COMPANY"
    ? { email: "work email", idCard: "staff ID card", peers: "colleagues" }
    : { email: "school email", idCard: "student ID card", peers: "classmates" };
}

export type CodeCheck = "ok" | "expired" | "too-many" | "wrong" | "missing";

/** Decides whether an entered code is accepted. Hashes are compared by the caller's hash function. */
export function checkEmailCode(
  entry: { codeHash: string | null; codeExpiresAt: Date | null; codeAttempts: number },
  enteredHash: string,
  now: Date = new Date(),
): CodeCheck {
  if (!entry.codeHash || !entry.codeExpiresAt) return "missing";
  if (entry.codeAttempts >= EMAIL_CODE_MAX_ATTEMPTS) return "too-many";
  if (entry.codeExpiresAt.getTime() < now.getTime()) return "expired";
  return entry.codeHash === enteredHash ? "ok" : "wrong";
}

export const POST_TYPES = [
  { id: "REQUEST", label: "Looking for", short: "Need" },
  { id: "OFFER", label: "Have to lend", short: "Offer" },
] as const;
export type PostTypeId = (typeof POST_TYPES)[number]["id"];

export function postTypeLabel(type: PostTypeId): string {
  return POST_TYPES.find((t) => t.id === type)?.label ?? type;
}

/**
 * Who may see a listing: everyone, unless it is members-only, in which case only its owner and
 * verified members of its community.
 */
export function canSeeListing(
  listing: { ownerId: string; communityId: string | null; communityOnly: boolean },
  viewer: { id: string; communityIds: string[] } | null,
): boolean {
  if (!listing.communityOnly || !listing.communityId) return true;
  if (!viewer) return false;
  return viewer.id === listing.ownerId || viewer.communityIds.includes(listing.communityId);
}
