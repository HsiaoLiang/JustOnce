// Demo content for school and company communities: LBS plus four more London universities and employers.
// Loaded by seedDatabase after users and listings, so it can reference them.

import type { Prisma, PrismaClient } from "@prisma/client";
import { addDays, toDate, type ISODate } from "../../lib/dates";

type SeedCommunity = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  type: "UNIVERSITY" | "COMPANY";
  domains: string[];
  area: string;
  handoverSpot: string;
  description: string;
};

export const COMMUNITIES: SeedCommunity[] = [
  {
    id: "lbs",
    slug: "lbs",
    name: "London Business School",
    shortName: "LBS",
    type: "UNIVERSITY",
    domains: ["london.edu"],
    area: "camden",
    handoverSpot: "Sammy Ofer Centre reception or Sussex Place",
    description:
      "For LBS students and staff around Regent's Park. Borrow suits for recruiting season, black tie for the Gala, cameras for club events, and ask classmates for anything you need before Thursday's exam.",
  },
  {
    id: "imperial",
    slug: "imperial",
    name: "Imperial College London",
    shortName: "Imperial",
    type: "UNIVERSITY",
    domains: ["imperial.ac.uk", "ic.ac.uk"],
    area: "kensington",
    handoverSpot: "Sherfield Building foyer, South Kensington campus",
    description: "Engineers, medics and scientists in South Kensington. Share field-trip kit, cameras for society shoots and camping gear for Easter hikes.",
  },
  {
    id: "ucl",
    slug: "ucl",
    name: "University College London",
    shortName: "UCL",
    type: "UNIVERSITY",
    domains: ["ucl.ac.uk"],
    area: "bloomsbury",
    handoverSpot: "Main Quad, by the Portico steps",
    description: "Bloomsbury's biggest campus. Gowns for the Summer Ball, costumes for society socials and anything else you only need for one night.",
  },
  {
    id: "google-uk",
    slug: "google-uk",
    name: "Google UK",
    shortName: "Google UK",
    type: "COMPANY",
    domains: ["google.com"],
    area: "kings-cross",
    handoverSpot: "King's Cross office lobby (6 Pancras Square)",
    description: "Googlers in King's Cross and Belgrave House. Lend each other offsite kit, cameras for team socials and tents for summer festivals.",
  },
  {
    id: "meta-uk",
    slug: "meta-uk",
    name: "Meta London",
    shortName: "Meta",
    type: "COMPANY",
    domains: ["meta.com", "fb.com"],
    area: "kings-cross",
    handoverSpot: "1 Rathbone Square reception",
    description: "Meta employees around Fitzrovia and King's Cross. Suits for conference talks, party outfits for the holiday do and kit for hack weeks.",
  },
];

/** Demo users who are verified members of each community. */
export const COMMUNITY_MEMBERS: Record<string, string[]> = {
  lbs: ["sophie-clarke", "oliver-bennett", "mei-chen"],
  imperial: ["priya-shah", "tom-hughes", "callum-reid"],
  ucl: ["amara-okafor", "hannah-brooks", "kwame-asante"],
  "google-uk": ["leo-martins", "isla-fraser", "zara-ahmed"],
  "meta-uk": ["daniel-reyes", "ruby-patel"],
};

type SeedCommunityListing = {
  id: string;
  community: string;
  owner: string;
  title: string;
  category: "FORMALWEAR" | "CAMERAS" | "CAMPING" | "COSTUMES" | "CLOTHING" | "ACCESSORIES" | "WATCHES";
  condition: "LIKE_NEW" | "GOOD";
  brand?: string;
  size?: string;
  price: number;
  deposit: number;
  photos: string[];
  description: string;
  pickupNotes: string;
  membersOnly: boolean;
};

const ph = (slug: string, n: number) => Array.from({ length: n }, (_, i) => `/seed/listings/${slug}-${i + 1}.jpg`);

export const COMMUNITY_LISTINGS: SeedCommunityListing[] = [
  // LBS
  { id: "lbs-interview-navy-suit", community: "lbs", owner: "oliver-bennett", title: "Navy interview suit for recruiting season", category: "FORMALWEAR", condition: "LIKE_NEW", brand: "Hugo Boss", size: "40R jacket, 32R trousers", price: 12, deposit: 60, photos: ph("navy-suit", 2), description: "My spare slim navy two-piece from recruiting season. Freshly pressed, comes with a garment bag. Perfect for MBB and banking interviews.", pickupNotes: "Sammy Ofer Centre reception, weekdays 12–2pm.", membersOnly: true },
  { id: "lbs-gala-tuxedo", community: "lbs", owner: "oliver-bennett", title: "Black tie tuxedo for the LBS Gala", category: "FORMALWEAR", condition: "LIKE_NEW", brand: "Moss", size: "40R jacket, 34R trousers", price: 20, deposit: 90, photos: ph("tuxedo", 3), description: "Dinner suit with satin lapels and a silk bow tie. Ideal for the Gala, club dinners and Sloan balls.", pickupNotes: "Sussex Place entrance, evenings after 6pm.", membersOnly: false },
  { id: "lbs-canon-80d-headshots", community: "lbs", owner: "mei-chen", title: "Canon 80D kit for LinkedIn headshots", category: "CAMERAS", condition: "GOOD", brand: "Canon", price: 15, deposit: 120, photos: ph("canon-80d", 3), description: "Canon 80D with 50mm f/1.8, two batteries and a 64GB card. Great for club headshot days in the library courtyard.", pickupNotes: "Library reception, any weekday.", membersOnly: true },
  { id: "lbs-studio-lighting-kit", community: "lbs", owner: "sophie-clarke", title: "Studio lighting kit for club events", category: "CAMERAS", condition: "GOOD", brand: "Neewer", price: 10, deposit: 50, photos: ph("studio-lighting-kit", 2), description: "Two softboxes and stands. Used for Entrepreneurship Club pitch night recordings.", pickupNotes: "Sammy Ofer Centre reception.", membersOnly: false },
  // Imperial
  { id: "imperial-nikon-d750-society", community: "imperial", owner: "priya-shah", title: "Nikon D750 for society photo shoots", category: "CAMERAS", condition: "GOOD", brand: "Nikon", price: 20, deposit: 200, photos: ph("nikon-d750", 2), description: "Full-frame body with a 24–120mm lens. Used for the Photo Soc exhibition and RCSU ball. Two batteries included.", pickupNotes: "Sherfield Building foyer, weekdays after lectures.", membersOnly: true },
  { id: "imperial-dome-tent-field-trip", community: "imperial", owner: "tom-hughes", title: "Two-person dome tent for geology field trips", category: "CAMPING", condition: "GOOD", brand: "Vango", price: 8, deposit: 40, photos: ph("dome-tent", 2), description: "Light, quick to pitch and survived a very wet Dartmoor field trip. Comes with footprint and spare pegs.", pickupNotes: "Royal School of Mines entrance.", membersOnly: false },
  { id: "imperial-hiking-daypack", community: "imperial", owner: "callum-reid", title: "Hiking daypack for the Snowdonia trip", category: "CAMPING", condition: "LIKE_NEW", brand: "Osprey", price: 5, deposit: 30, photos: ph("hiking-daypack", 2), description: "22L daypack with rain cover and hydration sleeve. Ideal for the Fellwanderers weekend.", pickupNotes: "Sherfield Building foyer.", membersOnly: true },
  // UCL
  { id: "ucl-summer-ball-gown", community: "ucl", owner: "hannah-brooks", title: "Red ball gown for the UCL Summer Ball", category: "FORMALWEAR", condition: "LIKE_NEW", brand: "Phase Eight", size: "UK 8", price: 15, deposit: 80, photos: ph("red-ball-gown", 3), description: "Full satin skirt that photographs beautifully on the Quad. Steamed and bagged before every rental.", pickupNotes: "Main Quad, by the Portico steps.", membersOnly: true },
  { id: "ucl-eighties-party-look", community: "ucl", owner: "amara-okafor", title: "80s party outfit for society socials", category: "COSTUMES", condition: "GOOD", price: 6, deposit: 25, photos: ph("eighties-party-look", 2), description: "Neon jacket, leg warmers and accessories. Perfect for the Fresher's themed socials.", pickupNotes: "Student Centre ground floor.", membersOnly: false },
  { id: "ucl-film-camera", community: "ucl", owner: "kwame-asante", title: "35mm film camera for the Slade photo module", category: "CAMERAS", condition: "GOOD", price: 7, deposit: 60, photos: ph("film-camera", 2), description: "Fully manual SLR with a 50mm lens. A roll of Portra included for your first shoot.", pickupNotes: "Main Quad, weekday lunchtimes.", membersOnly: true },
  // Google UK
  { id: "google-sony-a7iii-offsite", community: "google-uk", owner: "leo-martins", title: "Sony A7 III for team offsites", category: "CAMERAS", condition: "GOOD", brand: "Sony", price: 25, deposit: 300, photos: ph("sony-a7iii", 2), description: "Great in low light for evening socials. Comes with 28–70mm lens and two batteries.", pickupNotes: "6 Pancras Square lobby, weekdays.", membersOnly: true },
  { id: "google-bell-tent-festival", community: "google-uk", owner: "isla-fraser", title: "Bell tent for the summer festival", category: "CAMPING", condition: "LIKE_NEW", price: 30, deposit: 150, photos: ph("bell-tent", 2), description: "Five-metre bell tent, sleeps six. Perfect for a team trip to Wilderness or Latitude.", pickupNotes: "King's Cross office lobby — I can drive it over on Friday afternoons.", membersOnly: false },
  { id: "google-silk-tie-talks", community: "google-uk", owner: "zara-ahmed", title: "Silk tie set for conference talks", category: "ACCESSORIES", condition: "LIKE_NEW", price: 3, deposit: 15, photos: ph("silk-tie", 2), description: "Three silk ties in navy, burgundy and green. For when your talk gets accepted to a real conference.", pickupNotes: "Belgrave House reception.", membersOnly: true },
  // Meta
  { id: "meta-check-blazer-keynote", community: "meta-uk", owner: "daniel-reyes", title: "Navy check blazer for keynote talks", category: "CLOTHING", condition: "LIKE_NEW", brand: "Reiss", size: "38R", price: 10, deposit: 50, photos: ph("navy-check-blazer", 2), description: "Smart but not stuffy. Worn once on stage at a dev conference.", pickupNotes: "1 Rathbone Square reception.", membersOnly: true },
  { id: "meta-holiday-party-dress", community: "meta-uk", owner: "ruby-patel", title: "Red floral dress for the holiday party", category: "CLOTHING", condition: "LIKE_NEW", size: "UK 10", price: 12, deposit: 50, photos: ph("red-floral-dress", 2), description: "Midi dress with a flattering wrap waist. Perfect for the December party.", pickupNotes: "1 Rathbone Square reception, after 5pm.", membersOnly: false },
];

type SeedPost = {
  id: string;
  community: string;
  author: string;
  type: "REQUEST" | "OFFER";
  title: string;
  body: string;
  neededIn?: number;
  price?: number;
  daysAgo: number;
  status?: "OPEN" | "FULFILLED";
  comments?: { author: string; body: string; hoursLater: number }[];
};

export const COMMUNITY_POSTS: SeedPost[] = [
  // LBS
  { id: "lbs-post-ba-ii-plus", community: "lbs", author: "mei-chen", type: "REQUEST", title: "Need a TI BA II Plus for the Corporate Finance midterm", body: "Mine died this morning. Need it Thursday 9am–12pm, happy to pay £5 or buy you a coffee at the Hub.", neededIn: 3, price: 5, daysAgo: 0, comments: [{ author: "sophie-clarke", body: "I have a spare one! I'm at Sussex Place until 5pm today.", hoursLater: 2 }] },
  { id: "lbs-post-garment-steamer", community: "lbs", author: "oliver-bennett", type: "REQUEST", title: "Garment steamer before consulting interviews", body: "Anyone in Marylebone or Baker Street with a steamer I can borrow tomorrow afternoon? Final rounds on Friday.", neededIn: 1, daysAgo: 1 },
  { id: "lbs-post-dell-monitor", community: "lbs", author: "mei-chen", type: "OFFER", title: "27-inch Dell USB-C monitor free to borrow this term", body: "Moving out of student accommodation for Term 2 exchange. Free to a classmate who can collect it from Marylebone.", neededIn: 7, price: 0, daysAgo: 2 },
  { id: "lbs-post-graduation-gown", community: "lbs", author: "sophie-clarke", type: "OFFER", title: "Master's gown and hood for graduation photos", body: "Available for the graduation photoshoot weekend. Pick up from the Sammy Ofer Centre.", price: 8, daysAgo: 4, status: "FULFILLED", comments: [{ author: "mei-chen", body: "Took it for Saturday, thanks Sophie!", hoursLater: 5 }] },
  { id: "lbs-post-ski-trip", community: "lbs", author: "oliver-bennett", type: "REQUEST", title: "Ski jacket and goggles for the LBS ski trip", body: "First time skiing, going to Val Thorens with the Ski Club. Size M jacket, any goggles. Will return clean!", neededIn: 20, price: 15, daysAgo: 3, comments: [{ author: "mei-chen", body: "I have goggles you can have for the week.", hoursLater: 4 }] },
  // Imperial
  { id: "imperial-post-arduino", community: "imperial", author: "callum-reid", type: "REQUEST", title: "Arduino starter kit for a design project", body: "Need an Uno with breadboard and sensors for two weeks. Happy to pay a few pounds.", neededIn: 4, price: 10, daysAgo: 1, comments: [{ author: "priya-shah", body: "I have one in my lab locker, message me!", hoursLater: 3 }] },
  { id: "imperial-post-lab-coat", community: "imperial", author: "tom-hughes", type: "OFFER", title: "Spare lab coat and safety goggles", body: "Finished my chemistry modules. Free to anyone who needs them this term.", price: 0, daysAgo: 2 },
  { id: "imperial-post-soldering", community: "imperial", author: "priya-shah", type: "REQUEST", title: "Soldering iron for a weekend", body: "EEE Soc build night on Saturday, mine stopped heating. Need one Friday to Sunday.", neededIn: 2, daysAgo: 0 },
  // UCL
  { id: "ucl-post-graduation-gown", community: "ucl", author: "kwame-asante", type: "REQUEST", title: "Graduation gown for photos next week", body: "Official ceremony is in July but photos are next Tuesday. Size M, BSc gown.", neededIn: 6, price: 10, daysAgo: 1 },
  { id: "ucl-post-projector", community: "ucl", author: "amara-okafor", type: "OFFER", title: "Projector for society film nights", body: "Bought a mini projector for the African-Caribbean Society film night. Happy to lend it to any society.", price: 5, daysAgo: 3, comments: [{ author: "hannah-brooks", body: "Could Film Soc borrow it next Wednesday?", hoursLater: 6 }] },
  { id: "ucl-post-textbooks", community: "ucl", author: "hannah-brooks", type: "OFFER", title: "Year 1 Economics textbooks", body: "Mankiw and Varian, good condition. Borrow them for the term for free.", price: 0, daysAgo: 5, status: "FULFILLED" },
  // Google UK
  { id: "google-post-monitor", community: "google-uk", author: "zara-ahmed", type: "REQUEST", title: "Portable 4K monitor for working from home", body: "Need a portable USB-C monitor for two weeks while my desk setup is being fixed.", neededIn: 3, price: 20, daysAgo: 0, comments: [{ author: "leo-martins", body: "I have a 15-inch ASUS one, can bring it to the office Monday.", hoursLater: 1 }] },
  { id: "google-post-suitcase", community: "google-uk", author: "isla-fraser", type: "OFFER", title: "Cabin suitcase for work trips", body: "Lightweight carry-on with spinner wheels. Free to borrow between my trips.", price: 0, daysAgo: 2 },
  { id: "google-post-costume", community: "google-uk", author: "leo-martins", type: "REQUEST", title: "Halloween costume for the team party", body: "Anything spooky in a size L. Party is next Friday at the King's Cross office.", neededIn: 7, price: 10, daysAgo: 1 },
  // Meta
  { id: "meta-post-standing-desk", community: "meta-uk", author: "ruby-patel", type: "REQUEST", title: "Standing desk converter for a month", body: "Trying out a standing setup at home before I buy one. Anyone near Fitzrovia?", neededIn: 5, price: 15, daysAgo: 1 },
  { id: "meta-post-camera", community: "meta-uk", author: "daniel-reyes", type: "OFFER", title: "Canon DSLR for hack week demo videos", body: "Bring your own SD card, I'll lend the camera and tripod for the week.", price: 0, daysAgo: 2, comments: [{ author: "ruby-patel", body: "Amazing, I'd love it for Thursday's demo!", hoursLater: 2 }] },
];

export async function seedCommunities(prisma: PrismaClient | Prisma.TransactionClient, opts: { today: ISODate; now: number }) {
  const { today, now } = opts;
  const ago = (days: number, hours = 0) => new Date(now - days * 86_400_000 - 3_600_000 + hours * 3_600_000);

  await prisma.community.createMany({ data: COMMUNITIES });

  const domainOf = Object.fromEntries(COMMUNITIES.map((c) => [c.id, c.domains[0]]));
  await prisma.communityMember.createMany({
    data: Object.entries(COMMUNITY_MEMBERS).flatMap(([communityId, members]) =>
      members.map((userId, i) => ({
        userId,
        communityId,
        method: "EMAIL" as const,
        status: "VERIFIED" as const,
        email: `${userId.split("-")[0]}@${domainOf[communityId]}`,
        verifiedAt: ago(30 - i),
      })),
    ),
  });

  const areaOf = Object.fromEntries(COMMUNITIES.map((c) => [c.id, c.area]));
  await prisma.listing.createMany({
    data: COMMUNITY_LISTINGS.map((l, i) => ({
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
      area: areaOf[l.community],
      pickupNotes: l.pickupNotes,
      photos: l.photos,
      availableFrom: toDate(addDays(today, -30)),
      availableTo: toDate(addDays(today, 180)),
      handoverMethods: ["MEET"],
      communityId: l.community,
      communityOnly: l.membersOnly,
      createdAt: ago(14 - (i % 14)),
    })),
  });

  for (const p of COMMUNITY_POSTS) {
    const createdAt = ago(p.daysAgo);
    await prisma.communityPost.create({
      data: {
        id: p.id,
        communityId: p.community,
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
