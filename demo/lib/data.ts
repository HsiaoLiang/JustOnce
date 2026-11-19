// The demo's "database": the same seed content the real app loads, turned into page data at build time.
// Dates are day offsets from the build date, as in the seed.

import { BOOKINGS, LISTINGS, USERS } from "@/server/seed/data";
import { COMMUNITIES, COMMUNITY_LISTINGS, COMMUNITY_MEMBERS, COMMUNITY_POSTS } from "@/server/seed/communities";
import type { ListingCardData } from "@/server/queries";
import type { HandoverMethodId } from "@/lib/money";
import { canSeeListing, type PostTypeId } from "@/lib/communities";
import { todayInLondon } from "@/lib/dates";

export const BUILD_TODAY = todayInLondon();
const NOW = Date.now();
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW - days * DAY);

export interface DemoUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  bio: string;
  area: string;
  ratingSum: number;
  ratingCount: number;
}

export interface DemoReview {
  id: string;
  listingId: string;
  author: DemoUser;
  subjectId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export type DemoListing = ListingCardData & {
  communityId: string | null;
  description: string;
  brand: string | null;
  size: string | null;
  pickupNotes: string;
  handoverMethods: HandoverMethodId[];
  fullDepositOnly: boolean;
  replacementValue: number | null;
  /** Availability as day offsets from "today", so the browser can line it up with the real date. */
  availableFromOffset: number;
  blockedOffsets: number[];
  bookedOffsets: { start: number; end: number }[];
};

// ---------------------------------------------------------------- reviews and users

const BLOCKING = new Set(["ACCEPTED", "ACTIVE", "COMPLETED"]);
const seedUser = new Map(USERS.map((u) => [u.id, u]));
const seedListing = new Map(LISTINGS.map((l) => [l.id, l]));

const rawReviews = BOOKINGS.flatMap((b, i) => {
  const listing = seedListing.get(b.listing)!;
  const createdAt = daysAgo(Math.max(1, -b.end - 1));
  const rows: { id: string; listingId: string; authorId: string; subjectId: string; rating: number; comment: string; createdAt: Date }[] = [];
  if (b.renterReview) rows.push({ id: `r${i}`, listingId: b.listing, authorId: b.renter, subjectId: listing.owner, ...b.renterReview, createdAt });
  if (b.ownerReview) rows.push({ id: `o${i}`, listingId: b.listing, authorId: listing.owner, subjectId: b.renter, ...b.ownerReview, createdAt });
  return rows;
});

export const USERS_BY_ID = new Map<string, DemoUser>(
  USERS.map((u) => {
    const mine = rawReviews.filter((r) => r.subjectId === u.id);
    return [
      u.id,
      {
        id: u.id,
        name: u.name,
        avatarUrl: u.avatar ?? null,
        verifiedAt: u.verified ? daysAgo(u.joinedDaysAgo - 2) : null,
        createdAt: daysAgo(u.joinedDaysAgo),
        bio: u.bio,
        area: u.area,
        ratingSum: mine.reduce((s, r) => s + r.rating, 0),
        ratingCount: mine.length,
      },
    ];
  }),
);
const user = (id: string) => USERS_BY_ID.get(id)!;

const REVIEWS: DemoReview[] = rawReviews.map(({ authorId, ...r }) => ({ ...r, author: user(authorId) }));

// ---------------------------------------------------------------- listings

const communityById = new Map(COMMUNITIES.map((c) => [c.id, c]));

function ownerCard(id: string) {
  const u = user(id);
  return { id: u.id, name: u.name, avatarUrl: u.avatarUrl, verifiedAt: u.verifiedAt };
}

const mainListings: DemoListing[] = LISTINGS.map((l, i) => {
  // Only the renter's review of a rental counts towards the item's rating.
  const reviews = REVIEWS.filter((r) => r.listingId === l.id && r.subjectId === l.owner);
  return {
    id: l.id,
    title: l.title,
    category: l.category,
    condition: l.condition,
    pricePerDay: l.price * 100,
    deposit: l.deposit * 100,
    area: l.area,
    photos: l.photos,
    ratingCount: reviews.length,
    ratingSum: reviews.reduce((s, r) => s + r.rating, 0),
    featured: Boolean(l.featured),
    createdAt: daysAgo(170 - i),
    status: "ACTIVE",
    communityOnly: false,
    community: null,
    communityId: null,
    owner: ownerCard(l.owner),
    description: l.description,
    brand: l.brand ?? null,
    size: l.size ?? null,
    pickupNotes: l.pickupNotes,
    handoverMethods: ["MEET", ...(l.delivery ?? [])],
    fullDepositOnly: Boolean(l.fullDepositOnly),
    replacementValue: l.replacementValue ? l.replacementValue * 100 : null,
    availableFromOffset: -180,
    blockedOffsets: (l.blocked ?? []).flatMap(([from, to]) => Array.from({ length: to - from + 1 }, (_, d) => from + d)),
    bookedOffsets: BOOKINGS.filter((b) => b.listing === l.id && BLOCKING.has(b.status)).map((b) => ({ start: b.start, end: b.end })),
  } satisfies DemoListing;
});

const communityListings: DemoListing[] = COMMUNITY_LISTINGS.map((l, i) => {
  const c = communityById.get(l.community)!;
  return {
    id: l.id,
    title: l.title,
    category: l.category,
    condition: l.condition,
    pricePerDay: l.price * 100,
    deposit: l.deposit * 100,
    area: c.area,
    photos: l.photos,
    ratingCount: 0,
    ratingSum: 0,
    featured: false,
    createdAt: daysAgo(14 - (i % 14)),
    status: "ACTIVE",
    communityOnly: l.membersOnly,
    community: { slug: c.slug, shortName: c.shortName },
    communityId: c.id,
    owner: ownerCard(l.owner),
    description: l.description,
    brand: l.brand ?? null,
    size: l.size ?? null,
    pickupNotes: l.pickupNotes,
    handoverMethods: ["MEET"],
    fullDepositOnly: false,
    replacementValue: null,
    availableFromOffset: -30,
    blockedOffsets: [],
    bookedOffsets: [],
  } satisfies DemoListing;
});

/** Every listing, newest first, members-only ones included. Pages show VISIBLE_LISTINGS instead. */
export const ALL_LISTINGS: DemoListing[] = [...mainListings, ...communityListings].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

/**
 * A static page is public, so the demo always renders for a signed-out visitor: members-only items
 * go through the app's own canSeeListing check and stay hidden, exactly as in the real app.
 */
const VIEWER = null;

export function isVisible(l: DemoListing): boolean {
  return canSeeListing({ ownerId: l.owner.id, communityId: l.communityId, communityOnly: l.communityOnly }, VIEWER);
}

/** The listings a signed-out visitor may see, newest first. */
export const VISIBLE_LISTINGS: DemoListing[] = ALL_LISTINGS.filter(isVisible);

export function getListing(id: string): DemoListing | undefined {
  return ALL_LISTINGS.find((l) => l.id === id);
}

/** Just the fields a listing card needs, so pages don't ship descriptions they don't show. */
export function toCard(l: DemoListing): ListingCardData {
  return {
    id: l.id,
    title: l.title,
    category: l.category,
    condition: l.condition,
    pricePerDay: l.pricePerDay,
    deposit: l.deposit,
    area: l.area,
    photos: l.photos,
    ratingCount: l.ratingCount,
    ratingSum: l.ratingSum,
    featured: l.featured,
    createdAt: l.createdAt,
    status: l.status,
    communityOnly: l.communityOnly,
    community: l.community,
    owner: l.owner,
  };
}

export function reviewsFor(listingId: string): DemoReview[] {
  const owner = getListing(listingId)?.owner.id;
  return REVIEWS.filter((r) => r.listingId === listingId && r.subjectId === owner).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function ownerStats(ownerId: string) {
  const listings = ALL_LISTINGS.filter((l) => l.owner.id === ownerId);
  const ids = new Set(listings.map((l) => l.id));
  return { listings: listings.length, completed: BOOKINGS.filter((b) => ids.has(b.listing) && b.status === "COMPLETED").length };
}

// ---------------------------------------------------------------- home

const HERO_IDS = ["black-tuxedo-satin-lapels", "mountain-hardwear-4-person-tent", "dji-mavic-air-2-drone"];

export function getHomeData() {
  const open = ALL_LISTINGS.filter((l) => !l.communityOnly);
  const featured = open
    .filter((l) => l.featured)
    .sort((a, b) => b.ratingCount - a.ratingCount || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);
  const counts: Record<string, number> = {};
  for (const l of open) counts[l.category] = (counts[l.category] ?? 0) + 1;
  const ratings = rawReviews.filter((r) => seedListing.get(r.listingId)?.owner === r.subjectId);
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null;
  return {
    featured: featured.map(toCard),
    latest: open.slice(0, 4).map(toCard),
    counts,
    hero: HERO_IDS.map((id) => getListing(id)).filter((l): l is DemoListing => Boolean(l)).map(toCard),
    stats: { items: open.length, rentals: BOOKINGS.filter((b) => b.status === "COMPLETED").length, rating: avg },
  };
}

// ---------------------------------------------------------------- communities

export interface DemoComment {
  id: string;
  author: DemoUser;
  body: string;
  createdAt: Date;
}

export interface DemoPost {
  id: string;
  type: PostTypeId;
  title: string;
  body: string;
  author: DemoUser;
  neededInDays: number | null;
  pricePence: number | null;
  status: "OPEN" | "FULFILLED";
  createdAt: Date;
  comments: DemoComment[];
}

export type DemoCommunity = (typeof COMMUNITIES)[number] & {
  members: DemoUser[];
  /** Only the ones a signed-out visitor may see. */
  listings: DemoListing[];
  /** How many members-only items are hidden from a signed-out visitor. */
  hiddenListings: number;
  posts: DemoPost[];
  counts: { members: number; listings: number; posts: number };
};

export const ALL_COMMUNITIES: DemoCommunity[] = COMMUNITIES.map((c) => {
  const members = (COMMUNITY_MEMBERS[c.id] ?? []).map(user);
  const all = ALL_LISTINGS.filter((l) => l.communityId === c.id);
  const listings = all.filter(isVisible);
  const posts: DemoPost[] = COMMUNITY_POSTS.filter((p) => p.community === c.id)
    .map((p) => {
      const createdAt = daysAgo(p.daysAgo + 1 / 24);
      return {
        id: p.id,
        type: p.type,
        title: p.title,
        body: p.body,
        author: user(p.author),
        neededInDays: p.neededIn ?? null,
        pricePence: p.price !== undefined ? p.price * 100 : null,
        status: p.status ?? "OPEN",
        createdAt,
        comments: (p.comments ?? []).map((cm, i) => ({
          id: `${p.id}-c${i}`,
          author: user(cm.author),
          body: cm.body,
          createdAt: new Date(Math.min(createdAt.getTime() + cm.hoursLater * 3_600_000, NOW - 60_000)),
        })),
      };
    })
    .sort((a, b) => Number(a.status === "FULFILLED") - Number(b.status === "FULFILLED") || b.createdAt.getTime() - a.createdAt.getTime());
  return {
    ...c,
    members,
    listings,
    hiddenListings: all.length - listings.length,
    posts,
    counts: { members: members.length, listings: all.length, posts: posts.filter((p) => p.status === "OPEN").length },
  };
});

export function getCommunity(slug: string): DemoCommunity | undefined {
  return ALL_COMMUNITIES.find((c) => c.slug === slug);
}
