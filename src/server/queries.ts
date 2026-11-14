// Read-side queries used by pages. Writes live in ./actions.

import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { BLOCKING_STATUSES, type BookingStatusId } from "@/lib/booking-rules";
import { nextStep, type ClaimStatusId, type FlowBooking } from "@/lib/booking-flow";
import { addDays, toDate, todayInLondon, toISO, type ISODate } from "@/lib/dates";
import { areaFilterSlugs } from "@/lib/areas";
import type { CategoryId } from "@/lib/catalogue";

export const listingCardSelect = {
  id: true,
  title: true,
  category: true,
  condition: true,
  pricePerDay: true,
  deposit: true,
  area: true,
  photos: true,
  ratingCount: true,
  ratingSum: true,
  featured: true,
  createdAt: true,
  status: true,
  owner: { select: { id: true, name: true, avatarUrl: true, verifiedAt: true } },
} satisfies Prisma.ListingSelect;

export type ListingCardData = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

// ---------------------------------------------------------------- home + search

const HERO_IDS = ["black-tuxedo-satin-lapels", "mountain-hardwear-4-person-tent", "dji-mavic-air-2-drone"];

export async function getHomeData() {
  const [featured, latest, categoryCounts, hero, completedRentals, ratings] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE", featured: true },
      select: listingCardSelect,
      orderBy: [{ ratingCount: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    db.listing.findMany({ where: { status: "ACTIVE" }, select: listingCardSelect, orderBy: { createdAt: "desc" }, take: 4 }),
    db.listing.groupBy({ by: ["category"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    db.listing.findMany({ where: { id: { in: HERO_IDS }, status: "ACTIVE" }, select: listingCardSelect }),
    db.booking.count({ where: { status: "COMPLETED" } }),
    db.review.aggregate({ _avg: { rating: true } }),
  ]);
  const counts = Object.fromEntries(categoryCounts.map((c) => [c.category, c._count._all])) as Partial<Record<CategoryId, number>>;
  const heroOrdered = HERO_IDS.map((id) => hero.find((h) => h.id === id)).filter(Boolean) as ListingCardData[];
  const items = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const avg = ratings._avg.rating;
  return {
    featured,
    latest,
    counts,
    hero: heroOrdered.length === 3 ? heroOrdered : featured.slice(0, 3),
    stats: { items, rentals: completedRentals, rating: avg ? avg.toFixed(1) : null },
  };
}

export type SortKey = "recommended" | "price-asc" | "price-desc" | "newest";

export interface SearchFilters {
  q?: string;
  category?: CategoryId;
  area?: string;
  from?: ISODate;
  to?: ISODate;
  maxPrice?: number;
  sort?: SortKey;
}

// Typing "camera" or "halloween" should find the category even when titles don't say so.
const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  FORMALWEAR: ["formal", "suit", "tux", "dress", "gown", "black tie", "black-tie", "wedding", "outfit", "bag"],
  CAMERAS: ["camera", "photo", "lens", "drone", "video", "film", "vlog"],
  CAMPING: ["camp", "tent", "festival", "hike", "hiking", "outdoor", "glamping"],
  SEASONAL: ["seasonal", "halloween", "christmas", "xmas", "ski", "snow", "costume", "party", "decoration"],
};

function termCondition(term: string): Prisma.ListingWhereInput {
  const lower = term.toLowerCase();
  const categories = (Object.keys(CATEGORY_KEYWORDS) as CategoryId[]).filter((c) =>
    CATEGORY_KEYWORDS[c].some((k) => lower.startsWith(k) || k.startsWith(lower) && lower.length >= 4),
  );
  return {
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      ...(categories.length ? [{ category: { in: categories } }] : []),
    ],
  };
}

export async function searchListings(filters: SearchFilters) {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  const and: Prisma.ListingWhereInput[] = [];
  if (filters.category) where.category = filters.category;
  const areas = areaFilterSlugs(filters.area);
  if (areas) where.area = { in: areas };
  if (filters.maxPrice) where.pricePerDay = { lte: filters.maxPrice };
  if (filters.q?.trim()) {
    for (const term of filters.q.trim().split(/\s+/).slice(0, 6)) and.push(termCondition(term));
  }
  if (filters.from && filters.to) {
    const from = toDate(filters.from);
    const to = toDate(filters.to);
    and.push(
      { availableFrom: { lte: from }, availableTo: { gte: to } },
      { bookings: { none: { status: { in: [...BLOCKING_STATUSES] }, startDate: { lte: to }, endDate: { gte: from } } } },
      { blockedDates: { none: { date: { gte: from, lte: to } } } },
    );
  }
  if (and.length) where.AND = and;

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    filters.sort === "price-asc"
      ? [{ pricePerDay: "asc" }]
      : filters.sort === "price-desc"
        ? [{ pricePerDay: "desc" }]
        : filters.sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ featured: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }];

  return db.listing.findMany({ where, select: listingCardSelect, orderBy, take: 60 });
}

// ---------------------------------------------------------------- listing detail

export async function getListingDetail(id: string) {
  const today = todayInLondon();
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, avatarUrl: true, verifiedAt: true, bio: true, area: true, createdAt: true, ratingCount: true, ratingSum: true },
      },
      blockedDates: { where: { date: { gte: toDate(today) } }, select: { date: true }, orderBy: { date: "asc" } },
      bookings: {
        where: { status: { in: [...BLOCKING_STATUSES] }, endDate: { gte: toDate(today) } },
        select: { startDate: true, endDate: true },
        orderBy: { startDate: "asc" },
      },
    },
  });
  if (!listing || listing.status === "ARCHIVED") return null;

  const [reviews, ownerListings, ownerCompleted] = await Promise.all([
    db.review.findMany({
      where: { authorRole: "RENTER", booking: { listingId: id } },
      select: { id: true, rating: true, comment: true, createdAt: true, author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.listing.count({ where: { ownerId: listing.ownerId, status: "ACTIVE" } }),
    db.booking.count({ where: { ownerId: listing.ownerId, status: "COMPLETED" } }),
  ]);

  return {
    listing,
    today,
    blockedDates: listing.blockedDates.map((b) => toISO(b.date)),
    bookedRanges: listing.bookings.map((b) => ({ start: toISO(b.startDate), end: toISO(b.endDate) })),
    reviews,
    ownerStats: { listings: ownerListings, completed: ownerCompleted },
  };
}

export async function getMoreFromOwner(ownerId: string, excludeId: string) {
  return db.listing.findMany({
    where: { ownerId, status: "ACTIVE", id: { not: excludeId } },
    select: listingCardSelect,
    orderBy: { ratingCount: "desc" },
    take: 4,
  });
}

// ---------------------------------------------------------------- bookings

export const bookingRowSelect = {
  id: true,
  status: true,
  startDate: true,
  endDate: true,
  days: true,
  subtotal: true,
  serviceFee: true,
  total: true,
  deposit: true,
  createdAt: true,
  returnedAt: true,
  paymentStatus: true,
  depositStatus: true,
  payoutStatus: true,
  message: true,
  listing: { select: { id: true, title: true, photos: true, area: true } },
  owner: { select: { id: true, name: true, avatarUrl: true } },
  renter: { select: { id: true, name: true, avatarUrl: true, verifiedAt: true, ratingSum: true, ratingCount: true } },
  checks: { select: { stage: true, party: true, conditionOk: true } },
  reviews: { select: { authorRole: true } },
  depositReduced: true,
  depositKept: true,
  claim: { select: { status: true, amount: true } },
} satisfies Prisma.BookingSelect;

export type BookingRow = Prisma.BookingGetPayload<{ select: typeof bookingRowSelect }>;

export function toFlow(b: {
  status: string;
  startDate: Date;
  endDate: Date;
  returnedAt?: Date | null;
  checks: { stage: "PICKUP" | "RETURN"; party: "OWNER" | "RENTER"; conditionOk?: boolean }[];
  reviews: { authorRole: "OWNER" | "RENTER" }[];
  depositStatus?: FlowBooking["depositStatus"];
  claim?: { status: ClaimStatusId } | null;
}): FlowBooking {
  return {
    status: b.status as BookingStatusId,
    startDate: toISO(b.startDate),
    endDate: toISO(b.endDate),
    returnedAt: b.returnedAt ?? null,
    checks: b.checks,
    reviews: b.reviews,
    depositStatus: b.depositStatus,
    claim: b.claim ?? null,
  };
}

export async function getRenterBookings(userId: string) {
  return db.booking.findMany({ where: { renterId: userId }, select: bookingRowSelect, orderBy: { startDate: "asc" } });
}

export async function getOwnerDashboard(userId: string) {
  const [bookings, listings, earnings] = await Promise.all([
    db.booking.findMany({ where: { ownerId: userId }, select: bookingRowSelect, orderBy: { startDate: "asc" } }),
    db.listing.findMany({
      where: { ownerId: userId, status: { not: "ARCHIVED" } },
      select: { ...listingCardSelect, _count: { select: { bookings: { where: { status: { in: [...BLOCKING_STATUSES] } } } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.booking.groupBy({ by: ["payoutStatus"], where: { ownerId: userId, payoutStatus: { in: ["PAID", "SCHEDULED"] } }, _sum: { subtotal: true } }),
  ]);
  const sum = (status: string) => earnings.find((e) => e.payoutStatus === status)?._sum.subtotal ?? 0;
  return { bookings, listings, earned: sum("PAID"), upcoming: sum("SCHEDULED") };
}

export async function getAttentionCounts(userId: string) {
  const recent = new Date(Date.now() - 31 * 86_400_000);
  const bookings = await db.booking.findMany({
    where: {
      OR: [{ ownerId: userId }, { renterId: userId }],
      AND: [
        {
          OR: [
            { status: { in: ["REQUESTED", "ACCEPTED", "ACTIVE"] } },
            { status: "COMPLETED", returnedAt: { gte: recent } },
            { status: "COMPLETED", depositStatus: { in: ["HELD", "IN_REVIEW"] } },
          ],
        },
      ],
    },
    select: {
      ownerId: true,
      status: true,
      startDate: true,
      endDate: true,
      returnedAt: true,
      depositStatus: true,
      checks: { select: { stage: true, party: true, conditionOk: true } },
      reviews: { select: { authorRole: true } },
      claim: { select: { status: true } },
    },
  });
  const today = todayInLondon();
  let rentals = 0;
  let listings = 0;
  for (const b of bookings) {
    const viewer = b.ownerId === userId ? "OWNER" : "RENTER";
    if (nextStep(toFlow(b), viewer, "", today).needsYou) viewer === "OWNER" ? listings++ : rentals++;
  }
  return { rentals, listings };
}

export async function getBookingDetail(id: string) {
  return db.booking.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, photos: true, area: true, category: true, condition: true, pickupNotes: true, ownerId: true, deposit: true } },
      owner: { select: { id: true, name: true, avatarUrl: true, verifiedAt: true, ratingSum: true, ratingCount: true, createdAt: true } },
      renter: { select: { id: true, name: true, avatarUrl: true, verifiedAt: true, ratingSum: true, ratingCount: true, createdAt: true } },
      checks: { orderBy: { createdAt: "asc" } },
      claim: true,
      reviews: { include: { author: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
      events: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}

export type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>;

// ---------------------------------------------------------------- profiles

export async function getProfile(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, verifiedAt: true, bio: true, area: true, createdAt: true, ratingCount: true, ratingSum: true },
  });
  if (!user) return null;
  const [listings, reviews, lentCount, rentedCount] = await Promise.all([
    db.listing.findMany({ where: { ownerId: id, status: "ACTIVE" }, select: listingCardSelect, orderBy: { createdAt: "desc" } }),
    db.review.findMany({
      where: { subjectId: id },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        authorRole: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
        booking: { select: { listing: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.booking.count({ where: { ownerId: id, status: "COMPLETED" } }),
    db.booking.count({ where: { renterId: id, status: "COMPLETED" } }),
  ]);
  return { user, listings, reviews, lentCount, rentedCount };
}

/** Listings edit form needs the full record plus future blocked dates. */
export async function getListingForEdit(id: string, ownerId: string) {
  const listing = await db.listing.findFirst({
    where: { id, ownerId, status: { not: "ARCHIVED" } },
    include: { blockedDates: { where: { date: { gte: toDate(addDays(todayInLondon(), -1)) } }, select: { date: true } } },
  });
  if (!listing) return null;
  const hasOpenBookings = await db.booking.count({ where: { listingId: id, status: { in: ["ACCEPTED", "ACTIVE"] } } });
  return { listing, blockedDates: listing.blockedDates.map((b) => toISO(b.date)), hasOpenBookings: hasOpenBookings > 0 };
}

// ---------------------------------------------------------------- deposits

/** What decides whether a renter gets the reduced deposit. */
export async function getRenterTrust(userId: string) {
  const [user, completedRentals, ownerReviews, openClaims] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { verifiedAt: true } }),
    db.booking.count({ where: { renterId: userId, status: "COMPLETED" } }),
    db.review.aggregate({ where: { subjectId: userId, authorRole: "OWNER" }, _avg: { rating: true }, _count: { _all: true } }),
    db.depositClaim.count({ where: { booking: { renterId: userId }, status: { in: ["OPEN", "CONTESTED"] } } }),
  ]);
  return {
    verified: Boolean(user?.verifiedAt),
    completedRentals,
    avgRating: ownerReviews._avg.rating ?? null,
    reviewCount: ownerReviews._count._all,
    openClaims,
  };
}

export type RenterTrust = Awaited<ReturnType<typeof getRenterTrust>>;
