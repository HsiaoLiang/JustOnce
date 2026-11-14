// Read side of school/company communities. Every query that can return a members-only
// listing takes the viewer's verified community ids, so nothing leaks to non-members.

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { listingCardSelect, visibleListingsWhere } from "./queries";

/** Ids of communities the signed-in user is VERIFIED in. Cached per request. */
export const getViewerCommunityIds = cache(async (): Promise<string[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.communityMember.findMany({ where: { userId: user.id, status: "VERIFIED" }, select: { communityId: true } });
  return rows.map((r) => r.communityId);
});

export async function getViewer() {
  const user = await getCurrentUser();
  if (!user) return null;
  return { id: user.id, communityIds: await getViewerCommunityIds() };
}

export async function listCommunities() {
  return db.community.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      type: true,
      area: true,
      description: true,
      _count: { select: { members: { where: { status: "VERIFIED" } }, posts: { where: { status: "OPEN" } }, listings: { where: { status: "ACTIVE" } } } },
    },
  });
}

/** Small list for filter chips and the listing form. */
export async function communityOptions() {
  return db.community.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, shortName: true, name: true } });
}

export async function getCommunityBySlug(slug: string) {
  return db.community.findUnique({ where: { slug } });
}

export async function getMembership(userId: string, communityId: string) {
  return db.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId } },
    select: { status: true, method: true, email: true, codeExpiresAt: true, verifiedAt: true },
  });
}

export const postAuthorSelect = { id: true, name: true, avatarUrl: true, verifiedAt: true } satisfies Prisma.UserSelect;

export async function getCommunityPage(communityId: string, opts: { tab: "board" | "items"; type?: "REQUEST" | "OFFER"; viewer: { id: string; communityIds: string[] } | null }) {
  const [memberCount, posts, listings] = await Promise.all([
    db.communityMember.count({ where: { communityId, status: "VERIFIED" } }),
    opts.tab === "board"
      ? db.communityPost.findMany({
          where: { communityId, ...(opts.type ? { type: opts.type } : {}) },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 50,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            neededBy: true,
            pricePence: true,
            photos: true,
            status: true,
            createdAt: true,
            author: { select: postAuthorSelect },
            _count: { select: { comments: true } },
          },
        })
      : Promise.resolve([]),
    opts.tab === "items"
      ? db.listing.findMany({
          where: { AND: [{ status: "ACTIVE", communityId }, visibleListingsWhere(opts.viewer)] },
          select: listingCardSelect,
          orderBy: { createdAt: "desc" },
          take: 60,
        })
      : Promise.resolve([]),
  ]);
  return { memberCount, posts, listings };
}

export async function getCommunityPost(communityId: string, postId: string) {
  return db.communityPost.findFirst({
    where: { id: postId, communityId },
    include: {
      author: { select: postAuthorSelect },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: postAuthorSelect } } },
    },
  });
}

/** Verified-member badges to show next to people, keyed by user id. */
export async function verifiedBadges(userIds: string[]) {
  if (!userIds.length) return new Map<string, string[]>();
  const rows = await db.communityMember.findMany({
    where: { userId: { in: [...new Set(userIds)] }, status: "VERIFIED" },
    select: { userId: true, community: { select: { shortName: true } } },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r.community.shortName]);
  return map;
}

/** Communities a user is verified in, for the listing form. */
export async function verifiedCommunitiesFor(userId: string) {
  const rows = await db.communityMember.findMany({
    where: { userId, status: "VERIFIED" },
    select: { community: { select: { id: true, slug: true, name: true, shortName: true } } },
    orderBy: { community: { name: "asc" } },
  });
  return rows.map((r) => r.community);
}
