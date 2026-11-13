// Calendar-date helpers. A rental date is a plain day ("2026-11-21"), never a
// moment in time, so everything here works on YYYY-MM-DD strings and treats
// them as UTC midnight when a Date is needed. "Today" is today in London.

export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function todayInLondon(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function toDate(iso: ISODate): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function isISODate(value: unknown): value is ISODate {
  return typeof value === "string" && ISO_RE.test(value) && toISO(toDate(value)) === value;
}

export function addDays(iso: ISODate, days: number): ISODate {
  return toISO(new Date(toDate(iso).getTime() + days * DAY_MS));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);
}

/** Inclusive number of rental days: Fri → Sun is 3 days. */
export function rentalDays(start: ISODate, end: ISODate): number {
  return diffDays(start, end) + 1;
}

export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function rangesOverlap(aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = toDate(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

/** 0 = Monday … 6 = Sunday (UK weeks start on Monday). */
export function weekdayIndex(iso: ISODate): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options });
const dayMonth = fmt({ day: "numeric", month: "short" });
const weekdayDayMonth = fmt({ weekday: "short", day: "numeric", month: "short" });
const dayMonthYear = fmt({ day: "numeric", month: "short", year: "numeric" });
const monthYear = fmt({ month: "long", year: "numeric" });
const longDay = fmt({ weekday: "long", day: "numeric", month: "long" });

/** "Sat 21 Nov" */
export function formatDay(iso: ISODate): string {
  return weekdayDayMonth.format(toDate(iso));
}

/** "Saturday 21 November" */
export function formatLongDay(iso: ISODate): string {
  return longDay.format(toDate(iso));
}

/** "21 Nov 2026" */
export function formatFullDate(iso: ISODate): string {
  return dayMonthYear.format(toDate(iso));
}

/** "November 2026" */
export function formatMonth(iso: ISODate): string {
  return monthYear.format(toDate(iso));
}

/** "21–23 Nov", "30 Nov – 2 Dec", "30 Dec 2026 – 2 Jan 2027", or "Sat 21 Nov" for one day. */
export function formatRange(start: ISODate, end: ISODate): string {
  if (start === end) return formatDay(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = sameYear && start.slice(5, 7) === end.slice(5, 7);
  if (sameMonth) return `${Number(start.slice(8))}–${dayMonth.format(toDate(end))}`;
  if (sameYear) return `${dayMonth.format(toDate(start))} – ${dayMonth.format(toDate(end))}`;
  return `${dayMonthYear.format(toDate(start))} – ${dayMonthYear.format(toDate(end))}`;
}

/** "14 Nov, 18:05" in London time, for timeline entries. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "Member since March 2025" style month + year for a timestamp. */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "long", year: "numeric" }).format(date);
}

/** "in 3 days", "tomorrow", "today", "2 days ago" relative to London today. */
export function relativeDay(iso: ISODate, today: ISODate = todayInLondon()): string {
  const diff = diffDays(today, iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}
