// Deposit settlement shared by the claim actions and the lazy 48-hour checks.
// There's no job runner, so overdue deposits are settled when a booking page
// or dashboard loads, the same way expired requests are handled.

import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CLAIM_WINDOW_HOURS, formatGBP } from "@/lib/money";
import { firstName } from "@/lib/cn";

type Tx = Prisma.TransactionClient;

const money = (pence: number) => formatGBP(pence, { alwaysShowPence: pence % 100 !== 0 });
const windowStart = () => new Date(Date.now() - CLAIM_WINDOW_HOURS * 3_600_000);

/** Locks the booking row so two people acting at once can't both settle the deposit. */
export async function lockBooking(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
}

/**
 * Keeps `kept` pence for the owner and returns the rest to the renter, and writes
 * the timeline entry with both figures.
 */
export async function settleDeposit(tx: Tx, bookingId: string, kept: number) {
  const b = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { deposit: true, owner: { select: { name: true } }, renter: { select: { name: true } } },
  });
  const amount = Math.max(0, Math.min(kept, b.deposit));
  const returned = b.deposit - amount;
  const status = amount === 0 ? "RELEASED" : amount >= b.deposit ? "KEPT" : "PART_RELEASED";
  await tx.booking.update({ where: { id: bookingId }, data: { depositKept: amount, depositStatus: status } });
  const owner = firstName(b.owner.name);
  const renter = firstName(b.renter.name);
  await tx.bookingEvent.create({
    data: {
      bookingId,
      type: status === "KEPT" ? "deposit_kept" : status === "PART_RELEASED" ? "deposit_part_released" : "deposit_released",
      note:
        status === "KEPT"
          ? `The full ${money(b.deposit)} deposit was kept by ${owner}`
          : status === "PART_RELEASED"
            ? `${money(amount)} kept by ${owner} · ${money(returned)} returned to ${renter}`
            : `The full ${money(b.deposit)} deposit was returned to ${renter}`,
    },
  });
  return { kept: amount, returned, status };
}

/** Releases deposits nobody acted on within 48 hours. Safe to call on every page load. */
export async function settleOverdueDeposits(scope: Prisma.BookingWhereInput = {}) {
  const cutoff = windowStart();
  const [unconfirmed, unclaimed] = await Promise.all([
    // The renter confirmed the return, the owner never did.
    db.booking.findMany({
      where: {
        ...scope,
        status: "ACTIVE",
        AND: [
          { checks: { some: { stage: "RETURN", party: "RENTER", createdAt: { lt: cutoff } } } },
          { checks: { none: { stage: "RETURN", party: "OWNER" } } },
        ],
      },
      select: { id: true },
    }),
    // The owner flagged a problem but didn't claim within 48 hours.
    db.booking.findMany({
      where: {
        ...scope,
        status: "COMPLETED",
        depositStatus: "HELD",
        claim: { is: null },
        checks: { some: { stage: "RETURN", party: "OWNER", conditionOk: false, createdAt: { lt: cutoff } } },
      },
      select: { id: true },
    }),
  ]);

  for (const { id } of unconfirmed) {
    await db.$transaction(async (tx) => {
      await lockBooking(tx, id);
      const b = await tx.booking.findUniqueOrThrow({ where: { id }, include: { owner: { select: { name: true } } } });
      if (b.status !== "ACTIVE") return;
      await tx.booking.update({ where: { id }, data: { status: "COMPLETED", returnedAt: new Date(), payoutStatus: "PAID" } });
      await tx.bookingEvent.create({
        data: {
          bookingId: id,
          type: "completed",
          note: `${firstName(b.owner.name)} didn't confirm the return within ${CLAIM_WINDOW_HOURS} hours, so the rental was completed automatically`,
        },
      });
      await settleDeposit(tx, id, 0);
    });
  }

  for (const { id } of unclaimed) {
    await db.$transaction(async (tx) => {
      await lockBooking(tx, id);
      const b = await tx.booking.findUniqueOrThrow({ where: { id }, select: { depositStatus: true, claim: { select: { id: true } } } });
      if (b.depositStatus !== "HELD" || b.claim) return;
      await tx.bookingEvent.create({
        data: { bookingId: id, type: "claim_window_closed", note: `No claim was made within ${CLAIM_WINDOW_HOURS} hours` },
      });
      await settleDeposit(tx, id, 0);
    });
  }

  return unconfirmed.length + unclaimed.length;
}
