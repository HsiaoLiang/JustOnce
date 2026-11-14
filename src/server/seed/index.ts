// Wipes the database and loads the demo content from ./data.ts.
// Used by `npm run db:seed` and by the /demo/reset page.

import type { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, toDate, todayInLondon, type ISODate } from "../../lib/dates";
import { claimReasonLabel, formatGBP, quote } from "../../lib/money";
import { BOOKINGS, CHECK_NOTES, DEMO_PASSWORD, LISTINGS, USERS, type SeedBooking } from "./data";

export interface SeedSummary {
  users: number;
  listings: number;
  bookings: number;
  reviews: number;
  today: ISODate;
}

const pick = <T,>(items: T[], i: number) => items[i % items.length];

export async function recalculateRatings(prisma: PrismaClient | Prisma.TransactionClient) {
  await prisma.$executeRawUnsafe(`
    UPDATE "User" u SET "ratingCount" = COALESCE(s.c, 0), "ratingSum" = COALESCE(s.total, 0)
    FROM (SELECT u2.id, COUNT(r.id)::int AS c, SUM(r.rating)::int AS total
          FROM "User" u2 LEFT JOIN "Review" r ON r."subjectId" = u2.id GROUP BY u2.id) s
    WHERE u.id = s.id`);
  await prisma.$executeRawUnsafe(`
    UPDATE "Listing" l SET "ratingCount" = COALESCE(s.c, 0), "ratingSum" = COALESCE(s.total, 0)
    FROM (SELECT l2.id, COUNT(r.id)::int AS c, SUM(r.rating)::int AS total
          FROM "Listing" l2
          LEFT JOIN "Booking" b ON b."listingId" = l2.id
          LEFT JOIN "Review" r ON r."bookingId" = b.id AND r."authorRole" = 'RENTER'
          GROUP BY l2.id) s
    WHERE l.id = s.id`);
}

export async function seedDatabase(prisma: PrismaClient, options: { today?: ISODate } = {}): Promise<SeedSummary> {
  const today = options.today ?? todayInLondon();
  const now = Date.now();
  const day = (offset: number) => addDays(today, offset);
  // Timestamps are approximate London times; anything that would land in the future is pulled back.
  const at = (offset: number, time: string) => {
    const t = new Date(`${day(offset)}T${time}:00.000Z`);
    return t.getTime() > now ? new Date(now - 20 * 60_000) : t;
  };
  const later = (date: Date, minutes: number) => new Date(Math.min(date.getTime() + minutes * 60_000, now - 5 * 60_000));

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "DepositClaim", "BookingEvent", "Review", "HandoverCheck", "Booking", "BlockedDate", "Listing", "Session", "ImageBlob", "User" CASCADE`,
  );

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const usersById = new Map(USERS.map((u) => [u.id, u]));
  const listingsById = new Map(LISTINGS.map((l) => [l.id, l]));

  await prisma.user.createMany({
    data: USERS.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      passwordHash,
      area: u.area,
      avatarUrl: u.avatar ?? null,
      bio: u.bio,
      verifiedAt: u.verified ? at(-u.joinedDaysAgo + 2, "11:00") : null,
      createdAt: at(-u.joinedDaysAgo, "09:30"),
    })),
  });

  await prisma.listing.createMany({
    data: LISTINGS.map((l, i) => ({
      id: l.id,
      ownerId: l.owner,
      title: l.title,
      description: l.description,
      category: l.category,
      condition: l.condition,
      brand: l.brand ?? null,
      size: l.size ?? null,
      pricePerDay: l.price * 100,
      deposit: l.deposit * 100,
      area: l.area,
      pickupNotes: l.pickupNotes,
      photos: l.photos,
      availableFrom: toDate(day(-180)),
      availableTo: toDate(day(180)),
      featured: Boolean(l.featured),
      replacementValue: l.replacementValue ? l.replacementValue * 100 : null,
      fullDepositOnly: Boolean(l.fullDepositOnly),
      createdAt: at(-170 + i, "12:00"),
    })),
  });

  const blocked = LISTINGS.flatMap((l) =>
    (l.blocked ?? []).flatMap(([from, to]) =>
      Array.from({ length: to - from + 1 }, (_, i) => ({ listingId: l.id, date: toDate(day(from + i)) })),
    ),
  );
  if (blocked.length) await prisma.blockedDate.createMany({ data: blocked });

  let reviews = 0;
  for (const [index, b] of BOOKINGS.entries()) {
    reviews += await createSeedBooking(prisma, b, index);
  }

  await recalculateRatings(prisma);

  return { users: USERS.length, listings: LISTINGS.length, bookings: BOOKINGS.length, reviews, today };

  async function createSeedBooking(tx: PrismaClient, b: SeedBooking, index: number): Promise<number> {
    const listing = listingsById.get(b.listing);
    const renter = usersById.get(b.renter);
    if (!listing || !renter) throw new Error(`Bad seed booking ${b.listing} / ${b.renter}`);
    const owner = usersById.get(listing.owner)!;
    const days = b.end - b.start + 1;
    const q = quote(listing.price * 100, listing.deposit * 100, days);
    const firstName = (name: string) => name.split(" ")[0];

    const requestedOn = b.requestedOn ?? Math.min(b.start - 6, -2);
    const requestedAt = requestedOn === 0 ? new Date(now - 2 * 3_600_000) : at(requestedOn, "10:15");
    const respondedAt = later(requestedAt, 150);
    const confirmed = b.status === "ACCEPTED" || b.status === "ACTIVE" || b.status === "COMPLETED";

    const events: Prisma.BookingEventCreateWithoutBookingInput[] = [];
    const checks: Prisma.HandoverCheckUncheckedCreateWithoutBookingInput[] = [];
    const reviewRows: Prisma.ReviewUncheckedCreateWithoutBookingInput[] = [];
    const event = (type: string, createdAt: Date, actorId: string | null, note?: string) =>
      events.push({ type, createdAt, note: note ?? null, ...(actorId ? { actor: { connect: { id: actorId } } } : {}) });

    event("requested", requestedAt, renter.id, b.message);
    if (b.status === "DECLINED") event("declined", respondedAt, owner.id, b.declineReason);
    if (b.status === "CANCELLED") event("cancelled", later(requestedAt, 60 * 20), renter.id, "Cancelled before the owner responded. Nothing was charged.");
    if (confirmed) {
      event("accepted", respondedAt, owner.id, `${formatGBP(q.total, { alwaysShowPence: true })} paid · ${formatGBP(q.deposit)} deposit held`);
    }

    const photosFor = (party: "OWNER" | "RENTER") => [party === "OWNER" ? listing.photos[0] : (listing.photos[1] ?? listing.photos[0])];
    const addCheck = (stage: "PICKUP" | "RETURN", party: "OWNER" | "RENTER", createdAt: Date) => {
      const notes = CHECK_NOTES[`${stage === "PICKUP" ? "pickup" : "return"}${party === "OWNER" ? "Owner" : "Renter"}` as keyof typeof CHECK_NOTES];
      const flagged = Boolean(b.claim) && stage === "RETURN" && party === "OWNER";
      checks.push({
        stage,
        party,
        userId: party === "OWNER" ? owner.id : renter.id,
        condition: listing.condition,
        conditionOk: !flagged,
        notes: flagged ? b.claim!.returnIssue : pick(notes, index),
        photos: photosFor(party),
        createdAt,
      });
      event(stage === "PICKUP" ? "pickup_check" : "return_check", createdAt, party === "OWNER" ? owner.id : renter.id);
    };

    let pickedUpAt: Date | null = null;
    let returnedAt: Date | null = null;
    if (b.status === "ACTIVE" || b.status === "COMPLETED") {
      const sides = b.status === "COMPLETED" ? (["RENTER", "OWNER"] as const) : (b.pickupDone ?? []);
      sides.forEach((side, i) => addCheck("PICKUP", side, at(b.start, i === 0 ? "18:05" : "18:09")));
      pickedUpAt = at(b.start, "18:10");
      event("picked_up", pickedUpAt, null);
    }
    if (b.status === "ACTIVE") {
      (b.returnDone ?? []).forEach((side, i) => addCheck("RETURN", side, at(b.end, i === 0 ? "08:40" : "08:44")));
    }
    if (b.status === "COMPLETED") {
      addCheck("RETURN", "RENTER", at(b.end, "19:30"));
      addCheck("RETURN", "OWNER", at(b.end, "19:34"));
      returnedAt = at(b.end, "19:35");
      if (b.claim) {
        const kept = b.claim.amount * 100;
        event("completed", returnedAt, null, `${formatGBP(q.subtotal)} paid out to ${firstName(owner.name)} · ${formatGBP(q.deposit)} deposit held: ${firstName(owner.name)} reported a problem`);
        const claimedAt = at(b.end, "20:05");
        event("deposit_claimed", claimedAt, owner.id, `${formatGBP(kept)} of the ${formatGBP(q.deposit)} deposit claimed: ${claimReasonLabel(b.claim.reason)}. “${b.claim.ownerNote}”`);
        if (b.claim.status === "ACCEPTED") {
          const acceptedAt = at(b.end + 1, "09:20");
          event("deposit_claim_accepted", acceptedAt, renter.id, `${formatGBP(kept)} claim accepted`);
          event("deposit_part_released", later(acceptedAt, 1), null, `${formatGBP(kept)} kept by ${firstName(owner.name)} · ${formatGBP(q.deposit - kept)} returned to ${firstName(renter.name)}`);
        }
      } else {
        event("completed", returnedAt, null, `${formatGBP(q.deposit)} deposit released to ${firstName(renter.name)} · ${formatGBP(q.subtotal)} paid out to ${firstName(owner.name)}`);
      }
      if (b.renterReview) {
        const createdAt = at(b.end + 1, "12:10");
        reviewRows.push({ authorId: renter.id, subjectId: owner.id, authorRole: "RENTER", ...b.renterReview, createdAt });
        event("reviewed", createdAt, renter.id);
      }
      if (b.ownerReview) {
        const createdAt = at(b.end + 1, "20:45");
        reviewRows.push({ authorId: owner.id, subjectId: renter.id, authorRole: "OWNER", ...b.ownerReview, createdAt });
        event("reviewed", createdAt, owner.id);
      }
    }

    await tx.booking.create({
      data: {
        listingId: listing.id,
        ownerId: owner.id,
        renterId: renter.id,
        startDate: toDate(day(b.start)),
        endDate: toDate(day(b.end)),
        days,
        pricePerDay: q.pricePerDay,
        subtotal: q.subtotal,
        serviceFee: q.serviceFee,
        total: q.total,
        deposit: q.deposit,
        message: b.message ?? null,
        status: b.status,
        paymentStatus: confirmed ? "PAID" : "UNPAID",
        depositStatus: b.claim
          ? b.claim.status === "ACCEPTED"
            ? b.claim.amount * 100 >= q.deposit
              ? "KEPT"
              : "PART_RELEASED"
            : "IN_REVIEW"
          : b.status === "COMPLETED"
            ? "RELEASED"
            : confirmed
              ? "HELD"
              : "NONE",
        depositKept: b.claim?.status === "ACCEPTED" ? b.claim.amount * 100 : 0,
        claim: b.claim
          ? {
              create: {
                amount: b.claim.amount * 100,
                reason: b.claim.reason,
                ownerNote: b.claim.ownerNote,
                photos: [listing.photos[0]],
                status: b.claim.status,
                resolvedAmount: b.claim.status === "ACCEPTED" ? b.claim.amount * 100 : null,
                createdAt: at(b.end, "20:05"),
                respondedAt: b.claim.status === "ACCEPTED" ? at(b.end + 1, "09:20") : null,
                resolvedAt: b.claim.status === "ACCEPTED" ? at(b.end + 1, "09:20") : null,
              },
            }
          : undefined,
        payoutStatus: b.status === "COMPLETED" ? "PAID" : confirmed ? "SCHEDULED" : "NONE",
        declineReason: b.declineReason ?? null,
        cancelledById: b.status === "CANCELLED" ? renter.id : null,
        cancelledAt: b.status === "CANCELLED" ? later(requestedAt, 60 * 20) : null,
        respondedAt: confirmed || b.status === "DECLINED" ? respondedAt : null,
        pickedUpAt,
        returnedAt,
        createdAt: requestedAt,
        events: { create: events },
        checks: { create: checks },
        reviews: { create: reviewRows },
      },
    });
    return reviewRows.length;
  }
}
