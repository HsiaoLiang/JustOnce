import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ChevronRight, MapPin, RotateCcw, ShieldCheck } from "lucide-react";
import { PhotoGallery } from "@/components/photo-gallery";
import { BookingProvider, BookingTicket, DatesSection, MobileBookingBar } from "@/components/booking-widget";
import { ListingGrid } from "@/components/listing-card";
import { Avatar, Container, LinkButton, Rating, Stars, VerifiedBadge } from "@/components/ui";
import { areaName, getArea, REGIONS } from "@/lib/areas";
import { categoryInfo, CONDITIONS } from "@/lib/catalogue";
import { formatMonthYear, isISODate, toISO } from "@/lib/dates";
import { DEPOSIT_PROMISE, depositFor, formatGBP, handoverLabel } from "@/lib/money";
import { firstName, plural, shortName } from "@/lib/cn";
import { getCurrentUser } from "@/server/auth";
import { getListingDetail, getMoreFromOwner, getRenterTrust } from "@/server/queries";
import { buyLinks, buyPriceFor } from "@/lib/market-price";
import { buyPriceLookupDue } from "@/server/market-price";
import { AreaMapClient } from "@/components/map/area-map-client";
import { areaCircle } from "@/lib/geo";
import { CommunityBadge } from "@/components/community-badge";
import { canSeeListing } from "@/lib/communities";
import { getViewerCommunityIds } from "@/server/communities";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getListingDetail(id);
  if (!data) return { title: "Item not found" };
  const { listing } = data;
  // Members-only items never reveal their title or photos in link previews.
  if (listing.communityOnly) return { title: `${listing.community?.shortName ?? "Community"} members-only item`, robots: { index: false } };
  return {
    title: listing.title,
    description: `${formatGBP(listing.pricePerDay)} a day in ${areaName(listing.area)}. ${listing.description.slice(0, 140)}`,
    openGraph: { images: listing.photos[0] ? [{ url: listing.photos[0] }] : [] },
  };
}

export default async function ItemPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [data, user] = await Promise.all([getListingDetail(id), getCurrentUser()]);
  if (!data) notFound();
  if (data.listing.communityOnly) {
    const communityIds = user ? await getViewerCommunityIds() : [];
    if (!canSeeListing(data.listing, user ? { id: user.id, communityIds } : null)) {
      const c = data.listing.community;
      return (
        <Container className="py-16">
          <div className="mx-auto max-w-md text-center">
            <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Members only</p>
            <h1 className="mt-2 text-2xl font-semibold">This item is for verified {c?.shortName ?? "community"} members</h1>
            <p className="mt-2 text-muted">Verify with your {c?.shortName ?? "community"} email or ID card to see it and book it.</p>
            {c && (
              <LinkButton href={user ? `/communities/${c.slug}/verify` : `/login?next=${encodeURIComponent(`/communities/${c.slug}/verify`)}`} className="mt-6">
                Verify with {c.shortName}
              </LinkButton>
            )}
          </div>
        </Container>
      );
    }
  }
  const { listing, reviews, ownerStats, today } = data;
  const owner = listing.owner;
  const isOwner = user?.id === owner.id;
  const category = categoryInfo(listing.category);
  const area = getArea(listing.area);
  const region = REGIONS.find((r) => r.id === area?.region);
  const condition = CONDITIONS.find((c) => c.id === listing.condition);
  const more = await getMoreFromOwner(owner.id, listing.id);
  // What it costs to buy new: the looked-up price stored on the listing, otherwise the owner's replacement value.
  // When the stored price is missing or stale, the ticket asks for a fresh lookup in the background.
  const buyPrice = buyPriceFor(listing);
  const buyPricePending = buyPriceLookupDue(listing);
  const whereToBuy = buyLinks(listing, { amazonTag: process.env.AMAZON_ASSOCIATE_TAG, ebayCampaignId: process.env.EBAY_CAMPAIGN_ID });
  const availability = {
    today,
    availableFrom: toISO(listing.availableFrom),
    availableTo: toISO(listing.availableTo),
    blockedDates: data.blockedDates,
    bookedRanges: data.bookedRanges,
  };
  const ownerFirst = firstName(owner.name);
  const paused = listing.status === "PAUSED";

  // Work out this viewer's deposit the same way requestBooking will.
  const trust = user && !isOwner ? await getRenterTrust(user.id) : null;
  const decision = trust ? depositFor(listing.deposit, { ...trust, fullDepositOnly: listing.fullDepositOnly }) : null;
  const deposit = decision?.amount ?? listing.deposit;
  const depositInfo = {
    listed: listing.deposit,
    reduced: Boolean(decision?.reduced),
    message: decision?.reduced
      ? `Half the usual ${formatGBP(listing.deposit)} because you're verified with ${plural(trust!.reviewCount, "good review")}.`
      : !user && !listing.fullDepositOnly
        ? "Verified renters with good reviews pay half."
        : decision?.reason === "open-claim"
          ? "You'll pay half again once your open deposit claim is settled."
          : null,
    verifyNudge: decision?.reason === "unverified",
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

      {paused && (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm font-medium">
          {isOwner ? "This listing is paused, so renters can't find or book it." : "This item isn't taking bookings at the moment."}
        </p>
      )}

      <BookingProvider
        handoverOptions={{ methods: listing.handoverMethods, ownerArea: listing.area, renterArea: user?.area ?? null }}
        availability={availability} initialStart={isISODate(sp.start) ? sp.start : undefined} initialEnd={isISODate(sp.end) ? sp.end : undefined}>
        <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_auto_auto_auto_auto_auto_1fr] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 lg:col-start-1">
            <PhotoGallery photos={listing.photos} title={listing.title} />
            <Link href={`/users/${owner.id}`} className="group mt-6 flex items-center gap-4 rounded-2xl border border-line p-4 hover:border-ink">
              <Avatar name={owner.name} src={owner.avatarUrl} size={52} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Lent by {owner.name} <VerifiedBadge verified={!!owner.verifiedAt} compact />
                </p>
                <p className="text-sm text-muted">
                  <Rating sum={owner.ratingSum} count={owner.ratingCount} className="mr-1.5" newLabel="No reviews yet" />· {plural(ownerStats.completed, "rental")} completed · Joined {formatMonthYear(owner.createdAt)}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
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
            {paused ? null : <DatesSection ownerFirstName={ownerFirst} />}
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
                        <Link href={`/users/${r.author.id}`} className="font-semibold hover:underline">
                          {shortName(r.author.name)}
                        </Link>
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
                  <span className="text-muted">{plural(ownerStats.listings, "item")} listed</span>
                </div>
                {owner.bio && <p className="mt-3 leading-relaxed text-ink-2">{owner.bio}</p>}
                <LinkButton href={`/users/${owner.id}`} variant="secondary" size="sm" className="mt-4">
                  View profile
                </LinkButton>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:self-start" aria-label="Booking">
            {paused && !isOwner ? (
              <div className="ticket p-6 text-sm text-muted">This item is paused by its owner. Check back soon.</div>
            ) : (
              <BookingTicket
                listingId={listing.id}
                pricePerDay={listing.pricePerDay}
                deposit={deposit}
                depositInfo={depositInfo}
                buyPrice={buyPrice}
                buyPricePending={buyPricePending}
                buyLinks={whereToBuy}
                ratingSum={listing.ratingSum}
                ratingCount={listing.ratingCount}
                ownerFirstName={ownerFirst}
                signedIn={!!user}
                isOwner={isOwner}
              />
            )}
          </aside>
        </div>
        {!paused && <MobileBookingBar pricePerDay={listing.pricePerDay} deposit={deposit} listingId={listing.id} signedIn={!!user} isOwner={isOwner} />}
      </BookingProvider>

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
