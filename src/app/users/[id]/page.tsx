import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { ListingGrid } from "@/components/listing-card";
import { Avatar, Container, EmptyState, LinkButton, Rating, Stars, VerifiedBadge } from "@/components/ui";
import { areaName } from "@/lib/areas";
import { formatMonthYear } from "@/lib/dates";
import { firstName, formatRating, plural, shortName } from "@/lib/cn";
import { getProfile } from "@/server/queries";
import { getViewer } from "@/server/communities";
import { AreaMapClient } from "@/components/map/area-map-client";
import { areaCircle } from "@/lib/geo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getProfile(id);
  return { title: data ? `${shortName(data.user.name)} on Just Once` : "Profile not found" };
}

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  // Members-only items only show to the owner and verified members of that community.
  const viewer = await getViewer();
  const data = await getProfile(id, viewer);
  if (!data) notFound();
  const { user, listings, reviews, lentCount, rentedCount } = data;
  const isMe = viewer?.id === user.id;
  const first = firstName(user.name);
  const fromRenters = reviews.filter((r) => r.authorRole === "RENTER");
  const fromOwners = reviews.filter((r) => r.authorRole === "OWNER");

  return (
    <Container className="py-8 md:py-12">
      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="ticket shadow-card">
            <div className="p-6">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                <Avatar name={user.name} src={user.avatarUrl} size={96} />
                <div>
                  <h1 className="text-2xl font-semibold sm:text-3xl">{user.name}</h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="size-4 shrink-0" aria-hidden /> {areaName(user.area)} · Joined {formatMonthYear(user.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <VerifiedBadge verified={!!user.verifiedAt} />
                {user.verifiedAt && <p className="mt-1 text-xs text-muted">Identity checked {formatMonthYear(user.verifiedAt)}</p>}
              </div>
            </div>
            <div className="ticket-perf" aria-hidden />
            <dl className="grid grid-cols-3 divide-x divide-line py-4 text-center">
              <Stat label="Rating" value={formatRating(user.ratingSum, user.ratingCount) ?? "New"} />
              <Stat label="Lent out" value={String(lentCount)} />
              <Stat label="Rented" value={String(rentedCount)} />
            </dl>
          </div>
          {isMe && (
            <LinkButton href="/account" variant="secondary" className="mt-4 w-full">
              Edit profile
            </LinkButton>
          )}
        </aside>

        <div className="min-w-0 space-y-14">
          <section>
            <h2 className="text-2xl font-semibold">About {first}</h2>
            <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-ink-2">
              {user.bio || `${first} hasn't written a bio yet.`}
            </p>
          </section>

          <section aria-labelledby="listings-heading">
            <h2 id="listings-heading" className="mb-6 text-2xl font-semibold">
              {listings.length > 0 ? `${first}'s items` : "Items"}
            </h2>
            {listings.length > 0 ? (
              <ListingGrid listings={listings} />
            ) : (
              <EmptyState
                title={isMe ? "You haven't listed anything yet" : `${first} isn't lending anything right now`}
                body={isMe ? "Got a suit, a tent or a camera you barely use? List it in two minutes." : undefined}
                action={isMe ? <LinkButton href="/listings/new">List an item</LinkButton> : undefined}
              />
            )}
          </section>

          {listings.length > 0 && (
            <section aria-labelledby="where-heading">
              <h2 id="where-heading" className="text-2xl font-semibold">
                Where {first}&apos;s items are
              </h2>
              <p className="mt-1 text-sm text-muted">Neighbourhoods only. Exact pickup points are shared once a booking is accepted.</p>
              <AreaMapClient
                circles={areaCircle(...listings.map((l) => l.area))}
                label={`Map of the areas where ${first} lends items`}
                className="mt-4 h-64 w-full overflow-hidden rounded-2xl border border-line bg-surface"
              />
            </section>
          )}

          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="flex items-center gap-3 text-2xl font-semibold">
              Reviews
              {user.ratingCount > 0 && <Rating sum={user.ratingSum} count={user.ratingCount} className="text-base" />}
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-muted">No reviews yet.</p>
            ) : (
              <div className="mt-6 grid gap-10 md:grid-cols-2">
                <ReviewColumn title={`From renters (${fromRenters.length})`} reviews={fromRenters} empty={`${first} hasn't lent anything out yet.`} />
                <ReviewColumn title={`From owners (${fromOwners.length})`} reviews={fromOwners} empty={`${first} hasn't rented anything yet.`} />
              </div>
            )}
          </section>
        </div>
      </div>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}

type ProfileReview = NonNullable<Awaited<ReturnType<typeof getProfile>>>["reviews"][number];

function ReviewColumn({ title, reviews, empty }: { title: string; reviews: ProfileReview[]; empty: string }) {
  return (
    <div>
      <h3 className="font-mono text-xs tracking-[0.14em] text-muted uppercase">{title}</h3>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-line pb-6 last:border-0">
              <div className="flex items-center gap-3">
                <Avatar name={r.author.name} src={r.author.avatarUrl} size={36} />
                <div className="min-w-0">
                  <Link href={`/users/${r.author.id}`} className="text-sm font-semibold hover:underline">
                    {shortName(r.author.name)}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {formatMonthYear(r.createdAt)} ·{" "}
                    <Link href={`/items/${r.booking.listing.id}`} className="hover:underline">
                      {r.booking.listing.title}
                    </Link>
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <Stars value={r.rating} size={13} />
              </div>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-2">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
