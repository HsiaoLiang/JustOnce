import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CircleDot } from "lucide-react";
import { STATUS_STAMP, statusChip, type DepositStatusId } from "@/lib/booking-flow";
import type { BookingStatusId, PartyId } from "@/lib/booking-rules";
import { formatDay, todayInLondon, toISO } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { cn, firstName, plural } from "@/lib/cn";
import type { BookingRow as BookingRowData } from "@/server/queries";
import { Chip } from "./ui";

export function StatusChip({ status, viewer, startDate }: { status: BookingStatusId; viewer: PartyId; startDate?: string }) {
  const chip = statusChip(status, viewer, status === "REQUESTED" && !!startDate && startDate < todayInLondon());
  return <Chip tone={chip.tone}>{chip.label}</Chip>;
}

export function OutBack({ start, end, className }: { start: string; end: string; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[0.72rem] tracking-[0.06em] text-ink-2 uppercase", className)}>
      <span className="whitespace-nowrap">
        <span className="text-muted">Out</span> {formatDay(start)}
      </span>
      <ArrowRight className="size-3 text-muted" aria-hidden />
      <span className="whitespace-nowrap">
        <span className="text-muted">Back</span> {formatDay(end)}
      </span>
    </span>
  );
}

/** One booking in a dashboard list. */
export function BookingListItem({
  booking,
  viewer,
  step,
  actions,
}: {
  booking: BookingRowData;
  viewer: PartyId;
  step: { label: string; needsYou: boolean };
  actions?: React.ReactNode;
}) {
  const other = viewer === "OWNER" ? booking.renter : booking.owner;
  const start = toISO(booking.startDate);
  const end = toISO(booking.endDate);
  return (
    <li className="relative rounded-2xl border border-line bg-paper transition-colors hover:border-line-strong">
      <div className="flex gap-4 p-3 sm:p-4">
        <Link href={`/bookings/${booking.id}`} className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-surface sm:w-32" aria-hidden tabIndex={-1}>
          {booking.listing.photos[0] && <Image src={booking.listing.photos[0]} alt="" fill sizes="128px" className="object-cover" />}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <Link href={`/bookings/${booking.id}`} className="line-clamp-1 font-semibold after:absolute after:inset-0 hover:underline">
              {booking.listing.title}
            </Link>
            <StatusChip status={booking.status} viewer={viewer} startDate={start} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {viewer === "OWNER" ? "Rented by" : "From"} {other.name} · {plural(booking.days, "day")} ·{" "}
            {viewer === "OWNER" ? `${formatGBP(booking.subtotal)} to you` : `${formatGBP(booking.total, { alwaysShowPence: booking.total % 100 !== 0 })} total`}
          </p>
          <OutBack start={start} end={end} className="mt-2" />
          <p className={cn("mt-2 flex items-center gap-1.5 text-sm", step.needsYou ? "font-semibold text-ink" : "text-muted")}>
            {step.needsYou ? <CircleDot className="size-4 text-accent" strokeWidth={3} aria-hidden /> : <Check className="size-4" aria-hidden />}
            {step.label}
          </p>
        </div>
      </div>
      {actions && <div className="relative z-10 flex flex-wrap gap-2 border-t border-line px-3 py-3 sm:px-4">{actions}</div>}
    </li>
  );
}

/** The booking's "return ticket": dates, money and the deposit stub, stamped with its status. */
export function BookingTicketSummary({
  booking,
  viewer,
}: {
  booking: {
    id: string;
    status: BookingStatusId;
    startDate: Date;
    endDate: Date;
    days: number;
    pricePerDay: number;
    subtotal: number;
    serviceFee: number;
    total: number;
    deposit: number;
    depositKept: number;
    depositReduced: boolean;
    paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
    depositStatus: DepositStatusId;
    payoutStatus: "NONE" | "SCHEDULED" | "PAID";
    owner: { name: string };
    renter: { name: string };
    claim?: { amount: number; status: string } | null;
  };
  viewer: PartyId;
}) {
  const ownerFirst = firstName(booking.owner.name);
  const renterFirst = firstName(booking.renter.name);
  const closed = booking.status === "DECLINED" || booking.status === "CANCELLED";
  const pence = (n: number) => formatGBP(n, { alwaysShowPence: true });

  const payment =
    booking.paymentStatus === "PAID"
      ? { label: "Paid", tone: "success" as const }
      : booking.paymentStatus === "REFUNDED"
        ? { label: "Refunded", tone: "neutral" as const }
        : { label: closed ? "Not charged" : "Due on acceptance", tone: "muted" as const };
  const payout =
    booking.payoutStatus === "PAID"
      ? { label: "Paid out", tone: "success" as const }
      : booking.payoutStatus === "SCHEDULED"
        ? { label: "After return", tone: "neutral" as const }
        : { label: closed ? "None" : "After return", tone: "muted" as const };

  const you = viewer === "RENTER" ? "you" : renterFirst;
  const returned = booking.deposit - booking.depositKept;
  const deposit: { line: string; tone: "success" | "warning" | "accent" | "muted"; headline?: string } = (() => {
    switch (booking.depositStatus) {
      case "RELEASED":
        return { tone: "success", line: closed ? `Released back to ${you}.` : `Returned in full to ${you} after the return check.` };
      case "PART_RELEASED":
        return { tone: "warning", headline: `${formatGBP(returned)} returned · ${formatGBP(booking.depositKept)} kept`, line: `${formatGBP(booking.depositKept)} went to ${viewer === "OWNER" ? "you" : ownerFirst} after a claim.` };
      case "KEPT":
        return { tone: "warning", headline: `${formatGBP(booking.deposit)} kept`, line: `The deposit went to ${viewer === "OWNER" ? "you" : ownerFirst} after a claim.` };
      case "IN_REVIEW":
        return {
          tone: "warning",
          headline: booking.claim ? `${formatGBP(booking.claim.amount)} of ${formatGBP(booking.deposit)} under review` : "Under review",
          line: booking.claim?.status === "CONTESTED" ? "Contested: Just Once is reviewing both sides." : `Waiting for ${viewer === "RENTER" ? "you" : renterFirst} to accept or contest the claim.`,
        };
      case "HELD":
        if (booking.status === "COMPLETED") return { tone: "warning", headline: "Held", line: `${viewer === "OWNER" ? "You" : ownerFirst} reported a problem at the return.` };
        return { tone: "accent", line: "Held safely until you both confirm the return." };
      default:
        return {
          tone: "muted",
          line: closed ? "Never taken." : `Held when ${viewer === "OWNER" ? "you accept" : `${ownerFirst} accepts`}, returned in full when the item comes back complete and undamaged.`,
        };
    }
  })();

  return (
    <div className="ticket relative shadow-card">
      <div className="p-5">
        <p className="font-mono text-[0.68rem] tracking-[0.14em] text-muted uppercase">Booking JO-{booking.id.slice(-6).toUpperCase()}</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <p className="font-mono text-[0.65rem] tracking-[0.14em] text-muted uppercase">Out</p>
            <p className="font-display text-lg leading-tight font-semibold">{formatDay(toISO(booking.startDate))}</p>
          </div>
          <ArrowRight className="mb-1 size-4 text-muted" aria-hidden />
          <div className="text-right">
            <p className="font-mono text-[0.65rem] tracking-[0.14em] text-muted uppercase">Back</p>
            <p className="font-display text-lg leading-tight font-semibold">{formatDay(toISO(booking.endDate))}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">{plural(booking.days, "day")}</p>
        <span key={booking.status} className="stamp absolute top-4 right-4 animate-stamp text-[0.72rem]">
          {STATUS_STAMP[booking.status]}
        </span>
      </div>

      <div className="ticket-perf" />

      <dl className="space-y-2 p-5 text-[0.95rem]">
        <Row label={`${formatGBP(booking.pricePerDay)} × ${plural(booking.days, "day")}`} value={pence(booking.subtotal)} />
        {viewer === "RENTER" ? (
          <>
            <Row label="Service fee" value={pence(booking.serviceFee)} />
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2 font-semibold">
              <dt className="flex items-center gap-2">
                Total <Chip tone={payment.tone}>{payment.label}</Chip>
              </dt>
              <dd className="tabular-nums">{pence(booking.total)}</dd>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-2 font-semibold">
            <dt className="flex items-center gap-2">
              Your payout <Chip tone={payout.tone}>{payout.label}</Chip>
            </dt>
            <dd className="tabular-nums">{pence(booking.subtotal)}</dd>
          </div>
        )}
      </dl>

      <div className="ticket-perf" />

      <div
        className={cn(
          "rounded-b-[1.2rem] p-5",
          deposit.tone === "success" ? "bg-success-soft" : deposit.tone === "warning" ? "bg-warning-soft" : deposit.tone === "accent" ? "bg-accent-soft" : "bg-surface",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{booking.depositReduced ? "Deposit (half, trusted renter)" : "Deposit"}</p>
          <p className="font-semibold tabular-nums">{formatGBP(booking.deposit)}</p>
        </div>
        {deposit.headline && <p className={cn("mt-1 font-semibold", deposit.tone === "warning" && "text-warning")}>{deposit.headline}</p>}
        <p className="mt-1 text-sm text-ink-2">{deposit.line}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-2">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
