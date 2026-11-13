// Pure booking rules shared by the calendar (client) and the server actions.

import { eachDay, rangesOverlap, rentalDays, type ISODate } from "./dates";
import { MAX_RENTAL_DAYS } from "./money";

export type BookingStatusId = "REQUESTED" | "ACCEPTED" | "ACTIVE" | "COMPLETED" | "DECLINED" | "CANCELLED";
export type PartyId = "OWNER" | "RENTER";

/** Bookings in these states hold their dates. Pending requests don't block anyone. */
export const BLOCKING_STATUSES = ["ACCEPTED", "ACTIVE", "COMPLETED"] as const satisfies readonly BookingStatusId[];

export interface DateRange {
  start: ISODate;
  end: ISODate;
}

export interface Availability {
  today: ISODate;
  availableFrom: ISODate;
  availableTo: ISODate;
  blockedDates: ISODate[];
  bookedRanges: DateRange[];
}

export type DayState = "past" | "outside" | "blocked" | "booked" | "free";

export function dayState(day: ISODate, a: Availability, blocked: Set<ISODate>): DayState {
  if (day < a.today) return "past";
  if (day < a.availableFrom || day > a.availableTo) return "outside";
  if (blocked.has(day)) return "blocked";
  if (a.bookedRanges.some((r) => day >= r.start && day <= r.end)) return "booked";
  return "free";
}

/** Returns a sentence explaining why the range can't be booked, or null if it can. */
export function checkRange(start: ISODate, end: ISODate, a: Availability): string | null {
  if (end < start) return "The return date must be on or after the pickup date.";
  if (start < a.today) return "Pick dates from today onwards.";
  if (rentalDays(start, end) > MAX_RENTAL_DAYS) return `You can rent an item for up to ${MAX_RENTAL_DAYS} days at a time.`;
  if (start < a.availableFrom || end > a.availableTo) return "Those dates are outside the owner's availability.";
  const blocked = new Set(a.blockedDates);
  if (eachDay(start, end).some((d) => blocked.has(d))) return "The owner isn't available on some of those dates.";
  if (a.bookedRanges.some((r) => rangesOverlap(start, end, r.start, r.end))) return "Some of those dates are already booked.";
  return null;
}
