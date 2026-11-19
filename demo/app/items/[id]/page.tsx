import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ChevronRight, MapPin, RotateCcw, ShieldCheck } from "lucide-react";
import { PhotoGallery } from "@/components/photo-gallery";
import { BookingTicket, DatesSection, MobileBookingBar } from "@/components/booking-widget";
import { ListingGrid } from "@/components/listing-card";
import { Avatar, Container, LinkButton, Rating, Stars, VerifiedBadge } from "@/components/ui";
import { AreaMapClient } from "@/components/map/area-map-client";
import { CommunityBadge } from "@/components/community-badge";
import { areaName, getArea, REGIONS } from "@/lib/areas";
import { categoryInfo, CONDITIONS } from "@/lib/catalogue";
import { formatMonthYear } from "@/lib/dates";
import { DEPOSIT_PROMISE, formatGBP, handoverLabel } from "@/lib/money";
import { buyLinks, buyPriceFor } from "@/lib/market-price";
import { areaCircle } from "@/lib/geo";
import { firstName, plural, shortName } from "@/lib/cn";
import { DemoBookingProvider } from "@demo/components/demo-booking";
import { ALL_LISTINGS, BUILD_TODAY, getListing, isVisible, ownerStats, reviewsFor, toCard, USERS_BY_ID, VISIBLE_LISTINGS } from "@demo/lib/data";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_LISTINGS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = getListing((await params).id);
  if (!l) return {};
  // Members-only items never reveal their title or photos, not even in link previews.
  if (!isVisible(l)) return { title: `${l.community?.shortName ?? "Community"} members-only item`, robots: { index: false } };
  return { title: l.title, description: `${formatGBP(l.pricePerDay)} a day in ${areaName(l.area)}. ${l.description.slice(0, 140)}` };
}

export default async function ItemPage({ params }: Props) {
  const listing = getListing((await params).id);
  if (!listing) notFound();
  if (!isVisible(listing)) {
    const c = listing.community;
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md text-center">
          <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Members only</p>
          <h1 className="mt-2 text-2xl font-semibold">This item is for verified {c?.shortName ?? "community"} members</h1>
          <p className="mt-2 text-muted">In the full app, members verify with their {c?.shortName ?? "community"} email or ID card to see it and book it.</p>
          {c && (
            <LinkButton href={`/communities/${c.slug}`} className="mt-6">
              See the {c.shortName} community
            </LinkButton>
          )}
        </div>
      </Container>
    );
  }
  const owner = USERS_BY_ID.get(listing.owner.id)!;
  const stats = ownerStats(owner.id);
  const reviews = reviewsFor(listing.id);
  const category = categoryInfo(listing.category);
  const area = getArea(listing.area);
  const region = REGIONS.find((r) => r.id === area?.region);
  const condition = CONDITIONS.find((c) => c.id === listing.condition);
  const more = VISIBLE_LISTINGS.filter((l) => l.owner.id === owner.id && l.id !== listing.id).slice(0, 4).map(toCard);
  const ownerFirst = firstName(owner.name);
  const depositInfo = {
    listed: listing.deposit,
    reduced: false,
    message: listing.fullDepositOnly ? null : "Verified renters with good reviews pay half.",
    verifyNudge: false,
  };

  return (
    <Container className="pt-4 pb-12 md:pt-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted">
        <Link href={`/search?category=${category?.slug}`} className="hover:text-ink hover:underline">
          {category?.label}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/search?category=${category?.slug}&area=${listing.area}`} className="hover:text-ink hover:underline">
          {areaName(listing.area)}
        </Link>
      </nav>
      {listing.community && (
        <div className="mt-3">
          <CommunityBadge slug={listing.community.slug} shortName={listing.community.shortName} membersOnly={listing.communityOnly} />
        </div>
      )}
      <h1 className="mt-2 text-[1.9rem] leading-tight font-semibold sm:text-4xl">{listing.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Rating sum={listing.ratingSum} count={listing.ratingCount} showCount={false} newLabel="New listing" />
        {listing.ratingCount > 0 && (
          <a href="#reviews" className="font-medium underline underline-offset-4">
            {plural(listing.ratingCount, "review")}
          </a>
        )}
        <span className="text-muted" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-1 text-ink-2">
          <MapPin className="size-4" aria-hidden />
          {areaName(listing.area)}, {region?.label}
        </span>
      </div>

      <DemoBookingProvider
        buildToday={BUILD_TODAY}
        availableFromOffset={listing.availableFromOffset}
        blockedOffsets={listing.blockedOffsets}
        bookedOffsets={listing.bookedOffsets}
        handoverMethods={listing.handoverMethods}
        ownerArea={listing.area}
      >
        <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_auto_auto_auto_auto_1fr] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 lg:col-start-1">
            <PhotoGallery photos={listing.photos} title={listing.title} />
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line p-4">
              <Avatar name={owner.name} src={owner.avatarUrl} size={52} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Lent by {owner.name} <VerifiedBadge verified={!!owner.verifiedAt} compact />
                </p>
                <p className="text-sm text-muted">
                  <Rating sum={owner.ratingSum} count={owner.ratingCount} className="mr-1.5" newLabel="No reviews yet" />· {plural(stats.completed, "rental")} completed · Joined{" "}
                  {formatMonthYear(owner.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <section aria-labelledby="about" className="min-w-0 lg:col-start-1">
            <h2 id="about" className="text-2xl font-semibold">
              About this item
            </h2>
            <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed whitespace-pre-line text-ink-2">{listing.description}</p>
            <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <Detail label="Condition" value={condition?.label ?? listing.condition} hint={condition?.hint} />
              {listing.brand && <Detail label="Brand" value={listing.brand} />}
              {listing.size && <Detail label="Size" value={listing.size} />}
              <Detail label="Category" value={category?.label ?? ""} />
              <Detail label="Pickup area" value={`${areaName(listing.area)} (${area?.postcode})`} />
              <Detail label="Handover" value={listing.handoverMethods.map((m) => handoverLabel(m)).join(" · ")} />
              <Detail label="Deposit" value={`${formatGBP(listing.deposit)}, refundable`} hint={listing.fullDepositOnly ? "Full deposit for everyone" : "Half for trusted renters"} />
            </dl>
          </section>

          <section aria-labelledby="where" className="min-w-0 lg:col-start-1">
            <h2 id="where" className="text-2xl font-semibold">
              Where it&apos;s collected
            </h2>
            <p className="mt-1 text-ink-2">
              {areaName(listing.area)}, {region?.label} ({area?.postcode})
            </p>
            <AreaMapClient
              circles={areaCircle(listing.area)}
              label={`Map showing the ${areaName(listing.area)} area`}
              className="mt-4 h-60 w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface"
            />
            <p className="mt-2 text-sm text-muted">Exact pickup point shared once the owner accepts.</p>
          </section>

          <div className="min-w-0 lg:col-start-1">
            <DatesSection ownerFirstName={ownerFirst} />
          </div>

          <section aria-labelledby="good-to-know" className="min-w-0 lg:col-start-1">
            <h2 id="good-to-know" className="text-2xl font-semibold">
              How this rental works
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              <Assurance icon={<ShieldCheck className="size-5" />} title="Ask first, pay later">
                {ownerFirst} accepts or declines your request. You&apos;re only charged once it&apos;s accepted.
              </Assurance>
              <Assurance icon={<Camera className="size-5" />} title="Photo check at pickup">
                You both photograph the item at handover, so its condition is on record.
              </Assurance>
              <Assurance icon={<RotateCcw className="size-5" />} title="Deposit back on return">
                {DEPOSIT_PROMISE}
              </Assurance>
            </ul>
          </section>

          <section id="reviews" aria-labelledby="reviews-heading" className="min-w-0 scroll-mt-24 lg:col-start-1">
            <h2 id="reviews-heading" className="flex items-center gap-3 text-2xl font-semibold">
              {listing.ratingCount > 0 ? (
                <>
                  <Rating sum={listing.ratingSum} count={listing.ratingCount} showCount={false} className="text-2xl [&_svg]:size-5" />
                  <span>· {plural(listing.ratingCount, "review")}</span>
                </>
              ) : (
                "Reviews"
              )}
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-muted">No reviews yet. Be the first to rent it.</p>
            ) : (
              <ul className="mt-5 grid gap-x-10 gap-y-7 md:grid-cols-2">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.author.name} src={r.author.avatarUrl} size={40} />
                      <div>
                        <p className="font-semibold">{shortName(r.author.name)}</p>
                        <p className="text-xs text-muted">{formatMonthYear(r.createdAt)}</p>
                      </div>
                    </div>
                    <Stars value={r.rating} size={13} />
                    <p className="mt-1.5 leading-relaxed text-ink-2">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="owner-heading" className="min-w-0 lg:col-start-1">
            <h2 id="owner-heading" className="text-2xl font-semibold">
              Meet {ownerFirst}
            </h2>
            <div className="mt-4 flex flex-col gap-5 rounded-3xl bg-surface p-6 sm:flex-row sm:items-start">
              <Avatar name={owner.name} src={owner.avatarUrl} size={72} />
              <div className="flex-1">
                <p className="font-display text-xl font-semibold">{owner.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <VerifiedBadge verified={!!owner.verifiedAt} />
                  <Rating sum={owner.ratingSum} count={owner.ratingCount} />
                  <span className="text-muted">{plural(stats.listings, "item")} listed</span>
                </div>
                <p className="mt-3 leading-relaxed text-ink-2">{owner.bio}</p>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:self-start" aria-label="Booking">
            <BookingTicket
              listingId={listing.id}
              pricePerDay={listing.pricePerDay}
              deposit={listing.deposit}
              depositInfo={depositInfo}
              buyPrice={buyPriceFor(listing)}
              buyPricePending={false}
              buyLinks={buyLinks(listing)}
              ratingSum={listing.ratingSum}
              ratingCount={listing.ratingCount}
              ownerFirstName={ownerFirst}
              signedIn
              isOwner={false}
            />
          </aside>
        </div>
        <MobileBookingBar pricePerDay={listing.pricePerDay} deposit={listing.deposit} listingId={listing.id} signedIn isOwner={false} />
      </DemoBookingProvider>

      {more.length > 0 && (
        <section className="mt-16 border-t border-line pt-12">
          <h2 className="mb-6 text-2xl font-semibold">More from {ownerFirst}</h2>
          <ListingGrid listings={more} />
        </section>
      )}
    </Container>
  );
}

function Detail({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

function Assurance({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-line p-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink">{icon}</span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  );
}
