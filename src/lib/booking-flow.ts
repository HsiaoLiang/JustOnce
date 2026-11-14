// What happens next in a booking, from the point of view of the person looking at it.

import { addDays, diffDays, formatDay, todayInLondon, type ISODate } from "./dates";
import type { BookingStatusId, PartyId } from "./booking-rules";
import { firstName } from "./cn";

export type DepositStatusId = "NONE" | "HELD" | "IN_REVIEW" | "PART_RELEASED" | "KEPT" | "RELEASED";
export type ClaimStatusId = "OPEN" | "ACCEPTED" | "CONTESTED" | "RESOLVED";

export interface FlowBooking {
  status: BookingStatusId;
  startDate: ISODate;
  endDate: ISODate;
  returnedAt?: Date | null;
  checks: { stage: "PICKUP" | "RETURN"; party: PartyId; conditionOk?: boolean }[];
  reviews: { authorRole: PartyId }[];
  depositStatus?: DepositStatusId;
  claim?: { status: ClaimStatusId } | null;
}

export interface NextStep {
  /** Short call to action or status line. */
  label: string;
  /** True when the viewer is the one holding things up. */
  needsYou: boolean;
}

const REVIEW_WINDOW_DAYS = 30;

export function hasCheck(b: FlowBooking, stage: "PICKUP" | "RETURN", party: PartyId) {
  return b.checks.some((c) => c.stage === stage && c.party === party);
}

export function hasReviewed(b: FlowBooking, party: PartyId) {
  return b.reviews.some((r) => r.authorRole === party);
}

export function otherParty(party: PartyId): PartyId {
  return party === "OWNER" ? "RENTER" : "OWNER";
}

/** The owner said at the return check that the item isn't in the same condition. */
export function ownerFlaggedReturn(b: FlowBooking) {
  return b.checks.some((c) => c.stage === "RETURN" && c.party === "OWNER" && c.conditionOk === false);
}

/** Deposit decisions come before reviews: they're what's actually holding money. */
export function depositStep(b: FlowBooking, viewer: PartyId, other: string): NextStep | null {
  if (b.claim?.status === "OPEN") {
    return viewer === "RENTER"
      ? { label: `Respond to ${other}'s deposit claim`, needsYou: true }
      : { label: `Waiting for ${other} to respond to your claim`, needsYou: false };
  }
  if (b.claim?.status === "CONTESTED") return { label: "Claim under review", needsYou: false };
  if (!b.claim && b.depositStatus === "HELD" && b.status === "COMPLETED" && ownerFlaggedReturn(b)) {
    return viewer === "OWNER"
      ? { label: "Claim from the deposit or release it", needsYou: true }
      : { label: `Waiting for ${other} to decide on the deposit`, needsYou: false };
  }
  return null;
}

export function nextStep(b: FlowBooking, viewer: PartyId, otherName: string, today: ISODate = todayInLondon()): NextStep {
  const other = firstName(otherName);
  switch (b.status) {
    case "REQUESTED":
      if (b.startDate < today) return { label: "Request expired", needsYou: false };
      return viewer === "OWNER"
        ? { label: "Accept or decline this request", needsYou: true }
        : { label: `Waiting for ${other} to respond`, needsYou: false };
    case "ACCEPTED": {
      if (hasCheck(b, "PICKUP", viewer)) return { label: `Waiting for ${other} to confirm pickup`, needsYou: false };
      const soon = b.startDate <= addDays(today, 1) || hasCheck(b, "PICKUP", otherParty(viewer));
      const when = b.startDate === today ? "today" : b.startDate < today ? "now" : formatDay(b.startDate);
      return { label: `Pickup check ${b.startDate <= today ? "due" : "on"} ${when}`, needsYou: soon };
    }
    case "ACTIVE": {
      if (hasCheck(b, "RETURN", viewer)) return { label: `Waiting for ${other} to confirm the return`, needsYou: false };
      const soon = b.endDate <= addDays(today, 1) || hasCheck(b, "RETURN", otherParty(viewer));
      const days = diffDays(today, b.endDate);
      const when = days < 0 ? "overdue" : days === 0 ? "due today" : days === 1 ? "due tomorrow" : `due ${formatDay(b.endDate)}`;
      return { label: `Return ${when}`, needsYou: soon };
    }
    case "COMPLETED": {
      const deposit = depositStep(b, viewer, other);
      if (deposit) return deposit;
      if (hasReviewed(b, viewer)) return { label: "Completed", needsYou: false };
      const recent = !b.returnedAt || Date.now() - b.returnedAt.getTime() < REVIEW_WINDOW_DAYS * 86_400_000;
      return recent ? { label: `Rate ${other}`, needsYou: true } : { label: "Completed", needsYou: false };
    }
    case "DECLINED":
      return { label: "Declined", needsYou: false };
    case "CANCELLED":
      return { label: "Cancelled", needsYou: false };
  }
}

export type StepKey = "requested" | "confirmed" | "pickedUp" | "returned" | "rated";

export const STEPS: { key: StepKey; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pickedUp", label: "Picked up" },
  { key: "returned", label: "Returned" },
  { key: "rated", label: "Rated" },
];

/** Index of the last completed step (0-based), for the progress bar. */
export function progressIndex(b: FlowBooking): number {
  switch (b.status) {
    case "REQUESTED":
    case "DECLINED":
    case "CANCELLED":
      return 0;
    case "ACCEPTED":
      return 1;
    case "ACTIVE":
      return 2;
    case "COMPLETED":
      return b.reviews.length >= 2 ? 4 : 3;
  }
}

export const STATUS_STAMP: Record<BookingStatusId, string> = {
  REQUESTED: "Pending",
  ACCEPTED: "Confirmed",
  ACTIVE: "On rent",
  COMPLETED: "Returned",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

export function statusChip(status: BookingStatusId, viewer: PartyId, expired = false): { label: string; tone: "accent" | "neutral" | "success" | "muted" | "dark" | "danger" } {
  if (status === "REQUESTED" && expired) return { label: "Expired", tone: "muted" };
  switch (status) {
    case "REQUESTED":
      return viewer === "OWNER" ? { label: "New request", tone: "accent" } : { label: "Request sent", tone: "neutral" };
    case "ACCEPTED":
      return { label: "Confirmed", tone: "dark" };
    case "ACTIVE":
      return { label: "On rent", tone: "success" };
    case "COMPLETED":
      return { label: "Completed", tone: "neutral" };
    case "DECLINED":
      return { label: "Declined", tone: "muted" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "muted" };
  }
}
