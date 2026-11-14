import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, Check, CircleCheck, Clock, MapPin, MessageSquare, PackageCheck, RotateCcw, Star, X } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BookingTicketSummary, StatusChip } from "@/components/booking-bits";
import { AcceptDeclineButtons, CancelBookingButton, CheckForm, ClaimForm, ClaimResponseForm, ReviewForm } from "@/components/booking-forms";
import { Avatar, Card, Container, LinkButton, Rating, Stars, VerifiedBadge } from "@/components/ui";
import { hasCheck, nextStep, otherParty, ownerFlaggedReturn, progressIndex, STEPS } from "@/lib/booking-flow";
import type { PartyId } from "@/lib/booking-rules";
import { areaName } from "@/lib/areas";
import { categoryInfo, conditionLabel, type ConditionId } from "@/lib/catalogue";
import { formatDateTime, formatLongDay, formatMonthYear, formatRange, todayInLondon, toISO } from "@/lib/dates";
import { CLAIM_WINDOW_HOURS, claimReasonLabel, formatGBP } from "@/lib/money";
import { DEMO_MODE } from "@/lib/demo";
import { cn, firstName, plural } from "@/lib/cn";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { settleOverdueDeposits } from "@/server/deposits";
import { releaseHeldDeposit, resolveClaim } from "@/server/actions/deposits";
import { getBookingDetail, getPickupDetails, toFlow, type BookingDetail } from "@/server/queries";
import { AreaMapClient } from "@/components/map/area-map-client";
import { areaCircle, directionsUrl } from "@/lib/geo";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bookings/${id}`);
  await settleOverdueDeposits({ id });
  const b = await getBookingDetail(id);
  if (!b) notFound();
  const viewer: PartyId | null = b.ownerId === user.id ? "OWNER" : b.renterId === user.id ? "RENTER" : null;
  if (!viewer) notFound();

  const other = viewer === "OWNER" ? b.renter : b.owner;
  const flow = toFlow(b);
  const today = todayInLondon();
  const step = nextStep(flow, viewer, other.name, today);
  const progress = progressIndex(flow);
  const closed = b.status === "DECLINED" || b.status === "CANCELLED";
  const overlappingRequests =
    viewer === "OWNER" && b.status === "REQUESTED"
      ? await db.booking.count({
          where: { listingId: b.listingId, id: { not: b.id }, status: "REQUESTED", startDate: { lte: b.endDate }, endDate: { gte: b.startDate } },
        })
      : 0;
  // Exact point and notes are fetched only for accepted bookings, so they never reach a renter earlier.
  const pickup = await getPickupDetails(b);
  const otherCompleted = await db.booking.count({ where: { [viewer === "OWNER" ? "renterId" : "ownerId"]: other.id, status: "COMPLETED" } });

  return (
    <Container className="py-6 md:py-10">
      <AutoRefresh />
      <Link href={viewer === "OWNER" ? "/dashboard/listings" : "/dashboard/rentals"} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {viewer === "OWNER" ? "My listings" : "My rentals"}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={`/items/${b.listing.id}`} className="relative hidden aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-surface sm:block">
            {b.listing.photos[0] && <Image src={b.listing.photos[0]} alt="" fill sizes="96px" className="object-cover" />}
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">
              {viewer === "OWNER" ? `Lending to ${firstName(b.renter.name)}` : `Renting from ${firstName(b.owner.name)}`}
            </p>
            <h1 className="mt-1 text-2xl leading-tight font-semibold sm:text-3xl">
              <Link href={`/items/${b.listing.id}`} className="hover:underline">
                {b.listing.title}
              </Link>
            </h1>
            <p className="mt-1 text-sm text-muted">
              {formatRange(toISO(b.startDate), toISO(b.endDate))} · {categoryInfo(b.listing.category)?.label} · {areaName(b.listing.area)}
            </p>
          </div>
        </div>
        <StatusChip status={b.status} viewer={viewer} startDate={toISO(b.startDate)} />
      </div>

      {!closed && <Progress index={progress} />}

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_auto_1fr]">
        <section aria-label="Next step" className="min-w-0 lg:col-start-1">
          <NextStep b={b} viewer={viewer} step={step} today={today} overlapping={overlappingRequests} otherCompleted={otherCompleted} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-start">
          <BookingTicketSummary booking={b} viewer={viewer} />
          <PersonCard person={other} role={viewer === "OWNER" ? "Renter" : "Owner"} completed={otherCompleted} />
          {pickup && (
            <Card className="p-5">
              <p className="flex items-center gap-2 font-semibold">
                <MapPin className="size-4" aria-hidden /> Pickup in {areaName(b.listing.area)}
              </p>
              <div className="mt-3">
                <AreaMapClient
                  label={pickup.pickupLat !== null ? "Map of the exact pickup point" : `Map of ${areaName(b.listing.area)}`}
                  circles={pickup.pickupLat !== null ? [] : areaCircle(b.listing.area)}
                  pin={pickup.pickupLat !== null && pickup.pickupLng !== null ? { lat: pickup.pickupLat, lng: pickup.pickupLng, label: "Pickup point" } : null}
                  className="h-44 w-full overflow-hidden rounded-xl border border-line bg-surface"
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{pickup.pickupNotes || `${firstName(b.owner.name)} will confirm the exact spot.`}</p>
              {pickup.pickupLat !== null && pickup.pickupLng !== null && (
                <a
                  href={directionsUrl({ lat: pickup.pickupLat, lng: pickup.pickupLng })}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4"
                >
                  Get directions
                </a>
              )}
              <p className="mt-2 text-xs text-muted">Only shown to you both once the booking is confirmed.</p>
            </Card>
          )}
        </aside>

        {b.checks.length > 0 && (
          <section aria-labelledby="photos-heading" className="min-w-0 lg:col-start-1">
            <h2 id="photos-heading" className="text-xl font-semibold">
              Condition photos
            </h2>
            <p className="mt-1 text-sm text-muted">Taken by each of you at handover. They&apos;re the record if anyone has questions about the deposit.</p>
            <div className="mt-4 space-y-6">
              {(["PICKUP", "RETURN"] as const).map((stage) => {
                const checks = b.checks.filter((c) => c.stage === stage);
                if (!checks.length) return null;
                return (
                  <div key={stage}>
                    <p className="mb-3 font-mono text-xs tracking-[0.14em] text-muted uppercase">{stage === "PICKUP" ? "At pickup" : "At return"}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(["OWNER", "RENTER"] as const).map((party) => {
                        const check = checks.find((c) => c.party === party);
                        const person = party === "OWNER" ? b.owner : b.renter;
                        return (
                          <div key={party} className="rounded-2xl border border-line p-4">
                            <p className="text-sm font-semibold">
                              {person.id === user.id ? "You" : firstName(person.name)} <span className="font-normal text-muted">({party === "OWNER" ? "owner" : "renter"})</span>
                            </p>
                            {check ? (
                              <>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  {check.photos.map((src, i) => (
                                    <a key={src + i} href={src} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                                      <Image src={src} alt={`${stage === "PICKUP" ? "Pickup" : "Return"} photo ${i + 1} by ${firstName(person.name)}`} fill sizes="120px" className="object-cover" />
                                    </a>
                                  ))}
                                </div>
                                <p className="mt-3 flex items-center gap-1.5 text-sm">
                                  {check.conditionOk ? <Check className="size-4 text-success" aria-hidden /> : <X className="size-4 text-danger" aria-hidden />}
                                  {check.conditionOk ? (stage === "PICKUP" ? "Matches the listing" : "Same as at pickup") : "Flagged a difference"} · {conditionLabel(check.condition)}
                                </p>
                                {check.notes && <p className="mt-1 text-sm text-muted">“{check.notes}”</p>}
                                <p className="mt-2 text-xs text-muted">{formatDateTime(check.createdAt)}</p>
                              </>
                            ) : (
                              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                                <Clock className="size-4" aria-hidden /> Not confirmed yet
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {b.reviews.length > 0 && (
          <section aria-labelledby="reviews-heading" className="min-w-0 lg:col-start-1">
            <h2 id="reviews-heading" className="text-xl font-semibold">
              Reviews
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {b.reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.author.name} src={r.author.avatarUrl} size={36} />
                    <div>
                      <p className="text-sm font-semibold">{r.author.id === user.id ? "You" : r.author.name}</p>
                      <p className="text-xs text-muted">{r.authorRole === "RENTER" ? "Renter" : "Owner"} · {formatMonthYear(r.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Stars value={r.rating} size={14} />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.comment}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="timeline-heading" className="min-w-0 lg:col-start-1">
          <h2 id="timeline-heading" className="text-xl font-semibold">
            Activity
          </h2>
          <Timeline events={b.events} viewerId={user.id} />
        </section>
      </div>
    </Container>
  );
}

function Progress({ index }: { index: number }) {
  return (
    <ol className="mt-8 grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const done = i <= index;
        const current = i === index + 1;
        return (
          <li key={s.key} className="min-w-0">
            <div className={cn("h-1.5 rounded-full", done ? "bg-accent" : current ? "bg-accent-line" : "bg-surface-2")} />
            <p className={cn("mt-2 truncate text-[0.7rem] font-semibold sm:text-xs", done ? "text-ink" : "text-muted")} aria-current={current ? "step" : undefined}>
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function NextStep({
  b,
  viewer,
  step,
  today,
  overlapping,
  otherCompleted,
}: {
  b: BookingDetail;
  viewer: PartyId;
  step: { label: string; needsYou: boolean };
  today: string;
  overlapping: number;
  otherCompleted: number;
}) {
  const ownerFirst = firstName(b.owner.name);
  const renterFirst = firstName(b.renter.name);
  const otherFirst = viewer === "OWNER" ? renterFirst : ownerFirst;
  const start = toISO(b.startDate);
  const end = toISO(b.endDate);
  const sample = DEMO_MODE ? b.listing.photos[0] : undefined;

  if (b.status === "REQUESTED") {
    const expired = start < today;
    if (viewer === "OWNER") {
      return (
        <Panel tone={expired ? "muted" : "accent"} title={expired ? "This request expired" : `${renterFirst} wants to rent this`} icon={<MessageSquare className="size-5" />}>
          {expired ? (
            <p className="text-ink-2">The pickup date passed before the request was answered, so nothing happened and nobody was charged.</p>
          ) : (
            <>
              <p className="text-ink-2">
                {formatRange(start, end)} · {plural(b.days, "day")} · <strong className="text-ink">{formatGBP(b.subtotal)} to you</strong> when it comes back
              </p>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-paper p-3">
                <Avatar name={b.renter.name} src={b.renter.avatarUrl} size={44} />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    {b.renter.name} <VerifiedBadge verified={!!b.renter.verifiedAt} compact />
                  </p>
                  <p className="text-muted">
                    <Rating sum={b.renter.ratingSum} count={b.renter.ratingCount} newLabel="No reviews yet" className="mr-1" /> · {plural(otherCompleted, "rental")} completed
                  </p>
                </div>
              </div>
              {b.message && <blockquote className="mt-3 rounded-2xl bg-paper p-4 text-[0.95rem] leading-relaxed text-ink-2 italic">“{b.message}”</blockquote>}
              {overlapping > 0 && (
                <p className="mt-3 text-sm font-medium text-accent-ink">
                  {plural(overlapping, "other request")} for overlapping dates will be declined automatically if you accept this one.
                </p>
              )}
              <div className="mt-5">
                <AcceptDeclineButtons bookingId={b.id} />
              </div>
              <p className="mt-3 text-xs text-muted">Accepting takes {renterFirst}&apos;s payment and holds the {formatGBP(b.deposit)} deposit (simulated). The dates are then locked so nobody else can book them.</p>
            </>
          )}
        </Panel>
      );
    }
    return (
      <Panel tone="muted" title={expired ? "This request expired" : `Waiting for ${ownerFirst} to respond`} icon={<Clock className="size-5" />}>
        <p className="text-ink-2">
          {expired
            ? "The pickup date passed before the owner answered. You weren't charged."
            : `You asked for ${formatRange(start, end)}. You won't be charged unless ${ownerFirst} accepts, and you'll see the answer right here.`}
        </p>
        {!expired && (
          <div className="mt-5">
            <CancelBookingButton bookingId={b.id} label="Cancel request" confirmText="Cancel this request? Nothing has been charged." />
          </div>
        )}
      </Panel>
    );
  }

  if (b.status === "ACCEPTED" || b.status === "ACTIVE") {
    const stage = b.status === "ACCEPTED" ? "PICKUP" : "RETURN";
    const mine = hasCheck(flowOf(b), stage, viewer);
    const theirs = hasCheck(flowOf(b), stage, otherParty(viewer));
    const pickup = stage === "PICKUP";
    const when = pickup
      ? start > today
        ? `Pickup is planned for ${formatLongDay(start)}. If you meet earlier, you can confirm early.`
        : start === today
          ? "Pickup is today."
          : `Pickup was planned for ${formatLongDay(start)}.`
      : end > today
        ? `Due back ${formatLongDay(end)}. Returning early is fine.`
        : end === today
          ? "It's due back today."
          : `It was due back ${formatLongDay(end)}.`;
    return (
      <Panel tone={step.needsYou ? "accent" : "muted"} title={pickup ? "Pickup check" : "Return check"} icon={pickup ? <Camera className="size-5" /> : <RotateCcw className="size-5" />}>
        <p className="text-ink-2">
          {when}{" "}
          {pickup
            ? "When you meet, check the item together, take a photo or two and confirm here. The rental starts once you've both confirmed."
            : `When it's handed back, you both confirm its condition with photos. Then the ${formatGBP(b.deposit)} deposit is released.`}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <CheckStatus label="You" done={mine} />
          <CheckStatus label={otherFirst} done={theirs} />
        </ul>
        <div className="mt-6">
          {mine ? (
            <>
              <p className="flex items-center gap-2 rounded-2xl bg-paper p-4 text-sm font-medium">
                <CircleCheck className="size-5 text-success" aria-hidden /> You&apos;ve confirmed. Waiting for {otherFirst}, and this page will update by itself.
              </p>
              {stage === "RETURN" && viewer === "OWNER" && ownerFlaggedReturn(flowOf(b)) && (
                <div className="mt-4">
                  <DepositSection b={b} viewer={viewer} />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-paper p-4 sm:p-5">
              <CheckForm key={`${b.id}-${stage}`} bookingId={b.id} stage={stage} defaultCondition={b.listing.condition as ConditionId} samplePhoto={sample} />
            </div>
          )}
        </div>
        {b.status === "ACCEPTED" && (
          <div className="mt-5 border-t border-line pt-4">
            <CancelBookingButton
              bookingId={b.id}
              label="Cancel booking"
              confirmText={`Cancel this booking? ${viewer === "RENTER" ? "You" : renterFirst} will get a full refund of ${formatGBP(b.total, { alwaysShowPence: true })} and the deposit back.`}
            />
          </div>
        )}
      </Panel>
    );
  }

  if (b.status === "COMPLETED") {
    const reviewed = b.reviews.some((r) => r.authorRole === viewer);
    const pending = b.depositStatus === "HELD" || b.depositStatus === "IN_REVIEW";
    const returned = b.deposit - b.depositKept;
    return (
      <Panel
        tone={pending ? "warning" : "success"}
        title={pending ? "It's back. The deposit is on hold." : "All done. It's back home."}
        icon={pending ? <Clock className="size-5" /> : <PackageCheck className="size-5" />}
      >
        <ul className="space-y-1.5 text-ink-2">
          <li className="flex items-center gap-2">
            {pending ? <Clock className="size-4 text-warning" aria-hidden /> : <Check className="size-4 text-success" aria-hidden />}
            {b.depositStatus === "RELEASED"
              ? `${formatGBP(b.deposit)} deposit released to ${viewer === "RENTER" ? "you" : renterFirst}`
              : b.depositStatus === "PART_RELEASED"
                ? `${formatGBP(returned)} returned to ${viewer === "RENTER" ? "you" : renterFirst} · ${formatGBP(b.depositKept)} kept by ${viewer === "OWNER" ? "you" : ownerFirst}`
                : b.depositStatus === "KEPT"
                  ? `${formatGBP(b.deposit)} deposit kept by ${viewer === "OWNER" ? "you" : ownerFirst}`
                  : `${formatGBP(b.deposit)} deposit held until the problem is sorted`}
          </li>
          <li className="flex items-center gap-2">
            <Check className="size-4 text-success" aria-hidden /> {formatGBP(b.subtotal, { alwaysShowPence: b.subtotal % 100 !== 0 })} paid out to {viewer === "OWNER" ? "you" : ownerFirst}
          </li>
        </ul>
        {(b.claim || pending) && (
          <div className="mt-5">
            <DepositSection b={b} viewer={viewer} />
          </div>
        )}
        <div className="mt-5 rounded-2xl bg-paper p-4 sm:p-5">
          {reviewed ? (
            <p className="flex items-center gap-2 text-sm font-medium">
              <Star className="size-4 fill-accent text-accent" aria-hidden /> Thanks for your review.{" "}
              {b.reviews.length < 2 ? `${otherFirst} hasn't reviewed yet.` : "You've both left reviews."}
            </p>
          ) : (
            <ReviewForm bookingId={b.id} subjectFirstName={otherFirst} asRenter={viewer === "RENTER"} />
          )}
        </div>
      </Panel>
    );
  }

  if (b.status === "DECLINED") {
    const auto = b.declineReason === "These dates were booked by another renter.";
    return (
      <Panel tone="muted" title={auto ? "Those dates were booked by someone else" : "Request declined"} icon={<X className="size-5" />}>
        <p className="text-ink-2">
          {viewer === "RENTER" ? "You haven't been charged." : `${renterFirst} hasn't been charged.`}
          {b.declineReason && !auto && <span className="mt-2 block italic">“{b.declineReason}”</span>}
        </p>
        {viewer === "RENTER" && (
          <LinkButton href={`/search?category=${categoryInfo(b.listing.category)?.slug}`} variant="secondary" className="mt-5">
            Find something similar
          </LinkButton>
        )}
      </Panel>
    );
  }

  const cancelledBy = b.cancelledById === b.renterId ? renterFirst : ownerFirst;
  return (
    <Panel tone="muted" title="Booking cancelled" icon={<X className="size-5" />}>
      <p className="text-ink-2">
        Cancelled by {b.cancelledById && (b.cancelledById === (viewer === "OWNER" ? b.ownerId : b.renterId) ? "you" : cancelledBy)}
        {b.paymentStatus === "REFUNDED" ? `. The ${formatGBP(b.total, { alwaysShowPence: true })} payment was refunded in full.` : ". Nothing was charged."}
      </p>
    </Panel>
  );
}

function flowOf(b: BookingDetail) {
  return toFlow(b);
}

function Panel({ tone, title, icon, children }: { tone: "accent" | "muted" | "success" | "warning"; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-3xl p-5 sm:p-7", tone === "accent" ? "bg-accent-soft" : tone === "success" ? "bg-success-soft" : tone === "warning" ? "bg-warning-soft" : "bg-surface")}>
      <div className="mb-3 flex items-center gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-full bg-paper", tone === "success" ? "text-success" : tone === "accent" ? "text-accent-ink" : tone === "warning" ? "text-warning" : "text-ink-2")}>
          {icon}
        </span>
        <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DepositSection({ b, viewer }: { b: BookingDetail; viewer: PartyId }) {
  const ownerFirst = firstName(b.owner.name);
  const renterFirst = firstName(b.renter.name);
  const ownerReturn = b.checks.find((c) => c.stage === "RETURN" && c.party === "OWNER");
  const deadline = ownerReturn ? new Date(ownerReturn.createdAt.getTime() + CLAIM_WINDOW_HOURS * 3_600_000) : null;
  const claim = b.claim;

  if (!claim) {
    if (b.depositStatus !== "HELD" || !ownerReturn || ownerReturn.conditionOk) return null;
    return (
      <div className="rounded-2xl bg-paper p-4 sm:p-5">
        <p className="font-semibold">{viewer === "OWNER" ? "Claim from the deposit" : `${ownerFirst} reported a problem`}</p>
        {ownerReturn.notes && <p className="mt-1 text-sm text-ink-2 italic">“{ownerReturn.notes}”</p>}
        {viewer === "OWNER" ? (
          <>
            <p className="mt-1 mb-4 text-sm text-muted">
              Claim the cost of the damage or missing parts, up to the {formatGBP(b.deposit)} deposit, by {deadline && formatDateTime(deadline)}. After that the
              deposit goes back to {renterFirst} automatically.
            </p>
            <ClaimForm bookingId={b.id} deposit={b.deposit} defaultNote={ownerReturn.notes ?? ""} />
            {b.status === "COMPLETED" && (
              <form action={releaseHeldDeposit} className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="bookingId" value={b.id} />
                <button type="submit" className="text-sm font-semibold underline underline-offset-4">
                  It&apos;s fine, release the full deposit
                </button>
              </form>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">
            The deposit is held while {ownerFirst} decides whether to claim. If there&apos;s no claim by {deadline && formatDateTime(deadline)}, it comes back to
            you in full automatically.
          </p>
        )}
      </div>
    );
  }

  const amount = formatGBP(claim.amount, { alwaysShowPence: claim.amount % 100 !== 0 });
  return (
    <div className="space-y-4 rounded-2xl bg-paper p-4 sm:p-5">
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Deposit claim · {claimReasonLabel(claim.reason)}</p>
        <p className="mt-1 text-lg font-semibold">
          {viewer === "OWNER" ? "You claimed" : `${ownerFirst} claimed`} {amount} of the {formatGBP(b.deposit)} deposit
        </p>
        <p className="mt-1 text-sm text-ink-2 italic">“{claim.ownerNote}”</p>
      </div>

      <PhotoCompare b={b} />

      {claim.status === "OPEN" &&
        (viewer === "RENTER" && b.status === "COMPLETED" ? (
          <div>
            <p className="mb-3 text-sm text-ink-2">
              If you accept, {ownerFirst} keeps {amount} and the other {formatGBP(b.deposit - claim.amount)} comes back to you. If you think it&apos;s unfair, contest
              it and Just Once will review both sides.
            </p>
            <ClaimResponseForm bookingId={b.id} amount={amount} ownerFirstName={ownerFirst} />
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4" aria-hidden /> Waiting for {viewer === "OWNER" ? renterFirst : "you"} to accept or contest the claim.
          </p>
        ))}

      {(claim.status === "CONTESTED" || (claim.status === "RESOLVED" && claim.renterNote)) && (
        <div className="rounded-xl bg-surface p-3">
          <p className="text-sm font-semibold">{viewer === "RENTER" ? "You contested it" : `${renterFirst} contested it`}</p>
          {claim.renterNote && <p className="mt-1 text-sm text-ink-2 italic">“{claim.renterNote}”</p>}
          {claim.renterPhotos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {claim.renterPhotos.map((src, i) => (
                <a key={src + i} href={src} target="_blank" rel="noreferrer" className="relative size-16 overflow-hidden rounded-lg bg-paper">
                  <Image src={src} alt={`Renter's photo ${i + 1}`} fill sizes="64px" className="object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {claim.status === "CONTESTED" && (
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4" aria-hidden /> Just Once is reviewing the photos from both sides. The disputed {amount} stays held until then.
          </p>
          {DEMO_MODE && (
            <div className="mt-3 rounded-xl border border-dashed border-line-strong p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Resolve claim (demo)</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["full", `Uphold in full (${amount})`],
                    ["half", "Uphold half"],
                    ["none", "Reject the claim"],
                  ] as const
                ).map(([outcome, label]) => (
                  <form key={outcome} action={resolveClaim}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <input type="hidden" name="outcome" value={outcome} />
                    <button type="submit" className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-semibold hover:border-ink">
                      {label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(claim.status === "ACCEPTED" || claim.status === "RESOLVED") && (
        <p className="flex items-center gap-2 text-sm font-medium">
          <CircleCheck className="size-4 text-success" aria-hidden />
          {claim.status === "ACCEPTED" ? "Claim accepted" : "Claim reviewed by Just Once"}: {formatGBP(b.depositKept)} kept, {formatGBP(b.deposit - b.depositKept)} returned.
        </p>
      )}
    </div>
  );
}

/** Pickup and return photos next to each other, so a claim can be judged at a glance. */
function PhotoCompare({ b }: { b: BookingDetail }) {
  const column = (stage: "PICKUP" | "RETURN") =>
    b.checks
      .filter((c) => c.stage === stage)
      .flatMap((c) => c.photos.map((src) => ({ src, who: c.party === "OWNER" ? firstName(b.owner.name) : firstName(b.renter.name) })));
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["PICKUP", "RETURN"] as const).map((stage) => (
        <div key={stage}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{stage === "PICKUP" ? "At pickup" : "At return"}</p>
          <div className="grid grid-cols-2 gap-2">
            {column(stage).map(({ src, who }, i) => (
              <a key={src + i} href={src} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                <Image src={src} alt={`${stage === "PICKUP" ? "Pickup" : "Return"} photo by ${who}`} fill sizes="140px" className="object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 text-[0.65rem] text-white">{who}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckStatus({ label, done }: { label: string; done: boolean }) {
  return (
    <li className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold", done ? "bg-paper text-ink" : "bg-paper/60 text-muted")}>
      {done ? <CircleCheck className="size-4 text-success" aria-hidden /> : <Clock className="size-4" aria-hidden />}
      {label}: {done ? "confirmed" : "waiting"}
    </li>
  );
}

function PersonCard({ person, role, completed }: { person: BookingDetail["owner"]; role: string; completed: number }) {
  return (
    <Link href={`/users/${person.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 hover:border-ink">
      <Avatar name={person.name} src={person.avatarUrl} size={48} />
      <div className="min-w-0 text-sm">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{role}</p>
        <p className="font-semibold">
          {person.name} <VerifiedBadge verified={!!person.verifiedAt} compact />
        </p>
        <p className="text-muted">
          <Rating sum={person.ratingSum} count={person.ratingCount} newLabel="No reviews yet" className="mr-1" /> · {plural(completed, "rental")}
        </p>
      </div>
    </Link>
  );
}

const EVENT_TEXT: Record<string, (actor: string) => string> = {
  requested: (a) => `${a} requested to book`,
  accepted: (a) => `${a} accepted the request`,
  declined: (a) => `${a} declined the request`,
  auto_declined: () => "Declined automatically",
  cancelled: (a) => `${a} cancelled`,
  pickup_check: (a) => `${a} confirmed the pickup`,
  picked_up: () => "Rental started",
  return_check: (a) => `${a} confirmed the return`,
  completed: () => "Rental complete",
  reviewed: (a) => `${a} left a review`,
  deposit_claimed: (a) => `${a} claimed from the deposit`,
  deposit_claim_accepted: (a) => `${a} accepted the claim`,
  deposit_claim_contested: (a) => `${a} contested the claim`,
  deposit_claim_resolved: () => "Claim reviewed",
  deposit_part_released: () => "Deposit partly returned",
  deposit_kept: () => "Deposit kept",
  deposit_released: () => "Deposit returned in full",
  claim_window_closed: () => "No claim made in time",
};

function Timeline({ events, viewerId }: { events: BookingDetail["events"]; viewerId: string }) {
  return (
    <ol className="mt-4 space-y-0">
      {[...events].reverse().map((e, i) => {
        const actor = e.actor ? (e.actor.id === viewerId ? "You" : firstName(e.actor.name)) : "Just Once";
        const milestone = ["accepted", "picked_up", "completed", "deposit_part_released", "deposit_kept", "deposit_released"].includes(e.type);
        return (
          <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
            {i < events.length - 1 && <span className="absolute top-5 left-[7px] h-full w-px bg-line" aria-hidden />}
            <span className={cn("relative mt-1.5 size-[15px] shrink-0 rounded-full border-2", milestone ? "border-accent bg-accent" : "border-line-strong bg-paper")} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{(EVENT_TEXT[e.type] ?? ((a: string) => `${a}: ${e.type}`))(actor)}</p>
              {e.note && <p className="mt-0.5 text-sm text-ink-2">{e.type === "requested" ? `“${e.note}”` : e.note}</p>}
              <p className="mt-0.5 text-xs text-muted">{formatDateTime(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

