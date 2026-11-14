"use client";

import Link from "next/link";
import { createContext, useActionState, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, CalendarDays, RotateCcw } from "lucide-react";
import { Calendar } from "./calendar";
import { Button, FormAlert, LinkButton, Rating, buttonClass } from "./ui";
import { requestBooking, type RequestState } from "@/server/actions/bookings";
import { checkRange, type Availability } from "@/lib/booking-rules";
import { formatDay, formatRange, rentalDays, type ISODate } from "@/lib/dates";
import { DEPOSIT_PROMISE, deliveryFee, formatGBP, handoverLabel, HANDOVER_METHODS, LOCKER_FEE, quote, type HandoverMethodId } from "@/lib/money";
import { savingVsBuying, type BuyLinks, type BuyPrice } from "@/lib/market-price";
import { BuyPriceRunner } from "./buy-price-runner";
import { getLocker, LOCKERS } from "@/lib/lockers";
import { areasByRegion, REGIONS } from "@/lib/areas";
import { cn, plural } from "@/lib/cn";

type BookingCtx = {
  start: ISODate | null;
  end: ISODate | null;
  setRange: (start: ISODate | null, end: ISODate | null) => void;
  availability: Availability;
  rangeError: string | null;
  state: RequestState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  handover: HandoverState;
};

export interface HandoverOptions {
  methods: HandoverMethodId[];
  ownerArea: string;
  /** The renter's own area, used as the default delivery area. */
  renterArea: string | null;
}

interface HandoverState extends HandoverOptions {
  method: HandoverMethodId;
  setMethod: (m: HandoverMethodId) => void;
  deliveryArea: string;
  setDeliveryArea: (a: string) => void;
  address: string;
  setAddress: (a: string) => void;
  lockerId: string;
  setLockerId: (id: string) => void;
  /** Estimate shown while choosing; the server recalculates it when the request is sent. */
  fee: number;
}

const Ctx = createContext<BookingCtx | null>(null);
const useBooking = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBooking must be used inside BookingProvider");
  return ctx;
};

export function BookingProvider({
  availability,
  initialStart,
  initialEnd,
  handoverOptions,
  children,
}: {
  availability: Availability;
  initialStart?: ISODate;
  initialEnd?: ISODate;
  handoverOptions: HandoverOptions;
  children: ReactNode;
}) {
  const [method, setMethod] = useState<HandoverMethodId>(handoverOptions.methods.includes("MEET") ? "MEET" : (handoverOptions.methods[0] ?? "MEET"));
  const [deliveryArea, setDeliveryArea] = useState(handoverOptions.renterArea ?? "");
  const [address, setAddress] = useState("");
  const [lockerId, setLockerId] = useState("");
  const locker = getLocker(lockerId);
  const fee = method === "COURIER" ? deliveryFee(method, handoverOptions.ownerArea, deliveryArea || undefined) : method === "LOCKER" ? deliveryFee(method, handoverOptions.ownerArea, locker?.area) : 0;
  const handover: HandoverState = { ...handoverOptions, method, setMethod, deliveryArea, setDeliveryArea, address, setAddress, lockerId, setLockerId, fee };
  const valid = initialStart && initialEnd && !checkRange(initialStart, initialEnd, availability);
  const [start, setStart] = useState<ISODate | null>(valid ? initialStart! : null);
  const [end, setEnd] = useState<ISODate | null>(valid ? initialEnd! : null);
  const [state, formAction, pending] = useActionState<RequestState, FormData>(requestBooking, undefined);
  const rangeError = start && end ? checkRange(start, end, availability) : null;
  const value = useMemo(
    () => ({
      start,
      end,
      setRange: (s: ISODate | null, e: ISODate | null) => {
        setStart(s);
        setEnd(e);
      },
      availability,
      rangeError,
      state,
      formAction,
      pending,
      handover,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, end, availability, rangeError, state, formAction, pending, method, deliveryArea, address, lockerId, fee],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function DatesSection({ ownerFirstName }: { ownerFirstName: string }) {
  const { start, end, setRange, availability } = useBooking();
  const days = start && end ? rentalDays(start, end) : 0;
  return (
    <section id="dates" aria-labelledby="dates-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="dates-heading" className="text-2xl font-semibold">
            {start && end ? `${plural(days, "day")} with ${ownerFirstName}'s kit` : "Choose your dates"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {start && end
              ? `${formatRange(start, end)}. Tap another date to change it.`
              : "Tap your pickup day, then your return day. Crossed-out days are booked."}
          </p>
        </div>
        {start && (
          <button type="button" onClick={() => setRange(null, null)} className="text-sm font-semibold underline underline-offset-4">
            Clear dates
          </button>
        )}
      </div>
      <Calendar mode="range" months={2} availability={availability} start={start} end={end} onChange={setRange} className="mt-5" />
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-accent" /> Your dates
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted/70 line-through">8</span> Booked or unavailable
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-2">{Number(availability.today.slice(8))}</span> Today
        </span>
      </div>
    </section>
  );
}

export type DepositInfo = {
  /** The listing's own deposit. */
  listed: number;
  reduced: boolean;
  /** Why this renter pays what they pay, if there's something to say. */
  message: string | null;
  /** Show the "verify your ID to halve deposits" nudge. */
  verifyNudge: boolean;
};

type TicketProps = {
  listingId: string;
  pricePerDay: number;
  /** What this viewer would pay. */
  deposit: number;
  depositInfo: DepositInfo;
  /** What the item costs to buy new, when known. Drives the "you save" line. */
  buyPrice?: BuyPrice | null;
  /** The stored buy price is missing or stale: look it up in the background. */
  buyPricePending?: boolean;
  /** Where to buy the item instead, with affiliate IDs when configured. */
  buyLinks?: BuyLinks | null;
  ratingSum: number;
  ratingCount: number;
  ownerFirstName: string;
  signedIn: boolean;
  isOwner: boolean;
};

export function BookingTicket({ listingId, pricePerDay, deposit, depositInfo, buyPrice, buyPricePending, buyLinks, ratingSum, ratingCount, ownerFirstName, signedIn, isOwner }: TicketProps) {
  const { start, end, rangeError, state, formAction, pending, handover } = useBooking();
  const [note, setNote] = useState(false);
  const days = start && end ? rentalDays(start, end) : 0;
  const q = days ? quote(pricePerDay, deposit, days, handover.fee) : null;
  // Rental, service fee and delivery against buying it new. The deposit comes back, so it isn't counted.
  const saving = q && buyPrice ? savingVsBuying(buyPrice.amount, q.total) : null;
  const loginHref = `/login?next=${encodeURIComponent(`/items/${listingId}${start && end ? `?start=${start}&end=${end}` : ""}`)}`;

  return (
    <div className="ticket shadow-card">
      <div className="p-5 pb-6">
        <div className="flex items-baseline justify-between gap-3">
          <p>
            <span className="font-display text-[1.7rem] font-semibold">{formatGBP(pricePerDay)}</span>
            <span className="text-muted"> per day</span>
          </p>
          <Rating sum={ratingSum} count={ratingCount} />
        </div>
        {buyPrice && (
          <p className="mt-1 text-sm text-ink-2" data-testid="buy-price">
            About <span className="font-semibold text-ink">{formatGBP(buyPrice.amount)}</span> to buy new
            {buyPrice.source === "ebay" && buyPrice.url ? (
              <>
                {" "}
                <a
                  href={buyPrice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-ink"
                  title={buyPrice.count ? `Typical price across ${plural(buyPrice.count, "new listing")} on eBay UK` : undefined}
                >
                  on eBay
                </a>
              </>
            ) : (
              <span className="text-muted">
                {" "}
                {buyPrice.source === "ebay"
                  ? "on eBay"
                  : buyPrice.source === "web"
                    ? "(AI estimate from a web search of UK prices)"
                    : buyPrice.source === "ai"
                      ? "(AI estimate)"
                      : "(owner's estimate)"}
              </span>
            )}
          </p>
        )}
        {buyPricePending && <BuyPriceRunner listingId={listingId} quiet={!!buyPrice} />}
        {buyLinks && !isOwner && (
          <p className="mt-1 text-xs text-muted" data-testid="buy-links">
            Rather own it? See it on{" "}
            <a href={buyLinks.amazon} target="_blank" rel="sponsored noopener noreferrer" className="font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
              Amazon
            </a>{" "}
            or{" "}
            <a href={buyLinks.ebay} target="_blank" rel="sponsored noopener noreferrer" className="font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
              eBay
            </a>
            .{buyLinks.affiliate && " As an Amazon Associate and eBay partner, Just Once earns from qualifying purchases."}
          </p>
        )}
        <a href="#dates" className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-line-strong transition-colors hover:border-ink">
          <span className="px-4 py-3">
            <span className="block font-mono text-[0.65rem] tracking-[0.14em] text-muted uppercase">Out</span>
            <span className={cn("block font-display font-semibold", !start && "text-muted")}>{start ? formatDay(start) : "Add date"}</span>
          </span>
          <ArrowRight className="size-4 text-muted" aria-hidden />
          <span className="px-4 py-3 text-right">
            <span className="block font-mono text-[0.65rem] tracking-[0.14em] text-muted uppercase">Back</span>
            <span className={cn("block font-display font-semibold", !end && "text-muted")}>{end ? formatDay(end) : "Add date"}</span>
          </span>
        </a>
      </div>

      <div className="ticket-perf" />

      <div className="p-5">
        {isOwner ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">This is your listing.</p>
            <p className="text-muted">Renters see this panel with your price and deposit. Requests land in My listings.</p>
            <div className="flex gap-2">
              <LinkButton href={`/listings/${listingId}/edit`} variant="dark" size="sm">
                Edit listing
              </LinkButton>
              <LinkButton href="/dashboard/listings" variant="secondary" size="sm">
                My listings
              </LinkButton>
            </div>
          </div>
        ) : (
          <form id="booking-form" action={formAction} className="space-y-4">
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="start" value={start ?? ""} />
            <input type="hidden" name="end" value={end ?? ""} />
            <HandoverChooser />
            {q ? (
              <dl className="space-y-2 text-[0.95rem]">
                <Line label={`${formatGBP(pricePerDay)} × ${plural(q.days, "day")}`} value={formatGBP(q.subtotal, { alwaysShowPence: true })} />
                <Line label="Service fee" value={formatGBP(q.serviceFee, { alwaysShowPence: true })} hint="10% of the rental. Covers payments, deposit protection and support." />
                {handover.method !== "MEET" && (
                  <Line label={`Delivery (${handoverLabel(handover.method).toLowerCase()}, both ways)`} value={formatGBP(q.delivery, { alwaysShowPence: true })} />
                )}
                <div className="border-t border-line pt-2">
                  <Line label="Total" value={formatGBP(q.total, { alwaysShowPence: true })} strong />
                </div>
              </dl>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted">
                <CalendarDays className="size-4" aria-hidden /> Pick dates to see the total.
              </p>
            )}

            {saving && (
              <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-ink" data-testid="buy-saving">
                You save {formatGBP(saving.saving)} compared with buying it new ({saving.percent}% less)
              </p>
            )}

            {signedIn && q && (
              <div>
                {note ? (
                  <textarea
                    name="message"
                    maxLength={500}
                    rows={3}
                    autoFocus
                    placeholder={`Hi ${ownerFirstName}, I need it for…`}
                    className="block w-full rounded-xl border border-line-strong px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  />
                ) : (
                  <button type="button" onClick={() => setNote(true)} className="text-sm font-semibold underline underline-offset-4">
                    Add a note for {ownerFirstName}
                  </button>
                )}
              </div>
            )}

            <FormAlert>{rangeError ?? state?.error}</FormAlert>

            {signedIn ? (
              <Button type="submit" size="lg" className="w-full" disabled={!q || !!rangeError || pending}>
                {pending ? "Sending request…" : "Request to book"}
              </Button>
            ) : (
              <Link href={loginHref} className={buttonClass("primary", "lg", "w-full")}>
                Log in to request
              </Link>
            )}
            <p className="text-center text-xs text-muted">You won&apos;t be charged until {ownerFirstName} accepts.</p>
          </form>
        )}
      </div>

      <div className="ticket-perf" />

      <div className="flex items-start gap-3 rounded-b-[1.2rem] bg-accent-soft p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-paper text-accent-ink">
          <RotateCcw className="size-4" strokeWidth={2.4} aria-hidden />
        </span>
        <div>
          <p className="font-semibold">
            {depositInfo.reduced ? (
              <>
                Your deposit: {formatGBP(deposit)} <span className="font-normal text-muted line-through">{formatGBP(depositInfo.listed)}</span>
              </>
            ) : (
              `${formatGBP(deposit)} refundable deposit`
            )}
          </p>
          {depositInfo.message && <p className="mt-0.5 text-sm font-medium text-ink">{depositInfo.message}</p>}
          <p className="mt-0.5 text-sm text-ink-2">{DEPOSIT_PROMISE}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {depositInfo.verifyNudge && (
              <Link href="/account" className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
                Verify your ID to halve deposits
              </Link>
            )}
            <Link href="/policies#deposits" className="font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
              How deposits work
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, strong, hint }: { label: string; value: string; strong?: boolean; hint?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "font-semibold")}>
      <dt className={strong ? "" : "text-ink-2"} title={hint}>
        {label}
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Sticky bar on phones so the price and the next action are always in reach. */
export function MobileBookingBar({ pricePerDay, deposit, listingId, signedIn, isOwner }: { pricePerDay: number; deposit: number; listingId: string; signedIn: boolean; isOwner: boolean }) {
  const { start, end, rangeError, pending, handover } = useBooking();
  if (isOwner) return null;
  const days = start && end ? rentalDays(start, end) : 0;
  const q = days ? quote(pricePerDay, deposit, days, handover.fee) : null;
  const loginHref = `/login?next=${encodeURIComponent(`/items/${listingId}${start && end ? `?start=${start}&end=${end}` : ""}`)}`;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="min-w-0 text-sm">
          {q && start && end ? (
            <>
              <p className="font-semibold">{formatGBP(q.total, { alwaysShowPence: true })} total</p>
              <p className="truncate text-muted underline underline-offset-2">
                {formatRange(start, end)} · {plural(q.days, "day")}
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-semibold">{formatGBP(pricePerDay)}</span> per day
              </p>
              <p className="text-muted">{formatGBP(deposit)} refundable deposit</p>
            </>
          )}
        </div>
        {!q ? (
          <a href="#dates" className={buttonClass("dark", "md")}>
            Choose dates
          </a>
        ) : signedIn ? (
          <button type="submit" form="booking-form" disabled={!!rangeError || pending} className={buttonClass("primary", "md")}>
            {pending ? "Sending…" : "Request to book"}
          </button>
        ) : (
          <Link href={loginHref} className={buttonClass("primary", "md")}>
            Log in to book
          </Link>
        )}
      </div>
    </div>
  );
}

/** How the item changes hands. Only methods the owner offers are shown. */
function HandoverChooser() {
  const { handover } = useBooking();
  const { methods, method } = handover;
  const options = HANDOVER_METHODS.filter((m) => methods.includes(m.id));
  return (
    <fieldset className="space-y-3">
      <input type="hidden" name="handoverMethod" value={method} />
      {options.length > 1 ? (
        <>
          <legend className="mb-2 text-sm font-semibold">How do you want it?</legend>
          <div className="grid gap-2" role="radiogroup">
            {options.map((m) => {
              const each = m.id === "MEET" ? 0 : m.id === "LOCKER" ? LOCKER_FEE : null;
              return (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                    method === m.id ? "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <input type="radio" name="handoverPick" checked={method === m.id} onChange={() => handover.setMethod(m.id)} className="size-4 accent-[var(--color-ink)]" />
                    <span>
                      <span className="block font-semibold">{m.label}</span>
                      <span className="block text-xs text-muted">{m.hint}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-ink-2">{each === 0 ? "Free" : each ? `${formatGBP(each)} each way` : "£6–£9 each way"}</span>
                </label>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">Handover: {HANDOVER_METHODS.find((m) => m.id === method)?.label.toLowerCase()}.</p>
      )}
      {method === "COURIER" && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="delivery-area">
            Delivery area
          </label>
          <select
            id="delivery-area"
            name="deliveryArea"
            value={handover.deliveryArea}
            onChange={(e) => handover.setDeliveryArea(e.target.value)}
            className="block h-10 w-full rounded-xl border border-line-strong bg-paper px-3 text-sm focus:border-ink focus:outline-none"
          >
            <option value="">Choose an area</option>
            {areasByRegion().map(({ region, areas }) => (
              <optgroup key={region.id} label={region.label}>
                {areas.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <label className="block text-sm font-semibold" htmlFor="delivery-address">
            Address
          </label>
          <input
            id="delivery-address"
            name="deliveryAddress"
            value={handover.address}
            onChange={(e) => handover.setAddress(e.target.value)}
            autoComplete="street-address"
            placeholder="Flat, street and postcode"
            className="block h-10 w-full rounded-xl border border-line-strong bg-paper px-3 text-sm focus:border-ink focus:outline-none"
          />
          <p className="text-xs text-muted">Only shared with the owner once they accept. £6 each way within the same part of London, £9 across.</p>
        </div>
      )}
      {method === "LOCKER" && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="locker">
            Parcel locker
          </label>
          <select
            id="locker"
            name="lockerId"
            value={handover.lockerId}
            onChange={(e) => handover.setLockerId(e.target.value)}
            className="block h-10 w-full rounded-xl border border-line-strong bg-paper px-3 text-sm focus:border-ink focus:outline-none"
          >
            <option value="">Choose a locker</option>
            {REGIONS.map((r) => (
              <optgroup key={r.id} label={r.label}>
                {LOCKERS.filter((l) => l.region === r.id).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </fieldset>
  );
}
