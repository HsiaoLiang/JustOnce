"use server";

import { createHash, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../db";
import { requireUser } from "../auth";
import { setFlash } from "../flash";
import {
  checkEmailCode,
  COMMUNITY_SLUG_RE,
  EMAIL_CODE_TTL_MINUTES,
  emailMatchesDomains,
  maskEmail,
  normaliseEmail,
} from "@/lib/communities";
import { isISODate, todayInLondon, toDate } from "@/lib/dates";
import { parsePounds } from "@/lib/money";
import { isAllowedPhotoUrl } from "@/lib/photos";
import { emailConfigured, sendVerificationCode } from "../email";

export type VerifyState =
  | { error?: string; sentTo?: string; /** Demo only: shown on screen because no email provider is configured. */ demoCode?: string; pending?: boolean }
  | undefined;
export type PostState = { error?: string; fieldErrors?: Record<string, string> } | undefined;
export type CommentState = { error?: string; ok?: number } | undefined;

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

async function findCommunity(slug: unknown) {
  const s = String(slug ?? "");
  if (!COMMUNITY_SLUG_RE.test(s)) return null;
  return db.community.findUnique({ where: { slug: s } });
}

async function ownedUploads(userId: string, urls: string[]): Promise<boolean> {
  if (!urls.every(isAllowedPhotoUrl)) return false;
  const ids = urls.map((u) => (u.startsWith("/api/images/") ? u.slice("/api/images/".length) : null));
  if (ids.some((id) => !id)) return false;
  const owned = await db.imageBlob.count({ where: { id: { in: ids as string[] }, ownerId: userId } });
  return owned === ids.length;
}

async function requireMember(slug: unknown, returnTo: string) {
  const user = await requireUser(returnTo);
  const community = await findCommunity(slug);
  if (!community) return { user, community: null, member: false } as const;
  const member = await db.communityMember.count({ where: { userId: user.id, communityId: community.id, status: "VERIFIED" } });
  return { user, community, member: member > 0 } as const;
}

const parseList = (value: FormDataEntryValue | null): string[] => {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

// ------------------------------------------------------------ verification

/** Step 1 of email verification: check the domain and issue a 6-digit code. */
export async function requestEmailCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const community = await findCommunity(formData.get("slug"));
  if (!community) return { error: "That community doesn't exist." };
  const user = await requireUser(`/communities/${community.slug}/verify`);
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Enter your email address." };
  if (!emailMatchesDomains(email, community.domains)) {
    return { error: `Use your ${community.shortName} email (${community.domains.map((d) => `@${d}`).join(" or ")}), or verify with your ID card instead.` };
  }
  const existing = await db.communityMember.findUnique({ where: { userId_communityId: { userId: user.id, communityId: community.id } } });
  if (existing?.status === "VERIFIED") redirect(`/communities/${community.slug}`);

  // Another account already verified with this address: one person, one membership.
  const taken = await db.communityMember.count({ where: { communityId: community.id, email, status: "VERIFIED", userId: { not: user.id } } });
  if (taken) return { error: "That email is already verified on another account." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const data = {
    method: "EMAIL" as const,
    status: "PENDING" as const,
    email,
    codeHash: hashCode(code),
    codeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60_000),
    codeAttempts: 0,
  };
  await db.communityMember.upsert({
    where: { userId_communityId: { userId: user.id, communityId: community.id } },
    create: { ...data, userId: user.id, communityId: community.id },
    update: data,
  });

  // With RESEND_API_KEY set, the code goes to the member's inbox. Without it (local demos) it's shown on screen.
  if (emailConfigured()) {
    try {
      await sendVerificationCode({ to: email, code, communityName: community.name, minutes: EMAIL_CODE_TTL_MINUTES });
    } catch (e) {
      console.error("Verification email failed", e);
      return { error: "We couldn't send the email just now. Try again in a minute, or verify with your ID card." };
    }
  }
  const demo = !emailConfigured();
  return { sentTo: maskEmail(email), demoCode: demo ? code : undefined };
}

/** Step 2 of email verification: the member types the code back in. */
export async function confirmEmailCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const community = await findCommunity(formData.get("slug"));
  if (!community) return { error: "That community doesn't exist." };
  const user = await requireUser(`/communities/${community.slug}/verify`);
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const entry = await db.communityMember.findUnique({ where: { userId_communityId: { userId: user.id, communityId: community.id } } });
  if (!entry || entry.method !== "EMAIL") return { error: "Ask for a code first." };
  const sentTo = entry.email ? maskEmail(entry.email) : undefined;
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code.", sentTo };

  const result = checkEmailCode(entry, hashCode(code));
  if (result === "missing") return { error: "Ask for a new code." };
  if (result === "too-many") return { error: "Too many tries. Ask for a new code." };
  if (result === "expired") return { error: "That code has expired. Ask for a new one." };
  if (result === "wrong") {
    await db.communityMember.update({ where: { id: entry.id }, data: { codeAttempts: { increment: 1 } } });
    return { error: "That code isn't right. Check the email and try again.", sentTo };
  }

  await db.communityMember.update({
    where: { id: entry.id },
    data: { status: "VERIFIED", verifiedAt: new Date(), codeHash: null, codeExpiresAt: null, codeAttempts: 0 },
  });
  await setFlash(`You're verified at ${community.shortName}. Members-only items and the exchange board are open to you.`);
  revalidatePath(`/communities/${community.slug}`);
  revalidatePath("/communities");
  redirect(`/communities/${community.slug}`);
}

/** Alternative for people without a school/work email: upload a student or staff ID for review. */
export async function submitIdCard(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const community = await findCommunity(formData.get("slug"));
  if (!community) return { error: "That community doesn't exist." };
  const user = await requireUser(`/communities/${community.slug}/verify`);
  const [photo] = parseList(formData.get("idCard"));
  if (!photo || !(await ownedUploads(user.id, [photo]))) return { error: "Upload a photo of your ID card." };
  const existing = await db.communityMember.findUnique({ where: { userId_communityId: { userId: user.id, communityId: community.id } } });
  if (existing?.status === "VERIFIED") redirect(`/communities/${community.slug}`);
  const data = { method: "ID_CARD" as const, status: "PENDING" as const, idCardPhoto: photo, codeHash: null, codeExpiresAt: null };
  await db.communityMember.upsert({
    where: { userId_communityId: { userId: user.id, communityId: community.id } },
    create: { ...data, userId: user.id, communityId: community.id },
    update: data,
  });
  revalidatePath(`/communities/${community.slug}`);
  return { pending: true };
}

// ------------------------------------------------------------ exchange board

const postSchema = z.object({
  type: z.enum(["REQUEST", "OFFER"], { error: "Choose whether you need something or have something." }),
  title: z.string().trim().min(4, "Give it a title of at least 4 characters.").max(80, "Keep the title under 80 characters."),
  body: z.string().trim().min(10, "Add a sentence or two (10 characters or more).").max(1000, "Keep it under 1,000 characters."),
});

export async function createCommunityPost(_prev: PostState, formData: FormData): Promise<PostState> {
  const slug = String(formData.get("slug") ?? "");
  const { user, community, member } = await requireMember(slug, `/communities/${slug}`);
  if (!community) return { error: "That community doesn't exist." };
  if (!member) return { error: `Only verified ${community.shortName} members can post.` };

  const parsed = postSchema.safeParse({ type: formData.get("type"), title: String(formData.get("title") ?? ""), body: String(formData.get("body") ?? "") });
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;

  const neededRaw = String(formData.get("neededBy") ?? "");
  let neededBy: Date | null = null;
  if (neededRaw) {
    if (!isISODate(neededRaw) || neededRaw < todayInLondon()) fieldErrors.neededBy = "Pick today or a later date.";
    else neededBy = toDate(neededRaw);
  }
  const priceRaw = String(formData.get("price") ?? "").trim();
  let pricePence: number | null = null;
  if (priceRaw) {
    const p = parsePounds(priceRaw);
    if (p === null || p > 100_000) fieldErrors.price = "Enter an amount in pounds, like 5 or 12.50.";
    else pricePence = p;
  }
  const photos = [...new Set(parseList(formData.get("photos")))].slice(0, 4);
  if (photos.length && !(await ownedUploads(user.id, photos))) fieldErrors.photos = "Upload the photos again.";
  if (Object.keys(fieldErrors).length || !parsed.success) return { fieldErrors };

  const post = await db.communityPost.create({
    data: { communityId: community.id, authorId: user.id, ...parsed.data, neededBy, pricePence, photos },
    select: { id: true },
  });
  await setFlash("Posted to the board.");
  revalidatePath(`/communities/${community.slug}`);
  redirect(`/communities/${community.slug}/posts/${post.id}`);
}

export async function addCommunityComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const { user, community, member } = await requireMember(slug, `/communities/${slug}/posts/${postId}`);
  if (!community) return { error: "That community doesn't exist." };
  if (!member) return { error: `Only verified ${community.shortName} members can reply.` };
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1) return { error: "Write a reply first." };
  if (body.length > 500) return { error: "Keep replies under 500 characters." };
  const post = await db.communityPost.findFirst({ where: { id: postId, communityId: community.id }, select: { id: true } });
  if (!post) return { error: "That post has been removed." };
  await db.communityComment.create({ data: { postId: post.id, authorId: user.id, body } });
  revalidatePath(`/communities/${community.slug}/posts/${post.id}`);
  revalidatePath(`/communities/${community.slug}`);
  return { ok: Date.now() };
}

/** The author marks a post as sorted (or reopens it). */
export async function setCommunityPostStatus(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const status = formData.get("status") === "FULFILLED" ? "FULFILLED" : "OPEN";
  const user = await requireUser(`/communities/${slug}/posts/${postId}`);
  const updated = await db.communityPost.updateMany({ where: { id: postId, authorId: user.id, community: { slug } }, data: { status } });
  if (updated.count) await setFlash(status === "FULFILLED" ? "Marked as sorted." : "Reopened.");
  revalidatePath(`/communities/${slug}/posts/${postId}`);
  revalidatePath(`/communities/${slug}`);
}

export async function deleteCommunityPost(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const postId = String(formData.get("postId") ?? "");
  const user = await requireUser(`/communities/${slug}/posts/${postId}`);
  const deleted = await db.communityPost.deleteMany({ where: { id: postId, authorId: user.id, community: { slug } } });
  if (deleted.count) await setFlash("Post removed.");
  revalidatePath(`/communities/${slug}`);
  redirect(`/communities/${slug}`);
}
