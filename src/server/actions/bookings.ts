"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../db";
import { requireUser } from "../auth";
import { setFlash } from "../flash";
import { BLOCKING_STATUSES, checkRange } from "@/lib/booking-rules";
import { formatDay, isISODate, rentalDays, todayInLondon, toDate, toISO } from "@/lib/dates";
import { formatGBP, quote } from "@/lib/money";
import { isConditionId } from "@/lib/catalogue";
import { firstName } from "@/lib/cn";
import { isAllowedPhotoUrl } from "@/lib/photos";

export type RequestState = { error?: string } | undefined;
export type FormState = { error?: string; ok?: boolean } | undefined;

class ActionError extends Error {}

const blocking = [...BLOCKING_STATUSES];
const money = (pence: number) => formatGBP(pence, { alwaysShowPence: pence % 100 !== 0 });

function isOverlapViolation(error: unknown) {
  return error instanceof Error && error.message.includes("Booking_no_overlapping_confirmed");
}

function refreshBookingViews(id: string) {
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/dashboard/rentals");
  revalidatePath("/dashboard/listings");
}

// ---------------------------------------------------------------- request

export async function requestBooking(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const listingId = String(formData.get("listingId") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 500) || null;
  const user = await requireUser(`/items/${listingId}`);

  if (!isISODate(start) || !isISODate(end)) return { error: "Choose your pickup and return dates first." };
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { owner: { select: { name: true } } } });
  if (!listing || listing.status !== "ACTIVE") return { error: "This item isn't available to book right now." };
  if (listing.ownerId === user.id) return { error: "This is your own listing, so there's nothing to book." };

  const overlap = { startDate: { lte: toDate(end) }, endDate: { gte: toDate(start) } };
  const [blocked, booked, duplicate] = await Promise.all([
    db.blockedDate.findMany({ where: { listingId, date: { gte: toDate(start), lte: toDate(end) } }, select: { date: true } }),
    db.booking.findMany({ where: { listingId, status: { in: blocking }, ...overlap }, select: { startDate: true, endDate: true } }),
    db.booking.findFirst({ where: { listingId, renterId: user.id, status: { in: ["REQUESTED", ...blocking] }, ...overlap }, select: { id: true } }),
  ]);
  if (duplicate) return { error: "You've already asked for some of these dates. Check My rentals." };

  const problem = checkRange(start, end, {
    today: todayInLondon(),
    availableFrom: toISO(listing.availableFrom),
    availableTo: toISO(listing.availableTo),
    blockedDates: blocked.map((b) => toISO(b.date)),
    bookedRanges: booked.map((b) => ({ start: toISO(b.startDate), end: toISO(b.endDate) })),
  });
  if (problem) return { error: problem };

  const q = quote(listing.pricePerDay, listing.deposit, rentalDays(start, end));
  const booking = await db.booking.create({
    data: {
      listingId,
      ownerId: listing.ownerId,
      renterId: user.id,
      startDate: toDate(start),
      endDate: toDate(end),
      days: q.days,
      pricePerDay: q.pricePerDay,
      subtotal: q.subtotal,
      serviceFee: q.serviceFee,
      total: q.total,
      deposit: q.deposit,
      message,
      events: { create: { type: "requested", actorId: user.id, note: message } },
    },
  });

  revalidatePath("/dashboard/rentals");
  revalidatePath("/dashboard/listings");
  await setFlash(`Request sent to ${firstName(listing.owner.name)}. Nothing is charged until it's accepted.`);
  redirect(`/bookings/${booking.id}`);
}

// ---------------------------------------------------------------- owner responses

export async function acceptBooking(formData: FormData) {
  const id = String(formData.get("bookingId") ?? "");
  const user = await requireUser(`/bookings/${id}`);
  const today = todayInLondon();
  try {
    const result = await db.$transaction(async (tx) => {
      const b = await tx.booking.findUnique({ where: { id }, include: { renter: { select: { name: true } } } });
      if (!b || b.ownerId !== user.id) throw new ActionError("Only the owner can accept this request.");
      // Serialise decisions for the same item so two accepts can't race each other.
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${b.listingId} FOR UPDATE`;
      const fresh = await tx.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (fresh.status !== "REQUESTED") throw new ActionError("This request has already been answered.");
      if (toISO(b.startDate) < today) throw new ActionError("This request has expired because the pickup date has passed.");
      const clash = await tx.booking.findFirst({
        where: { listingId: b.listingId, id: { not: id }, status: { in: blocking }, startDate: { lte: b.endDate }, endDate: { gte: b.startDate } },
        select: { id: true },
      });
      if (clash) throw new ActionError("You've already accepted another booking for some of these dates.");

      await tx.booking.update({
        where: { id },
        data: { status: "ACCEPTED", paymentStatus: "PAID", depositStatus: "HELD", payoutStatus: "SCHEDULED", respondedAt: new Date() },
      });
      await tx.bookingEvent.create({
        data: { bookingId: id, actorId: user.id, type: "accepted", note: `${money(b.total)} paid · ${money(b.deposit)} deposit held` },
      });

      // Anyone else who asked for overlapping dates gets a clear answer straight away.
      const overlapping = await tx.booking.findMany({
        where: { listingId: b.listingId, id: { not: id }, status: "REQUESTED", startDate: { lte: b.endDate }, endDate: { gte: b.startDate } },
        select: { id: true },
      });
      if (overlapping.length) {
        await tx.booking.updateMany({
          where: { id: { in: overlapping.map((o) => o.id) } },
          data: { status: "DECLINED", declineReason: "These dates were booked by another renter.", respondedAt: new Date() },
        });
        await tx.bookingEvent.createMany({
          data: overlapping.map((o) => ({
            bookingId: o.id,
            type: "auto_declined",
            note: "Another request for these dates was accepted, so this one was declined automatically. Nothing was charged.",
          })),
        });
      }
      return { renter: b.renter.name, total: b.total, deposit: b.deposit, overlapping: overlapping.length };
    });

    const extra = result.overlapping ? ` ${result.overlapping} overlapping request${result.overlapping > 1 ? "s were" : " was"} declined automatically.` : "";
    await setFlash(`Booking confirmed. ${firstName(result.renter)} paid ${money(result.total)} and the ${money(result.deposit)} deposit is held.${extra}`);
  } catch (error) {
    if (error instanceof ActionError) await setFlash(error.message, "error");
    else if (isOverlapViolation(error)) await setFlash("Those dates have just been booked by someone else.", "error");
    else throw error;
  }
  refreshBookingViews(id);
}

export async function declineBooking(formData: FormData) {
  const id = String(formData.get("bookingId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  const user = await requireUser(`/bookings/${id}`);
  const b = await db.booking.findUnique({ where: { id }, include: { renter: { select: { name: true } } } });
  if (!b || b.ownerId !== user.id) return void (await setFlash("Only the owner can decline this request.", "error"));
  if (b.status !== "REQUESTED") return void (await setFlash("This request has already been answered.", "error"));
  await db.$transaction([
    db.booking.update({ where: { id }, data: { status: "DECLINED", declineReason: reason, respondedAt: new Date() } }),
    db.bookingEvent.create({ data: { bookingId: id, actorId: user.id, type: "declined", note: reason } }),
  ]);
  await setFlash(`Request declined. ${firstName(b.renter.name)} hasn't been charged.`, "info");
  refreshBookingViews(id);
}

export async function cancelBooking(formData: FormData) {
  const id = String(formData.get("bookingId") ?? "");
  const user = await requireUser(`/bookings/${id}`);
  const b = await db.booking.findUnique({ where: { id } });
  if (!b || (b.renterId !== user.id && b.ownerId !== user.id)) return void (await setFlash("You can't cancel this booking.", "error"));
  const isRenter = b.renterId === user.id;
  const cancellable = b.status === "ACCEPTED" || (b.status === "REQUESTED" && isRenter);
  if (!cancellable) return void (await setFlash("This booking can't be cancelled any more.", "error"));
  const paid = b.status === "ACCEPTED";
  const note = paid
    ? `Full refund of ${money(b.total)} issued and the ${money(b.deposit)} deposit released.`
    : "Cancelled before the owner responded. Nothing was charged.";
  await db.$transaction([
    db.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledById: user.id,
        cancelledAt: new Date(),
        ...(paid ? { paymentStatus: "REFUNDED", depositStatus: "RELEASED", payoutStatus: "NONE" } : {}),
      },
    }),
    db.bookingEvent.create({ data: { bookingId: id, actorId: user.id, type: "cancelled", note } }),
  ]);
  await setFlash(paid ? `Booking cancelled. ${note}` : "Request cancelled. Nothing was charged.", "info");
  refreshBookingViews(id);
}

// ---------------------------------------------------------------- handover checks

export async function submitCheck(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("bookingId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const condition = String(formData.get("condition") ?? "");
  const conditionOk = String(formData.get("conditionOk") ?? "yes") !== "no";
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 600) || null;
  let photos: unknown;
  try {
    photos = JSON.parse(String(formData.get("photos") ?? "[]"));
  } catch {
    photos = [];
  }
  const user = await requireUser(`/bookings/${id}`);

  if (stage !== "PICKUP" && stage !== "RETURN") return { error: "Something went wrong. Refresh the page and try again." };
  if (!isConditionId(condition)) return { error: "Choose the condition the item is in." };
  if (!Array.isArray(photos) || photos.length === 0) return { error: "Add at least one photo of the item." };
  if (photos.length > 6 || !photos.every(isAllowedPhotoUrl)) return { error: "Add up to 6 photos taken with this form." };
  if (!conditionOk && !notes) return { error: "Describe what's different so there's a record of it." };

  const b = await db.booking.findUnique({
    where: { id },
    include: { checks: true, owner: { select: { name: true } }, renter: { select: { name: true } } },
  });
  if (!b) return { error: "This booking doesn't exist." };
  const party = b.ownerId === user.id ? "OWNER" : b.renterId === user.id ? "RENTER" : null;
  if (!party) return { error: "Only the owner and the renter can confirm this handover." };
  if (stage === "PICKUP" && b.status !== "ACCEPTED") return { error: "The pickup check opens once the booking is confirmed." };
  if (stage === "RETURN" && b.status !== "ACTIVE") return { error: "The return check opens once the item has been picked up." };
  if (b.checks.some((c) => c.stage === stage && c.party === party)) return { error: "You've already confirmed this step." };

  const other = party === "OWNER" ? b.renter.name : b.owner.name;
  let finished = false;
  try {
    finished = await db.$transaction(async (tx) => {
      await tx.handoverCheck.create({
        data: { bookingId: id, stage, party, userId: user.id, condition, conditionOk, notes, photos: photos as string[] },
      });
      await tx.bookingEvent.create({
        data: { bookingId: id, actorId: user.id, type: stage === "PICKUP" ? "pickup_check" : "return_check", note: conditionOk ? null : notes },
      });
      const count = await tx.handoverCheck.count({ where: { bookingId: id, stage } });
      if (count < 2) return false;
      if (stage === "PICKUP") {
        const moved = await tx.booking.updateMany({ where: { id, status: "ACCEPTED" }, data: { status: "ACTIVE", pickedUpAt: new Date() } });
        if (moved.count) await tx.bookingEvent.create({ data: { bookingId: id, type: "picked_up" } });
      } else {
        const moved = await tx.booking.updateMany({
          where: { id, status: "ACTIVE" },
          data: { status: "COMPLETED", returnedAt: new Date(), depositStatus: "RELEASED", payoutStatus: "PAID" },
        });
        if (moved.count) {
          await tx.bookingEvent.create({
            data: {
              bookingId: id,
              type: "completed",
              note: `${money(b.deposit)} deposit released to ${firstName(b.renter.name)} · ${money(b.subtotal)} paid out to ${firstName(b.owner.name)}`,
            },
          });
        }
      }
      return true;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "You've already confirmed this step." };
    throw error;
  }

  if (stage === "PICKUP") {
    await setFlash(finished ? `Pickup confirmed by you both. Enjoy it! It's due back ${formatDay(toISO(b.endDate))}.` : `Pickup check saved. Waiting for ${firstName(other)} to confirm.`);
  } else {
    await setFlash(
      finished
        ? `Return confirmed. The ${money(b.deposit)} deposit has been released to ${firstName(b.renter.name)}.`
        : `Return check saved. Waiting for ${firstName(other)} to confirm.`,
    );
  }
  refreshBookingViews(id);
  return { ok: true };
}

// ---------------------------------------------------------------- reviews

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("bookingId") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  const user = await requireUser(`/bookings/${id}`);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a star rating." };
  if (comment.length < 3) return { error: "Add a few words about how it went." };

  const b = await db.booking.findUnique({ where: { id }, include: { reviews: true, owner: { select: { name: true } }, renter: { select: { name: true } } } });
  if (!b) return { error: "This booking doesn't exist." };
  const role = b.ownerId === user.id ? "OWNER" : b.renterId === user.id ? "RENTER" : null;
  if (!role) return { error: "Only the owner and renter can review this rental." };
  if (b.status !== "COMPLETED") return { error: "You can leave a review once the item has been returned." };
  if (b.reviews.some((r) => r.authorId === user.id)) return { error: "You've already reviewed this rental." };
  const subjectId = role === "OWNER" ? b.renterId : b.ownerId;

  try {
    await db.$transaction([
      db.review.create({ data: { bookingId: id, authorId: user.id, subjectId, authorRole: role, rating, comment } }),
      db.user.update({ where: { id: subjectId }, data: { ratingCount: { increment: 1 }, ratingSum: { increment: rating } } }),
      ...(role === "RENTER"
        ? [db.listing.update({ where: { id: b.listingId }, data: { ratingCount: { increment: 1 }, ratingSum: { increment: rating } } })]
        : []),
      db.bookingEvent.create({ data: { bookingId: id, actorId: user.id, type: "reviewed" } }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "You've already reviewed this rental." };
    throw error;
  }
  const subjectName = role === "OWNER" ? b.renter.name : b.owner.name;
  await setFlash(`Thanks! Your review is now on ${firstName(subjectName)}'s profile.`);
  refreshBookingViews(id);
  revalidatePath(`/users/${subjectId}`);
  revalidatePath(`/items/${b.listingId}`);
  return { ok: true };
}
