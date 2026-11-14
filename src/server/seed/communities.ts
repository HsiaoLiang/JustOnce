// Demo content for school/company communities, starting with London Business School (LBS).
// Loaded by seedDatabase after users and listings, so it can reference them.

import type { Prisma, PrismaClient } from "@prisma/client";
import { addDays, toDate, type ISODate } from "../../lib/dates";

export const LBS_DEMO_USER = {
  id: "martin-hsiao",
  name: "Martin Hsiao",
  email: "martin@example.com",
  /** School email used for the seeded verification; never shown to other members. */
  schoolEmail: "mhsiao@london.edu",
  area: "camden",
  bio: "MBA student at London Business School. Happy to lend my calculator and interview suit to classmates.",
};

export const COMMUNITIES = [
  {
    id: "lbs",
    slug: "lbs",
    name: "London Business School",
    shortName: "LBS",
    type: "UNIVERSITY" as const,
    domains: ["london.edu"],
    area: "camden",
    handoverSpot: "Sammy Ofer Centre reception or Sussex Place",
    description:
      "For LBS students and staff around Regent's Park. Borrow suits for recruiting season, black tie for the Gala, cameras for club events, and ask classmates for anything you need before Thursday's exam.",
  },
];

/** Existing demo users who are also verified at LBS, plus Martin. */
const LBS_MEMBERS = [LBS_DEMO_USER.id, "sophie-clarke", "oliver-bennett", "mei-chen"];

const LBS_LISTINGS = [
  {
    id: "lbs-interview-navy-suit",
    owner: LBS_DEMO_USER.id,
    title: "Navy interview suit for recruiting season",
    category: "FORMALWEAR" as const,
    condition: "LIKE_NEW" as const,
    brand: "Hugo Boss",
    size: "40R jacket, 32R trousers",
    price: 12,
    deposit: 60,
    photos: ["/seed/listings/navy-suit-1.jpg", "/seed/listings/navy-suit-2.jpg"],
    description: "Slim navy two-piece I wore for consulting final rounds. Freshly pressed, comes with a garment bag. Perfect for MBB and banking interviews.",
    pickupNotes: "Sammy Ofer Centre reception, weekdays 12–2pm.",
    membersOnly: true,
  },
  {
    id: "lbs-gala-tuxedo",
    owner: "oliver-bennett",
    title: "Black tie tuxedo for the LBS Gala",
    category: "FORMALWEAR" as const,
    condition: "LIKE_NEW" as const,
    brand: "Moss",
    size: "40R jacket, 34R trousers",
    price: 20,
    deposit: 90,
    photos: ["/seed/listings/tuxedo-1.jpg", "/seed/listings/tuxedo-2.jpg", "/seed/listings/tuxedo-3.jpg"],
    description: "Dinner suit with satin lapels and a silk bow tie. Ideal for the Gala, club dinners and Sloan balls.",
    pickupNotes: "Sussex Place entrance, evenings after 6pm.",
    membersOnly: false,
  },
  {
    id: "lbs-canon-80d-headshots",
    owner: "mei-chen",
    title: "Canon 80D kit for LinkedIn headshots",
    category: "CAMERAS" as const,
    condition: "GOOD" as const,
    brand: "Canon",
    size: undefined,
    price: 15,
    deposit: 120,
    photos: ["/seed/listings/canon-80d-1.jpg", "/seed/listings/canon-80d-2.jpg", "/seed/listings/canon-80d-3.jpg"],
    description: "Canon 80D with 50mm f/1.8, two batteries and a 64GB card. Great for club headshot days in the library courtyard.",
    pickupNotes: "Library reception, any weekday.",
    membersOnly: true,
  },
  {
    id: "lbs-studio-lighting-kit",
    owner: "sophie-clarke",
    title: "Studio lighting kit for club events",
    category: "CAMERAS" as const,
    condition: "GOOD" as const,
    brand: "Neewer",
    size: undefined,
    price: 10,
    deposit: 50,
    photos: ["/seed/listings/studio-lighting-kit-1.jpg", "/seed/listings/studio-lighting-kit-2.jpg"],
    description: "Two softboxes and stands. Used for Entrepreneurship Club pitch night recordings.",
    pickupNotes: "Sammy Ofer Centre reception.",
    membersOnly: false,
  },
];

const LBS_POSTS: {
  id: string;
  author: string;
  type: "REQUEST" | "OFFER";
  title: string;
  body: string;
  neededIn?: number;
  price?: number;
  daysAgo: number;
  status?: "OPEN" | "FULFILLED";
  comments?: { author: string; body: string; hoursLater: number }[];
}[] = [
  {
    id: "lbs-post-ba-ii-plus",
    author: LBS_DEMO_USER.id,
    type: "REQUEST",
    title: "Need a TI BA II Plus for the Corporate Finance midterm",
    body: "Mine died this morning. Need it Thursday 9am–12pm, happy to pay £5 or buy you a coffee at the Hub.",
    neededIn: 3,
    price: 5,
    daysAgo: 0,
    comments: [{ author: "sophie-clarke", body: "I have a spare one! I'm at Sussex Place until 5pm today.", hoursLater: 2 }],
  },
  {
    id: "lbs-post-garment-steamer",
    author: "oliver-bennett",
    type: "REQUEST",
    title: "Garment steamer before consulting interviews",
    body: "Anyone in Marylebone or Baker Street with a steamer I can borrow tomorrow afternoon? Final rounds on Friday.",
    neededIn: 1,
    daysAgo: 1,
  },
  {
    id: "lbs-post-dell-monitor",
    author: "mei-chen",
    type: "OFFER",
    title: "27-inch Dell USB-C monitor free to borrow this term",
    body: "Moving out of student accommodation for Term 2 exchange. Free to a classmate who can collect it from Marylebone.",
    neededIn: 7,
    price: 0,
    daysAgo: 2,
  },
  {
    id: "lbs-post-graduation-gown",
    author: "sophie-clarke",
    type: "OFFER",
    title: "Master's gown and hood for graduation photos",
    body: "Available for the graduation photoshoot weekend. Pick up from the Sammy Ofer Centre.",
    price: 8,
    daysAgo: 4,
    status: "FULFILLED",
    comments: [{ author: LBS_DEMO_USER.id, body: "Took it for Saturday, thanks Sophie!", hoursLater: 5 }],
  },
];

export async function seedCommunities(prisma: PrismaClient | Prisma.TransactionClient, opts: { today: ISODate; passwordHash: string; now: number }) {
  const { today, passwordHash, now } = opts;
  const ago = (days: number, hours = 0) => new Date(now - days * 86_400_000 - 3_600_000 + hours * 3_600_000);

  await prisma.user.create({
    data: {
      id: LBS_DEMO_USER.id,
      email: LBS_DEMO_USER.email,
      name: LBS_DEMO_USER.name,
      passwordHash,
      area: LBS_DEMO_USER.area,
      bio: LBS_DEMO_USER.bio,
      verifiedAt: ago(60),
      createdAt: ago(90),
    },
  });

  await prisma.community.createMany({ data: COMMUNITIES });

  await prisma.communityMember.createMany({
    data: LBS_MEMBERS.map((userId, i) => ({
      userId,
      communityId: "lbs",
      method: "EMAIL" as const,
      status: "VERIFIED" as const,
      email: userId === LBS_DEMO_USER.id ? LBS_DEMO_USER.schoolEmail : `${userId.split("-")[0]}@london.edu`,
      verifiedAt: ago(30 - i),
    })),
  });

  await prisma.listing.createMany({
    data: LBS_LISTINGS.map((l, i) => ({
      id: l.id,
      ownerId: l.owner,
      title: l.title,
      description: l.description,
      category: l.category,
      condition: l.condition,
      brand: l.brand ?? null,
      size: l.size ?? null,
      pricePerDay: l.price * 100,
      deposit: l.deposit * 100,
      area: "camden",
      pickupNotes: l.pickupNotes,
      photos: l.photos,
      availableFrom: toDate(addDays(today, -30)),
      availableTo: toDate(addDays(today, 180)),
      handoverMethods: ["MEET"],
      communityId: "lbs",
      communityOnly: l.membersOnly,
      createdAt: ago(10 - i),
    })),
  });

  for (const p of LBS_POSTS) {
    const createdAt = ago(p.daysAgo);
    await prisma.communityPost.create({
      data: {
        id: p.id,
        communityId: "lbs",
        authorId: p.author,
        type: p.type,
        title: p.title,
        body: p.body,
        neededBy: p.neededIn !== undefined ? toDate(addDays(today, p.neededIn)) : null,
        pricePence: p.price !== undefined ? p.price * 100 : null,
        status: p.status ?? "OPEN",
        createdAt,
        comments: {
          create: (p.comments ?? []).map((c) => ({
            authorId: c.author,
            body: c.body,
            createdAt: new Date(Math.min(createdAt.getTime() + c.hoursLater * 3_600_000, now - 60_000)),
          })),
        },
      },
    });
  }
}
