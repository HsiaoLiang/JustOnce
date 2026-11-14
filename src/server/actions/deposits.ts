"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { setFlash } from "../flash";
import { lockBooking, settleDeposit } from "../deposits";
import { CLAIM_REASONS, CLAIM_WINDOW_HOURS, claimReasonLabel, formatGBP, parsePounds, type ClaimReasonId } from "@/lib/money";
import { isAllowedPhotoUrl, MAX_CHECK_PHOTOS } from "@/lib/photos";
import { DEMO_MODE } from "@/lib/demo";
import { firstName } from "@/lib/cn";

export type ClaimFormState = { error?: string; ok?: boolean } | undefined;

class ClaimError extends Error {}

const money = (pence: number) => formatGBP(pence, { alwaysShowPence: pence % 100 !== 0 });

function refresh(id: string) {
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/dashboard/rentals");
  revalidatePath("/dashboard/listings");
}

async function run(fn: () => Promise<string>): Promise<ClaimFormState> {
  try {
    await setFlash(await fn());
    return { ok: true };
  } catch (error) {
    if (error instanceof ClaimError) return { error: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "There's already a claim on this booking." };
    throw error;
  }
}

/** Owner claims part or all of the deposit after flagging a problem at the return check. */
export async function fileDepositClaim(_prev: ClaimFormState, formData: FormData): Promise<ClaimFormState> {
  const id = String(formData.get("bookingId") ?? "");
  const amount = parsePounds(String(formData.get("amount") ?? ""));
  const reason = String(formData.get("reason") ?? "") as ClaimReasonId;
  const ownerNote = String(formData.get("note") ?? "").trim().slice(0, 600);
  const user = await requireUser(`/bookings/${id}`);

  if (amount === null || amount < 100) return { error: "Enter an amount of at least £1." };
  if (!CLAIM_REASONS.some((r) => r.id === reason)) return { error: "Choose a reason for the claim." };
  if (ownerNote.length < 5) return { error: "Say what's wrong so the renter understands the claim." };

  const result = await run(() =>
    db.$transaction(async (tx) => {
      await lockBooking(tx, id);
      const b = await tx.booking.findUnique({
        where: { id },
        include: { checks: true, claim: true, renter: { select: { name: true } } },
      });
      if (!b || b.ownerId !== user.id) throw new ClaimError("Only the owner can claim from this deposit.");
      if (b.claim) throw new ClaimError("There's already a claim on this booking.");
      const ownerReturn = b.checks.find((c) => c.stage === "RETURN" && c.party === "OWNER");
      if (!ownerReturn || ownerReturn.conditionOk) throw new ClaimError("You can only claim after reporting a problem at the return check.");
      if (b.depositStatus !== "HELD" || (b.status !== "ACTIVE" && b.status !== "COMPLETED")) throw new ClaimError("This deposit can't be claimed any more.");
      if (Date.now() - ownerReturn.createdAt.getTime() > CLAIM_WINDOW_HOURS * 3_600_000) {
        throw new ClaimError(`Claims have to be made within ${CLAIM_WINDOW_HOURS} hours of the return check.`);
      }
      if (amount > b.deposit) throw new ClaimError(`You can claim up to the ${money(b.deposit)} deposit.`);

      await tx.depositClaim.create({ data: { bookingId: id, amount, reason, ownerNote, photos: ownerReturn.photos } });
      if (b.status === "COMPLETED") await tx.booking.update({ where: { id }, data: { depositStatus: "IN_REVIEW" } });
      await tx.bookingEvent.create({
        data: { bookingId: id, actorId: user.id, type: "deposit_claimed", note: `${money(amount)} of the ${money(b.deposit)} deposit claimed: ${claimReasonLabel(reason)}. “${ownerNote}”` },
      });
      return `Claim sent. ${firstName(b.renter.name)} can accept it or contest it.`;
    }),
  );
  refresh(id);
  return result;
}

/** Owner decides not to claim after all. */
export async function releaseHeldDeposit(formData: FormData) {
  const id = String(formData.get("bookingId") ?? "");
  const user = await requireUser(`/bookings/${id}`);
  await run(() =>
    db.$transaction(async (tx) => {
      await lockBooking(tx, id);
      const b = await tx.booking.findUnique({ where: { id }, include: { claim: true, renter: { select: { name: true } } } });
      if (!b || b.ownerId !== user.id) throw new ClaimError("Only the owner can release this deposit.");
      if (b.status !== "COMPLETED" || b.depositStatus !== "HELD" || b.claim) throw new ClaimError("This deposit has already been settled.");
      await settleDeposit(tx, id, 0);
      return `Deposit released. ${firstName(b.renter.name)} gets the full ${money(b.deposit)} back.`;
    }),
  ).then(async (r) => r?.error && (await setFlash(r.error, "error")));
  refresh(id);
}

/** Renter accepts the claim (the amount is kept, the rest returned) or contests it. */
export async function respondToClaim(_prev: ClaimFormState, formData: FormData): Promise<ClaimFormState> {
  const id = String(formData.get("bookingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 600);
  let photos: unknown = [];
  try {
    photos = JSON.parse(String(formData.get("photos") ?? "[]"));
  } catch {
    photos = [];
  }
  const user = await requireUser(`/bookings/${id}`);
  if (decision !== "accept" && decision !== "contest") return { error: "Choose whether to accept or contest the claim." };
  if (decision === "contest") {
    if (note.length < 5) return { error: "Explain why you disagree so it can be reviewed fairly." };
    if (!Array.isArray(photos) || photos.length > MAX_CHECK_PHOTOS || !photos.every(isAllowedPhotoUrl)) return { error: `Add up to ${MAX_CHECK_PHOTOS} photos.` };
    const uploads = (photos as string[]).filter((p) => p.startsWith("/api/images/")).map((p) => p.slice("/api/images/".length));
    const owned = uploads.length ? await db.imageBlob.count({ where: { id: { in: uploads }, ownerId: user.id } }) : 0;
    if (owned !== uploads.length || uploads.length !== (photos as string[]).length) return { error: "Some photos couldn't be used. Upload them again." };
  }

  const result = await run(() =>
    db.$transaction(async (tx) => {
      await lockBooking(tx, id);
      const b = await tx.booking.findUnique({ where: { id }, include: { claim: true, owner: { select: { name: true } } } });
      if (!b || b.renterId !== user.id) throw new ClaimError("Only the renter can respond to this claim.");
      if (!b.claim || b.claim.status !== "OPEN") throw new ClaimError("This claim has already been answered.");
      if (b.status !== "COMPLETED") throw new ClaimError("You can respond once the return is confirmed.");
      if (decision === "accept") {
        await tx.depositClaim.update({
          where: { id: b.claim.id },
          data: { status: "ACCEPTED", resolvedAmount: b.claim.amount, respondedAt: new Date(), resolvedAt: new Date() },
        });
        await tx.bookingEvent.create({ data: { bookingId: id, actorId: user.id, type: "deposit_claim_accepted", note: `${money(b.claim.amount)} claim accepted` } });
        const { returned } = await settleDeposit(tx, id, b.claim.amount);
        return returned > 0 ? `Claim accepted. ${money(returned)} of your deposit is on its way back.` : "Claim accepted. The deposit goes to the owner.";
      }
      await tx.depositClaim.update({
        where: { id: b.claim.id },
        data: { status: "CONTESTED", renterNote: note, renterPhotos: photos as string[], respondedAt: new Date() },
      });
      await tx.bookingEvent.create({ data: { bookingId: id, actorId: user.id, type: "deposit_claim_contested", note: `“${note}”` } });
      return `Claim contested. Just Once will look at both sides and ${firstName(b.owner.name)}'s photos.`;
    }),
  );
  refresh(id);
  return result;
}

/** Demo stand-in for the support team reviewing a contested claim. */
export async function resolveClaim(formData: FormData) {
  const id = String(formData.get("bookingId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const user = await requireUser(`/bookings/${id}`);
  if (!DEMO_MODE) return void (await setFlash("Claims are resolved by the support team.", "error"));
  const r = await run(() =>
    db.$transaction(async (tx) => {
      await lockBooking(tx, id);
      const b = await tx.booking.findUnique({ where: { id }, include: { claim: true } });
      if (!b || (b.ownerId !== user.id && b.renterId !== user.id)) throw new ClaimError("You're not part of this booking.");
      if (!b.claim || b.claim.status !== "CONTESTED") throw new ClaimError("Only contested claims need a decision.");
      const kept = outcome === "full" ? b.claim.amount : outcome === "half" ? Math.round(b.claim.amount / 2) : outcome === "none" ? 0 : null;
      if (kept === null) throw new ClaimError("Choose an outcome.");
      await tx.depositClaim.update({ where: { id: b.claim.id }, data: { status: "RESOLVED", resolvedAmount: kept, resolvedAt: new Date() } });
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: "deposit_claim_resolved",
          note: kept === 0 ? "Just Once reviewed the claim and rejected it" : `Just Once reviewed the claim and upheld ${money(kept)} of the ${money(b.claim.amount)} claimed`,
        },
      });
      await settleDeposit(tx, id, kept);
      return kept === 0 ? "Claim rejected. The full deposit goes back to the renter." : `Claim resolved: ${money(kept)} kept, the rest returned.`;
    }),
  );
  if (r?.error) await setFlash(r.error, "error");
  refresh(id);
}
