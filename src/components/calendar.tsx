"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, eachDay, formatLongDay, formatMonth, startOfMonth, weekdayIndex, type ISODate } from "@/lib/dates";
import { dayState, type Availability, type DayState } from "@/lib/booking-rules";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type RangeProps = {
  mode: "range";
  availability: Availability;
  start: ISODate | null;
  end: ISODate | null;
  onChange: (start: ISODate | null, end: ISODate | null) => void;
};

type ToggleProps = {
  mode: "toggle";
  /** Days the owner can toggle (their availability window). */
  window: { from: ISODate; to: ISODate; today: ISODate };
  selected: Set<ISODate>;
  onToggle: (day: ISODate) => void;
  /** Days already booked by renters; shown but not toggleable. */
  locked?: Set<ISODate>;
};

export function Calendar(props: (RangeProps | ToggleProps) & { months?: 1 | 2; className?: string }) {
  const today = props.mode === "range" ? props.availability.today : props.window.today;
  const firstSelectable = props.mode === "range" ? props.start ?? today : props.window.from > today ? props.window.from : today;
  const lastMonth = startOfMonth(props.mode === "range" ? props.availability.availableTo : props.window.to);
  const firstMonth = startOfMonth(today);
  const [month, setMonth] = useState(() => {
    const m = startOfMonth(firstSelectable);
    return m < firstMonth ? firstMonth : m > lastMonth ? lastMonth : m;
  });
  const [hover, setHover] = useState<ISODate | null>(null);
  const months = props.months ?? 1;

  const blocked = useMemo(() => (props.mode === "range" ? new Set(props.availability.blockedDates) : new Set<ISODate>()), [props]);

  const stateOf = (day: ISODate): DayState => {
    if (props.mode === "range") return dayState(day, props.availability, blocked);
    if (day < props.window.today) return "past";
    if (day < props.window.from || day > props.window.to) return "outside";
    if (props.locked?.has(day)) return "booked";
    return "free";
  };

  // Range preview while hovering the second date.
  const previewEnd = props.mode === "range" && props.start && props.end === props.start && hover && hover > props.start ? hover : null;
  const rangeFree = (a: ISODate, b: ISODate) => eachDay(a, b).every((d) => stateOf(d) === "free");

  const clickDay = (day: ISODate) => {
    if (props.mode === "toggle") {
      if (stateOf(day) === "free") props.onToggle(day);
      return;
    }
    if (stateOf(day) !== "free") return;
    const { start, end, onChange } = props;
    if (start && end === start && day > start && rangeFree(start, day)) onChange(start, day);
    else onChange(day, day);
  };

  const canPrev = month > firstMonth;
  const canNext = month < lastMonth;

  return (
    <div className={props.className}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={!canPrev}
          className="inline-flex size-9 items-center justify-center rounded-full border border-line hover:border-ink disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className={cn("grid flex-1 text-center", months === 2 && "md:grid-cols-2")}>
          {Array.from({ length: months }, (_, i) => (
            <p key={i} className={cn("font-display font-semibold", i > 0 && "hidden md:block")} aria-live="polite">
              {formatMonth(addMonths(month, i))}
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={!canNext}
          className="inline-flex size-9 items-center justify-center rounded-full border border-line hover:border-ink disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className={cn("mt-4 grid gap-8", months === 2 && "md:grid-cols-2")} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: months }, (_, i) => {
          const m = addMonths(month, i);
          const days = monthDays(m);
          return (
            <div key={m} className={cn(i > 0 && "hidden md:block")}>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="pb-2">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label={formatMonth(m)}>
                {Array.from({ length: weekdayIndex(m) }, (_, k) => (
                  <span key={`pad-${k}`} />
                ))}
                {days.map((day) => {
                  const state = stateOf(day);
                  const selectable = state === "free";
                  let isStart = false;
                  let isEnd = false;
                  let inBand = false;
                  let toggled = false;
                  const end = props.mode === "range" ? (previewEnd ?? props.end) : null;
                  const multi = props.mode === "range" && !!props.start && !!end && end > props.start;
                  if (props.mode === "range") {
                    isStart = day === props.start;
                    isEnd = day === end;
                    inBand = multi && day >= props.start! && day <= end!;
                  } else {
                    toggled = props.selected.has(day);
                  }
                  const isPreview = !!previewEnd && inBand;
                  // Solid accent for chosen dates; the hovered end of a preview gets an outline instead.
                  const endpoint = isStart || (isEnd && !isPreview);
                  const label = `${formatLongDay(day)}${state === "booked" ? ", booked" : state === "blocked" ? ", unavailable" : !selectable ? ", not available" : toggled ? ", marked unavailable" : endpoint ? ", selected" : ""}`;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "relative flex h-11 items-center justify-center",
                        inBand && (isPreview ? "bg-surface" : "bg-accent-soft"),
                        inBand && isStart && "rounded-l-full",
                        inBand && isEnd && "rounded-r-full",
                      )}
                    >
                      <button
                        type="button"
                        disabled={!selectable && !(props.mode === "toggle" && toggled)}
                        onClick={() => clickDay(day)}
                        onMouseEnter={() => setHover(day)}
                        aria-label={label}
                        aria-pressed={props.mode === "toggle" ? toggled : endpoint}
                        className={cn(
                          "relative flex size-10 items-center justify-center rounded-full text-sm transition-colors",
                          selectable && !endpoint && !toggled && "font-medium hover:ring-1 hover:ring-ink",
                          !selectable && "cursor-default text-muted/45",
                          (state === "booked" || state === "blocked") && "text-muted/60 line-through decoration-muted/60",
                          endpoint && "bg-accent font-semibold text-ink",
                          isPreview && isEnd && !isStart && "font-semibold ring-1 ring-ink",
                          toggled && "bg-ink font-semibold text-white line-through decoration-white/70",
                          day === today && !endpoint && !toggled && "font-bold underline decoration-accent decoration-2 underline-offset-4",
                        )}
                      >
                        {Number(day.slice(8))}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function monthDays(month: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let d = month; d.slice(0, 7) === month.slice(0, 7); d = addDays(d, 1)) days.push(d);
  return days;
}
