"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookingProvider } from "@/components/booking-widget";
import type { HandoverMethodId } from "@/lib/money";
import { addDays, todayInLondon, type ISODate } from "@/lib/dates";

/**
 * The real BookingProvider, fed availability that's worked out from day offsets in the browser.
 * The page is built once, so "today" has to come from the visitor's clock, not the build machine's.
 */
export function DemoBookingProvider({
  buildToday,
  availableFromOffset,
  blockedOffsets,
  bookedOffsets,
  handoverMethods,
  ownerArea,
  children,
}: {
  buildToday: ISODate;
  availableFromOffset: number;
  blockedOffsets: number[];
  bookedOffsets: { start: number; end: number }[];
  handoverMethods: HandoverMethodId[];
  ownerArea: string;
  children: ReactNode;
}) {
  const [today, setToday] = useState(buildToday);
  useEffect(() => setToday(todayInLondon()), []);
  const availability = useMemo(
    () => ({
      today,
      availableFrom: addDays(today, availableFromOffset),
      availableTo: addDays(today, 180),
      blockedDates: blockedOffsets.map((d) => addDays(today, d)),
      bookedRanges: bookedOffsets.map((r) => ({ start: addDays(today, r.start), end: addDays(today, r.end) })),
    }),
    [today, availableFromOffset, blockedOffsets, bookedOffsets],
  );
  return (
    <BookingProvider key={today} availability={availability} handoverOptions={{ methods: handoverMethods, ownerArea, renterArea: null }}>
      {children}
    </BookingProvider>
  );
}
