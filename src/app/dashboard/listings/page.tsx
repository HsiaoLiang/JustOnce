import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BookingListItem } from "@/components/booking-bits";
import { AcceptDeclineButtons } from "@/components/booking-forms";
import { Button, Container, EmptyState, LinkButton } from "@/components/ui";
import { nextStep } from "@/lib/booking-flow";
import { areaName } from "@/lib/areas";
import { todayInLondon, toISO } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { cn, formatRating, plural } from "@/lib/cn";
import { requireUser } from "@/server/auth";
import { settleOverdueDeposits } from "@/server/deposits";
import { setListingStatus } from "@/server/actions/listings";
import { getOwnerDashboard, toFlow, type BookingRow } from "@/server/queries";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "My listings" };

export default async function ListingsDashboard() {
  const user = await requireUser("/dashboard/listings");
  await settleOverdueDeposits({ ownerId: user.id });
  const [{ bookings, listings, earned, upcoming }, me] = await Promise.all([
    getOwnerDashboard(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { ratingSum: true, ratingCount: true } }),
  ]);
  const today = todayInLondon();
  const withStep = bookings.map((b) => ({ b, step: nextStep(toFlow(b), "OWNER", b.renter.name, today) }));
  const isExpired = (b: BookingRow) => b.status === "REQUESTED" && toISO(b.startDate) < today;

  const requests = withStep.filter((x) => x.b.status === "REQUESTED" && !isExpired(x.b));
  const needsYou = withStep.filter((x) => x.step.needsYou && x.b.status !== "REQUESTED");
  const current = withStep.filter((x) => !x.step.needsYou && (x.b.status === "ACCEPTED" || x.b.status === "ACTIVE"));
  const past = withStep
    .filter((x) => !x.step.needsYou && (["COMPLETED", "DECLINED", "CANCELLED"].includes(x.b.status) || isExpired(x.b)))
    .sort((a, b) => b.b.startDate.getTime() - a.b.startDate.getTime());
  const live = listings.filter((l) => l.status === "ACTIVE").length;

  return (
    <Container className="py-8 md:py-12">
      <AutoRefresh intervalMs={8000} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">My listings</h1>
          <p className="mt-1 text-muted">Your items, the requests coming in and what you&apos;ve earned.</p>
        </div>
        <LinkButton href="/listings/new">
          <Plus className="size-4" strokeWidth={2.6} aria-hidden /> List an item
        </LinkButton>
      </div>

      <dl className="mb-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paid out to you" value={formatGBP(earned)} highlight />
        <Stat label="Due after returns" value={formatGBP(upcoming)} />
        <Stat label="Live listings" value={`${live}`} />
        <Stat
          label={me?.ratingCount ? `Your rating (${plural(me.ratingCount, "review")})` : "Your rating"}
          value={me?.ratingCount ? `★ ${formatRating(me.ratingSum, me.ratingCount)}` : "New"}
        />
      </dl>

      <div className="space-y-12">
        {requests.length > 0 && (
          <section>
            <SectionTitle title="Requests to answer" count={requests.length} accent />
            <ul className="grid gap-3 lg:grid-cols-2">
              {requests.map(({ b, step }) => (
                <BookingListItem key={b.id} booking={b} viewer="OWNER" step={step} actions={<AcceptDeclineButtons bookingId={b.id} compact />} />
              ))}
            </ul>
          </section>
        )}

        {needsYou.length > 0 && (
          <section>
            <SectionTitle title="Needs you" count={needsYou.length} accent />
            <ul className="grid gap-3 lg:grid-cols-2">
              {needsYou.map(({ b, step }) => (
                <BookingListItem key={b.id} booking={b} viewer="OWNER" step={step} />
              ))}
            </ul>
          </section>
        )}

        {current.length > 0 && (
          <section>
            <SectionTitle title="Confirmed and on rent" count={current.length} />
            <ul className="grid gap-3 lg:grid-cols-2">
              {current.map(({ b, step }) => (
                <BookingListItem key={b.id} booking={b} viewer="OWNER" step={step} />
              ))}
            </ul>
          </section>
        )}

        <section>
          <SectionTitle title="Your items" count={listings.length} />
          {listings.length === 0 ? (
            <EmptyState
              icon={<Store className="size-8" />}
              title="Nothing listed yet"
              body="That suit, tent or camera you barely use could be earning its keep. Listing takes two minutes."
              action={<LinkButton href="/listings/new">List your first item</LinkButton>}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <li key={l.id} className="overflow-hidden rounded-2xl border border-line">
                  <Link href={`/items/${l.id}`} className="relative block aspect-[16/10] bg-surface">
                    {l.photos[0] && <Image src={l.photos[0]} alt="" fill sizes="(min-width: 1024px) 400px, 50vw" className={cn("object-cover", l.status === "PAUSED" && "opacity-50 grayscale")} />}
                    <span className={cn("absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-card", l.status === "ACTIVE" ? "bg-paper text-success" : "bg-paper text-muted")}>
                      {l.status === "ACTIVE" ? "● Live" : "Paused"}
                    </span>
                  </Link>
                  <div className="p-4">
                    <Link href={`/items/${l.id}`} className="line-clamp-1 font-semibold hover:underline">
                      {l.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatGBP(l.pricePerDay)}/day · {areaName(l.area)} · {plural(l._count.bookings, "booking")}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <LinkButton href={`/listings/${l.id}/edit`} variant="secondary" size="sm">
                        Edit
                      </LinkButton>
                      <form action={setListingStatus}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="status" value={l.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                        <Button type="submit" variant="ghost" size="sm">
                          {l.status === "ACTIVE" ? "Pause" : "Resume"}
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <SectionTitle title="Past bookings" count={past.length} />
            <ul className="grid gap-3 lg:grid-cols-2">
              {past.slice(0, 12).map(({ b, step }) => (
                <BookingListItem key={b.id} booking={b} viewer="OWNER" step={step} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </Container>
  );
}

function SectionTitle({ title, count, accent }: { title: string; count: number; accent?: boolean }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
      {title}
      <span className={accent ? "rounded-full bg-accent px-2 text-sm text-ink" : "rounded-full bg-surface px-2 text-sm text-muted"}>{count}</span>
    </h2>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4", highlight ? "border-accent-line bg-accent-soft" : "border-line")}>
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}
