// Demo content for school and company communities: LBS plus six more London universities and employers.
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
    id: "qmul",
    slug: "qmul",
    name: "Queen Mary University of London",
    shortName: "Queen Mary",
    type: "UNIVERSITY",
    domains: ["qmul.ac.uk"],
    area: "bethnal-green",
    handoverSpot: "Queens' Building foyer, Mile End campus",
    description: "Students and staff from Mile End to Whitechapel. Borrow gowns for the medics' ball, suits for moots and vac schemes, and camping kit for society trips to the Lakes.",
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
  {
    id: "barclays",
    slug: "barclays",
    name: "Barclays Canary Wharf",
    shortName: "Barclays",
    type: "COMPANY",
    domains: ["barclays.com"],
    area: "canary-wharf",
    handoverSpot: "1 Churchill Place reception",
    description: "Colleagues at 1 Churchill Place and around the Wharf. Share suits for client weeks, black tie for the charity gala, and kit for team ski trips and golf days.",
  },
];

/** Demo users who are verified members of each community. */
export const COMMUNITY_MEMBERS: Record<string, string[]> = {
  lbs: ["sophie-clarke", "oliver-bennett", "mei-chen"],
  imperial: ["priya-shah", "tom-hughes", "callum-reid"],
  ucl: ["amara-okafor", "hannah-brooks", "kwame-asante"],
  qmul: ["aisha-rahman", "jack-morrison", "elena-rossi"],
  "google-uk": ["leo-martins", "isla-fraser", "zara-ahmed"],
  "meta-uk": ["daniel-reyes", "ruby-patel"],
  barclays: ["ben-carter", "chloe-evans", "tunde-bakare"],
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

const COMMUNITY_LISTINGS: SeedCommunityListing[] = [
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
  // Queen Mary
  { id: "qmul-white-blazer-dress", community: "qmul", owner: "elena-rossi", title: "White blazer dress for law society dinners", category: "CLOTHING", condition: "LIKE_NEW", size: "UK 10", price: 8, deposit: 40, photos: ph("white-blazer-dress", 3), description: "Sharp double-breasted blazer dress for the Law Society dinner, awards nights and vac scheme socials. Dry-cleaned after every wear.", pickupNotes: "Law building on Mile End Road, weekday afternoons.", membersOnly: true },
  { id: "qmul-four-person-tent", community: "qmul", owner: "jack-morrison", title: "Four-person tent for Hiking Society trips", category: "CAMPING", condition: "GOOD", price: 10, deposit: 60, photos: ph("mh-4p-tent", 2), description: "Pitches in ten minutes and sleeps four friends, or two people and all their kit. Survived two wet weekends in the Lake District without a leak.", pickupNotes: "Mile End campus, by the library entrance.", membersOnly: false },
  { id: "qmul-blue-maxi-dress", community: "qmul", owner: "aisha-rahman", title: "Blue maxi dress for Eid and summer parties", category: "CLOTHING", condition: "LIKE_NEW", size: "UK 12", price: 7, deposit: 35, photos: ph("blue-maxi-dress", 3), description: "Flowing floor-length dress with long sleeves. Light enough for summer garden parties, smart enough for Eid dinners and society formals.", pickupNotes: "Garrod Building, Whitechapel, after 5pm.", membersOnly: false },
  // Google UK
  { id: "google-sony-a7iii-offsite", community: "google-uk", owner: "leo-martins", title: "Sony A7 III for team offsites", category: "CAMERAS", condition: "GOOD", brand: "Sony", price: 25, deposit: 300, photos: ph("sony-a7iii", 2), description: "Great in low light for evening socials. Comes with 28–70mm lens and two batteries.", pickupNotes: "6 Pancras Square lobby, weekdays.", membersOnly: true },
  { id: "google-bell-tent-festival", community: "google-uk", owner: "isla-fraser", title: "Bell tent for the summer festival", category: "CAMPING", condition: "LIKE_NEW", price: 30, deposit: 150, photos: ph("bell-tent", 2), description: "Five-metre bell tent, sleeps six. Perfect for a team trip to Wilderness or Latitude.", pickupNotes: "King's Cross office lobby — I can drive it over on Friday afternoons.", membersOnly: false },
  { id: "google-silk-tie-talks", community: "google-uk", owner: "zara-ahmed", title: "Silk tie set for conference talks", category: "ACCESSORIES", condition: "LIKE_NEW", price: 3, deposit: 15, photos: ph("silk-tie", 2), description: "Three silk ties in navy, burgundy and green. For when your talk gets accepted to a real conference.", pickupNotes: "Belgrave House reception.", membersOnly: true },
  // Meta
  { id: "meta-check-blazer-keynote", community: "meta-uk", owner: "daniel-reyes", title: "Navy check blazer for keynote talks", category: "CLOTHING", condition: "LIKE_NEW", brand: "Reiss", size: "38R", price: 10, deposit: 50, photos: ph("navy-check-blazer", 2), description: "Smart but not stuffy. Worn once on stage at a dev conference.", pickupNotes: "1 Rathbone Square reception.", membersOnly: true },
  { id: "meta-holiday-party-dress", community: "meta-uk", owner: "ruby-patel", title: "Red floral dress for the holiday party", category: "CLOTHING", condition: "LIKE_NEW", size: "UK 10", price: 12, deposit: 50, photos: ph("red-floral-dress", 2), description: "Midi dress with a flattering wrap waist. Perfect for the December party.", pickupNotes: "1 Rathbone Square reception, after 5pm.", membersOnly: false },
  // Barclays
  { id: "barclays-steel-dress-watch", community: "barclays", owner: "ben-carter", title: "Steel dress watch for client meetings", category: "WATCHES", condition: "LIKE_NEW", price: 8, deposit: 150, photos: ph("steel-dress-watch", 3), description: "Understated steel watch with a white dial, on a bracelet that fits a 17–19cm wrist. My graduation present, and it has sat through more client meetings than I have.", pickupNotes: "1 Churchill Place reception, weekdays 8–9am.", membersOnly: true },
  { id: "barclays-scarlet-gala-gown", community: "barclays", owner: "chloe-evans", title: "Scarlet gown for the charity gala", category: "FORMALWEAR", condition: "LIKE_NEW", size: "UK 10", price: 18, deposit: 90, photos: ph("scarlet-train-gown", 3), description: "Dramatic scarlet gown with a short train, made for the gala photo wall. Steamed and bagged, with a matching clutch if you want one.", pickupNotes: "1 Churchill Place, 12th floor, any lunchtime.", membersOnly: false },
  { id: "barclays-sigma-art-lens", community: "barclays", owner: "tunde-bakare", title: "Sigma 18–35mm Art lens for team events", category: "CAMERAS", condition: "GOOD", brand: "Sigma", size: "Canon EF mount", price: 10, deposit: 150, photos: ph("sigma-art-lens", 2), description: "Fast f/1.8 zoom for Canon bodies. Bright enough for dim leaving-do venues and the gala dance floor. Hood and caps included.", pickupNotes: "1 Churchill Place reception, or Deptford at weekends.", membersOnly: true },
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

const COMMUNITY_POSTS: SeedPost[] = [
  // LBS
  {
    id: "lbs-post-ba-ii-plus",
    community: "lbs",
    author: "mei-chen",
    type: "REQUEST",
    title: "Need a TI BA II Plus for the Corporate Finance midterm",
    body: "My BA II Plus finally gave up this morning: the screen fades out halfway through any NPV calculation, which is not ideal three days before the Corporate Finance midterm. New batteries didn't fix it, and the Ryman on Baker Street is out of stock until next week.\n\nI only need one for Thursday, 9am–12pm, and I can bring it straight back after the exam. Happy to pay £5 or buy you a coffee at the Hub. I can collect from anywhere between Sussex Place and Marylebone station. If yours is the Professional model, even better, but the standard one is fine.",
    neededIn: 3,
    price: 5,
    daysAgo: 0,
    comments: [
      { author: "sophie-clarke", body: "I have a spare one! I'm at Sussex Place until 5pm today.", hoursLater: 2 },
      { author: "oliver-bennett", body: "If Sophie's falls through, mine is in my locker. Good luck on Thursday.", hoursLater: 3 },
    ],
  },
  {
    id: "lbs-post-garment-steamer",
    community: "lbs",
    author: "oliver-bennett",
    type: "REQUEST",
    title: "Garment steamer before consulting interviews",
    body: "Final rounds for two consulting firms on Friday, and my suit has spent the week folded in a carry-on after a trip to Edinburgh. The creases are, frankly, embarrassing. Does anyone in Marylebone or around Baker Street have a garment steamer I could borrow tomorrow afternoon?\n\nI'd need it for an evening at most and can return it on Thursday morning before lectures, clean and with the water tank emptied. Happy to give a few pounds or a coffee in return, or a practice case: I've done a lot of case prep this term and I'm glad to run one with you.",
    neededIn: 1,
    daysAgo: 1,
    comments: [
      { author: "mei-chen", body: "Mine is a small travel one but it works. I'll leave it at Sammy Ofer reception under your name.", hoursLater: 3 },
    ],
  },
  {
    id: "lbs-post-dell-monitor",
    community: "lbs",
    author: "mei-chen",
    type: "OFFER",
    title: "27-inch Dell USB-C monitor free to borrow this term",
    body: "I'm off on exchange to HEC for Term 2, so my 27-inch Dell USB-C monitor needs a home until April. One cable charges your laptop and runs the screen, and it has been brilliant for late-night modelling in Excel.\n\nFree to a classmate for the whole term. The only catch is that you'd need to collect it from my flat near Marylebone station by the end of next week. It comes in its original box, so it's easy to carry home in an Uber. Look after it and I'll pick it up when I'm back. Comment below and I'll message you.",
    neededIn: 7,
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "oliver-bennett", body: "That would transform my study group's living room. Could I collect on Saturday?", hoursLater: 5 },
    ],
  },
  {
    id: "lbs-post-graduation-gown",
    community: "lbs",
    author: "sophie-clarke",
    type: "OFFER",
    title: "Master's gown and hood for graduation photos",
    body: "My master's gown and hood from last year are just hanging in my wardrobe, so they may as well be in someone's graduation photos. They're the official LBS ones, a black gown with the hood in the school colours, and they'd fit anyone from about 5'4\" to 6'.\n\nAvailable for the graduation photoshoot weekend and the week either side. £8 for the weekend, and I'll have them freshly steamed. Pick up from the Sammy Ofer Centre reception on Friday afternoon. Please don't leave the hood rolled up in a bag afterwards: it creases badly.",
    price: 8,
    daysAgo: 4,
    status: "FULFILLED",
    comments: [
      { author: "mei-chen", body: "Took it for Saturday, thanks Sophie!", hoursLater: 5 },
    ],
  },
  {
    id: "lbs-post-ski-trip",
    community: "lbs",
    author: "oliver-bennett",
    type: "REQUEST",
    title: "Ski jacket and goggles for the LBS ski trip",
    body: "I signed up for the Ski Club trip to Val Thorens and only realised afterwards that I own nothing remotely waterproof. It's my first time skiing, so I'd rather not buy a full kit before I know whether I like it.\n\nLooking for a ski jacket in size M (I'm 5'11\", average build) and any goggles that aren't scratched. Salopettes with a 32 waist would be a bonus. I'll need everything from the Friday we leave, for nine days. I'll pay £15 for the lot, return it all washed, and promise not to fall over in your jacket more than strictly necessary.",
    neededIn: 20,
    price: 15,
    daysAgo: 3,
    comments: [
      { author: "mei-chen", body: "I have goggles you can have for the week.", hoursLater: 4 },
      { author: "sophie-clarke", body: "My brother left a size M North Face jacket at mine. It's bright orange, so you'll be easy to find on the slopes.", hoursLater: 6 },
    ],
  },
  {
    id: "lbs-post-gala-clutch",
    community: "lbs",
    author: "sophie-clarke",
    type: "REQUEST",
    title: "Clutch bag and earrings for the LBS Gala",
    body: "The LBS Gala is a week on Saturday. I've found a dress, but I have nothing to go with it. I'm after a small black or gold clutch and a pair of statement earrings (pierced or clip-on, I'm not fussy).\n\nI'd need them from Friday afternoon until Sunday. Happy to pay £10 for both, or a bit more for something really special. I can collect from Sussex Place or anywhere in Islington, and everything will come back in the pouch it came in. Photos from the night included free of charge.",
    neededIn: 9,
    price: 10,
    daysAgo: 5,
    comments: [
      { author: "mei-chen", body: "I have gold hoops that would work. I'll bring them to the Hub tomorrow so you can see.", hoursLater: 5 },
    ],
  },
  {
    id: "lbs-post-trek-luggage",
    community: "lbs",
    author: "oliver-bennett",
    type: "OFFER",
    title: "Cabin cases and a luggage scale for trek season",
    body: "With trek season coming up, a few people have asked about luggage. I have two 55cm hard-shell cabin cases with working spinner wheels, and a digital luggage scale that has saved me from budget-airline fees more than once.\n\nFree to borrow for any trek or study trip this term. Just tell me your dates so I don't double-book them. They live at my flat in Shoreditch, but I'm in school most days and can drop them at Sammy Ofer reception. Return them empty and roughly as clean as you got them.",
    neededIn: 4,
    price: 0,
    daysAgo: 6,
    comments: [
      { author: "sophie-clarke", body: "Could I take one case for the Japan trek at the end of the month?", hoursLater: 7 },
    ],
  },
  // Imperial
  {
    id: "imperial-post-arduino",
    community: "imperial",
    author: "callum-reid",
    type: "REQUEST",
    title: "Arduino starter kit for a design project",
    body: "Our second-year design project is a plant-watering robot, and the department kits are all signed out until after reading week. I need an Arduino Uno (a clone is fine), a breadboard and jumper wires, and ideally a soil moisture sensor and a small servo.\n\nIt would be for two weeks from Monday. I'll keep everything in the box and won't solder anything to the board. Happy to pay £10, and you're invited to demo day in the Dyson Building if you want to see your Arduino water a cactus.",
    neededIn: 4,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "priya-shah", body: "I have one in my lab locker, message me!", hoursLater: 3 },
      { author: "tom-hughes", body: "I've got a moisture sensor left over from last year. It's yours if you want it.", hoursLater: 5 },
    ],
  },
  {
    id: "imperial-post-lab-coat",
    community: "imperial",
    author: "tom-hughes",
    type: "OFFER",
    title: "Spare lab coat and safety goggles",
    body: "I've finished my last chemistry lab module, so my lab coat (size M, washed and ironed) and a pair of anti-fog safety goggles are going spare. Both are in good condition: no burns, no stains and no mystery smells.\n\nFree to anyone who needs them for the rest of the term, and you don't need to give them back if you're in labs until summer. I'm at the Royal School of Mines most afternoons and can meet in the foyer. First come, first served, though I'll prioritise a first-year still waiting on the department order.",
    price: 0,
    daysAgo: 2,
  },
  {
    id: "imperial-post-soldering",
    community: "imperial",
    author: "priya-shah",
    type: "REQUEST",
    title: "Soldering iron for a weekend",
    body: "EEE Soc build night is on Saturday and my soldering iron has stopped heating properly: after ten minutes it barely melts solder. A friend and I are building a small synthesiser kit with about sixty joints, so I really need one that works.\n\nIdeally a temperature-controlled iron from Friday evening to Sunday afternoon. A stand and a brass tip cleaner would be lovely, but I'll bring my own solder and flux. I'll return it cleaned and tinned. I can collect from South Kensington or near Hackney Central station.",
    neededIn: 2,
    daysAgo: 0,
    comments: [
      { author: "callum-reid", body: "There's a Hakko in the Robotics Soc cupboard that I can sign out for you.", hoursLater: 3 },
    ],
  },
  {
    id: "imperial-post-walking-boots",
    community: "imperial",
    author: "callum-reid",
    type: "REQUEST",
    title: "Walking boots, size 10, for the Snowdonia weekend",
    body: "The Fellwanderers are heading to Snowdonia for the long weekend, and the plan includes the Watkin Path up Snowdon, which I'm told is not a trainers kind of walk. I'm a UK size 10 with slightly wide feet.\n\nI'd like to borrow proper waterproof walking boots from Thursday to Monday. I'll wear them around Hyde Park a couple of times first so I don't get blisters on the mountain, and I'll clean the mud off before they come back. Paying £12, or I can lend you my 22-litre daypack in return.",
    neededIn: 10,
    price: 12,
    daysAgo: 3,
    comments: [
      { author: "tom-hughes", body: "I'm a 10 and have well broken-in Merrells. I'll leave them at the Sherfield foyer on Wednesday.", hoursLater: 2 },
    ],
  },
  {
    id: "imperial-post-tripod-reflector",
    community: "imperial",
    author: "priya-shah",
    type: "OFFER",
    title: "Spare tripod and reflector for society shoots",
    body: "I've ended up with two tripods after upgrading, so the older Manfrotto (its ball head still locks properly) is free to borrow for society events. I'll throw in a 5-in-1 reflector, which makes a huge difference to portraits on the Queen's Lawn when the sun is out.\n\nBorrow them for up to a week at a time. All I ask is a credit on Instagram if the photos end up on your society's page. I'm usually around the Sherfield Building on Tuesdays and Thursdays, and I'll bring them in if you comment with your dates.",
    price: 0,
    daysAgo: 5,
    comments: [
      { author: "callum-reid", body: "RCSU Science Challenge photos next Thursday? I'd take both.", hoursLater: 4 },
    ],
  },
  {
    id: "imperial-post-calculator",
    community: "imperial",
    author: "tom-hughes",
    type: "REQUEST",
    title: "Casio fx-991EX for a statistics resit",
    body: "I'm resitting a statistics exam next Wednesday and have just found out that the approved list only allows a Casio fx-991EX or similar. My old school calculator isn't on it, and buying one for a single exam feels silly when half the department must have one.\n\nI'd need it from Monday, so I can practise with it, until Wednesday afternoon. I'll pay £5 and return it straight after the exam with the cover on. I can collect from the Royal School of Mines or the library foyer any time after 11am.",
    neededIn: 5,
    price: 5,
    daysAgo: 4,
    status: "FULFILLED",
    comments: [
      { author: "priya-shah", body: "Mine is a 991EX. Good luck! I'll bring it on Monday.", hoursLater: 6 },
    ],
  },
  {
    id: "imperial-post-drone-showreel",
    community: "imperial",
    author: "callum-reid",
    type: "OFFER",
    title: "Mavic Air 2 for society showreels, pilot included",
    body: "I'm a CAA-registered drone pilot with a Mavic Air 2, and a few societies have asked for aerial shots. So here's an offer: I'll fly it for your showreel or event video, and you get the edited clips and the raw files.\n\nBecause of the airspace rules around South Kensington I can't fly everywhere, so this works best for outdoor events further out, like sports days at Harlington, field courses at Silwood Park, or society trips. £20 a session covers batteries and travel. Comment with a date and place and I'll check the flight restrictions first.",
    price: 20,
    daysAgo: 7,
  },
  // UCL
  {
    id: "ucl-post-graduation-gown",
    community: "ucl",
    author: "kwame-asante",
    type: "REQUEST",
    title: "Graduation gown for photos next week",
    body: "My official ceremony isn't until July, but my family are visiting next Tuesday and my mum has her heart set on photos of me in a gown in front of the Portico. The hire company only does ceremony dates, so I'm hoping someone has a BSc gown I could borrow for an afternoon.\n\nSize M, I'm about 5'10\". A hood would be perfect but isn't essential, as nobody in the photos will know. I'd need it from Monday evening to Wednesday morning and can pay £10. I'll collect from the Main Quad and bring it back on a hanger, not stuffed in a rucksack.",
    neededIn: 6,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "hannah-brooks", body: "My housemate graduated last summer. I'll ask if hers is still around.", hoursLater: 5 },
    ],
  },
  {
    id: "ucl-post-projector",
    community: "ucl",
    author: "amara-okafor",
    type: "OFFER",
    title: "Projector for society film nights",
    body: "I bought a mini projector for the African-Caribbean Society film night, and it has been sitting in its box ever since. It's a 1080p model with HDMI and a built-in speaker that's fine for a small room, and it comes with an 80-inch pull-up screen that fits in a tote bag.\n\nAny society can borrow both for £5 a night, which goes to the ACS welfare fund. It's simple to set up and I'll show you how at pickup. I can bring it to the Student Centre or the Main Quad. Please book a few days ahead, as it gets busy around exam season.",
    price: 5,
    daysAgo: 3,
    comments: [
      { author: "hannah-brooks", body: "Could Film Soc borrow it next Wednesday?", hoursLater: 6 },
      { author: "amara-okafor", body: "Yes! It's yours from Wednesday lunchtime.", hoursLater: 8 },
    ],
  },
  {
    id: "ucl-post-textbooks",
    community: "ucl",
    author: "hannah-brooks",
    type: "OFFER",
    title: "Year 1 Economics textbooks",
    body: "Clearing out my shelves now that I'm on final-year modules. I have Mankiw's Principles of Economics and Varian's Intermediate Microeconomics, both in good condition, with a few light pencil notes in the margins.\n\nFree to borrow for the whole term. If you're a first-year economist they'll save you the best part of £100. Collect from the Student Centre ground floor, or near Clapham Common at weekends. When you're done, please pass them on to the next person on the board rather than giving them back to me.",
    price: 0,
    daysAgo: 5,
    status: "FULFILLED",
    comments: [
      { author: "kwame-asante", body: "Took Varian for my micro module, thank you!", hoursLater: 9 },
    ],
  },
  {
    id: "ucl-post-summer-ball-suit",
    community: "ucl",
    author: "kwame-asante",
    type: "REQUEST",
    title: "Dinner suit for the Summer Ball",
    body: "Summer Ball tickets went on sale yesterday, and I panic-bought two before checking whether I own anything black tie. I don't. I'm 5'10\" with a 40R jacket and a 32 waist, and I'd love a dinner suit that doesn't look like it came from a fancy-dress shop.\n\nIt's for the Friday of the ball, and I can collect on the Thursday. I'll pay £20, have it dry-cleaned afterwards if it needs it, and look after it as if it were mine (better, actually). A self-tie bow tie would be a bonus, so I can finally learn how to tie one.",
    neededIn: 12,
    price: 20,
    daysAgo: 2,
    comments: [
      { author: "amara-okafor", body: "I can lend you a bow tie and show you how to tie it. The suit you'll have to find elsewhere!", hoursLater: 3 },
    ],
  },
  {
    id: "ucl-post-costume-rail",
    community: "ucl",
    author: "amara-okafor",
    type: "OFFER",
    title: "Costume rail for society themed socials",
    body: "I style events for a living, and my flat in Peckham has turned into a costume shop: 1920s flapper dresses, a dozen sequinned jackets, feather boas, cowboy hats and an embarrassing number of wigs. If your society has a themed social coming up, come and raid it.\n\n£3 per outfit for the night, and every penny goes to RAG. I'll bring a rail to the Student Centre on Thursdays from 12 to 2pm so you can try things on. Please return everything within three days, and tell me if something rips: I can fix most things, but only if I know about them.",
    price: 3,
    daysAgo: 4,
    comments: [
      { author: "kwame-asante", body: "Hip-Hop Society's 90s night is on the 21st. Do you have bucket hats?", hoursLater: 2 },
      { author: "amara-okafor", body: "About six of them!", hoursLater: 4 },
    ],
  },
  {
    id: "ucl-post-sewing-machine",
    community: "ucl",
    author: "hannah-brooks",
    type: "REQUEST",
    title: "Sewing machine for an evening to take up a hem",
    body: "I'm lending one of my ball gowns to a friend for the Summer Ball, but she's a few inches shorter than me, so the hem needs taking up (temporarily; I'd like it back as it was). Does anyone have a sewing machine I could borrow for an evening?\n\nAny basic machine is fine as long as it does a straight stitch and has a needle that can handle satin. I'll bring my own thread. I can collect from the Main Quad or the Student Centre and return it the next day. Paying £8, plus a slice of the lemon drizzle I'm making for pre-drinks.",
    neededIn: 3,
    price: 8,
    daysAgo: 0,
    comments: [
      { author: "amara-okafor", body: "I have a Brother machine at home. I'll bring it on Thursday.", hoursLater: 1 },
    ],
  },
  {
    id: "ucl-post-dj-kit",
    community: "ucl",
    author: "kwame-asante",
    type: "OFFER",
    title: "DJ controller and speakers for socials",
    body: "I DJ at weekends, so I have a Pioneer DDJ-400 controller and a pair of powered speakers that are loud enough for a basement bar but won't get you a noise complaint. Good for society socials, birthday parties and flat-warmings.\n\n£15 a night for the lot, cables included. If you've never used a controller, I'll set up a playlist so you can just press play, or I'll DJ myself for a small fee and a free drink. I'm based in Dalston but can bring everything to Bloomsbury in an Uber if you split the fare.",
    price: 15,
    daysAgo: 6,
    comments: [
      { author: "hannah-brooks", body: "Booking you for the Economics Society end-of-term party!", hoursLater: 5 },
    ],
  },
  // Queen Mary
  {
    id: "qmul-post-moot-suit",
    community: "qmul",
    author: "elena-rossi",
    type: "REQUEST",
    title: "Black suit for the national mooting final",
    body: "We've made it to the final of a national mooting competition, which takes place in a real courtroom at the Royal Courts of Justice. I've just realised the dress code is court dress: dark suit, white shirt, nothing flashy. My only suit is grey and has seen better days.\n\nI'm looking for a black or very dark navy women's suit, UK 10 jacket and UK 10 trousers or skirt, from next Wednesday to Friday. I'll pay £15 and have it dry-cleaned before it comes back. I can collect from the Mile End campus or the Law building on Mile End Road.",
    neededIn: 6,
    price: 15,
    daysAgo: 0,
    comments: [
      { author: "aisha-rahman", body: "My interview suit is black and a size 10. Want to try it on at the Queens' Building tomorrow?", hoursLater: 2 },
    ],
  },
  {
    id: "qmul-post-hiking-kit",
    community: "qmul",
    author: "jack-morrison",
    type: "OFFER",
    title: "Tents, mats and a stove for the Lake District trip",
    body: "The Hiking Society trip to the Lake District is nearly full, and a few people have said they can't afford a tent just for one weekend. I have two 2-person tents, a 4-person tent, three sleeping mats and a gas stove with a pan set, all dry and in good working order.\n\nFree for anyone on the trip. Tell me what you need in the comments and I'll bring it to the coach at Mile End on Friday morning. Please air the tents out properly when you get back: they go mouldy if they're packed away wet, and I'd like to use them again.",
    neededIn: 9,
    price: 0,
    daysAgo: 1,
    comments: [
      { author: "elena-rossi", body: "Could I have a mat and share the 4-person tent with Aisha?", hoursLater: 3 },
      { author: "aisha-rahman", body: "Yes please, count me in for the big tent.", hoursLater: 4 },
    ],
  },
  {
    id: "qmul-post-medics-ball",
    community: "qmul",
    author: "aisha-rahman",
    type: "REQUEST",
    title: "Floor-length gown for the medics' ball",
    body: "The Barts and The London ball is in two weeks, and after twelve-hour placement shifts I'm in no state to go dress shopping. I'm a UK 12 and 5'6\", and I'd love something floor-length in a jewel tone: emerald, sapphire or a deep red.\n\nI'd need it from Friday afternoon to Sunday. Happy to pay £20 and have it professionally cleaned. I'm in Whitechapel during the week, so I can collect from the Garrod Building, or from the Mile End campus on Fridays.",
    neededIn: 11,
    price: 20,
    daysAgo: 2,
    comments: [
      { author: "elena-rossi", body: "I have a navy satin one in a 12. I'll send you a photo tonight.", hoursLater: 6 },
    ],
  },
  {
    id: "qmul-post-law-textbooks",
    community: "qmul",
    author: "elena-rossi",
    type: "OFFER",
    title: "First-year law textbooks, free for the year",
    body: "I have a full set of first-year law textbooks I no longer use: Contract, Tort, Criminal and Public Law, all in the editions on this year's reading lists. There's some highlighting, but every page is there.\n\nFree to borrow for the year if you're a Queen Mary first-year. They're heavy, so bring a rucksack or a friend. I'm in the Law building most afternoons, or I can meet you at the Mile End library entrance. When you're finished, please pass them on to next year's first-years.",
    price: 0,
    daysAgo: 3,
  },
  {
    id: "qmul-post-bike",
    community: "qmul",
    author: "jack-morrison",
    type: "REQUEST",
    title: "Bike for three weeks while mine is repaired",
    body: "Someone took a fancy to my front wheel outside the library last week, and the bike shop on Mile End Road can't fix it for three weeks. I cycle in from Stratford every day, and the Central line at 8.30am is not a good way to start the morning.\n\nI'm looking to borrow any road or hybrid bike with a medium frame (I'm 5'11\") for three weeks. I'll use my own lock and lights, keep it indoors overnight and have it serviced before it comes back. Paying £10 a week. I can collect from Mile End or Stratford.",
    neededIn: 2,
    price: 10,
    daysAgo: 4,
    comments: [
      { author: "aisha-rahman", body: "My brother's hybrid is in our hallway doing nothing. Let me ask him.", hoursLater: 5 },
    ],
  },
  {
    id: "qmul-post-osce-kit",
    community: "qmul",
    author: "aisha-rahman",
    type: "OFFER",
    title: "Stethoscope and OSCE kit for medics and dentists",
    body: "I've just upgraded my stethoscope, so my old Littmann Classic III is free to borrow, along with a pen torch, a tendon hammer and the set of OSCE revision cards that got me through second year.\n\nPerfect if your own kit is still in the post, or if you want to practise examinations with friends before your OSCEs. Borrow it for up to a month. I'm at the Garrod Building most days. Please clean the earpieces and diaphragm with an alcohol wipe before handing it back.",
    price: 0,
    daysAgo: 5,
    status: "FULFILLED",
    comments: [
      { author: "jack-morrison", body: "My flatmate is borrowing this for her first OSCE. Thanks so much, Aisha.", hoursLater: 7 },
    ],
  },
  {
    id: "qmul-post-gopro",
    community: "qmul",
    author: "jack-morrison",
    type: "REQUEST",
    title: "GoPro to film the novice regatta",
    body: "The boat club's novice crews are racing at the Royal Docks next Saturday, and I've promised the coach some footage for technique reviews. I need a GoPro (Hero 8 or newer) or a similar waterproof action camera, plus a chest or head mount if you have one.\n\nI'd collect on Friday and return it on Sunday with the footage wiped. Paying £10. It'll be on a leash the whole time, but if it somehow ends up in the dock, I'll replace it. I can meet at the Mile End campus or the Stratford Westfield entrance.",
    neededIn: 8,
    price: 10,
    daysAgo: 6,
  },
  // Google UK
  {
    id: "google-post-monitor",
    community: "google-uk",
    author: "zara-ahmed",
    type: "REQUEST",
    title: "Portable 4K monitor for working from home",
    body: "My home desk setup is out of action for two weeks while the flat is rewired, and working on a 13-inch laptop screen is slowly ruining my neck. I'm after a portable USB-C monitor, 15 or 16 inches, that I can carry between home and the office.\n\nI'd need it from Thursday for two weeks. Happy to pay £20, and I'll keep it in its sleeve. I'm in King's Cross most days, usually on the fourth floor of 6 Pancras Square, so I can collect from the lobby whenever suits you.",
    neededIn: 3,
    price: 20,
    daysAgo: 0,
    comments: [
      { author: "leo-martins", body: "I have a 15-inch ASUS one, can bring it to the office Monday.", hoursLater: 1 },
    ],
  },
  {
    id: "google-post-suitcase",
    community: "google-uk",
    author: "isla-fraser",
    type: "OFFER",
    title: "Cabin suitcase for work trips",
    body: "I travel for work about once a month, and the rest of the time my lightweight cabin case sits on top of the wardrobe. It's a 55cm carry-on with spinner wheels and a compression pad, and it has fitted in every overhead locker I've tried.\n\nFree to borrow between my trips. I'm away the first week of every month, so it's free the rest of the time. I can bring it to the King's Cross lobby or Belgrave House. Please empty the pockets before you give it back (I once found someone's passport in a borrowed bag).",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "zara-ahmed", body: "Could I borrow it for the Dublin offsite on the 19th?", hoursLater: 6 },
    ],
  },
  {
    id: "google-post-costume",
    community: "google-uk",
    author: "leo-martins",
    type: "REQUEST",
    title: "Halloween costume for the team party",
    body: "Our team Halloween party is next Friday at the King's Cross office, and I've left it far too late. Anything spooky in a size L: a vampire cape, a skeleton onesie, a convincing zombie outfit. I'm not fussy, as long as it isn't a sexy pumpkin.\n\nI'd collect on Thursday after work and return it on Monday, washed if it's machine washable. Paying £10. Bonus points for anything that leaves my hands free, as I'm also the unofficial party photographer and will be carrying a camera all night.",
    neededIn: 7,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "zara-ahmed", body: "I have a Dracula cape with a very high collar. It's a bit dramatic, but so are you.", hoursLater: 3 },
    ],
  },
  {
    id: "google-post-clothes-rails",
    community: "google-uk",
    author: "isla-fraser",
    type: "REQUEST",
    title: "Clothes rails for the office clothes swap",
    body: "I'm organising a clothes swap in the King's Cross atrium on the Thursday after next, and I already have about forty donations. What I don't have is anywhere to hang them. Does anyone own a clothes rail or two they could lend for the day?\n\nCollapsible ones are ideal, so I can wheel them up from the loading bay. I'd pick them up the day before and have them back to you by Friday morning. There's no budget, as it's a charity event, but everyone who lends something gets first pick of the rails before we open the doors.",
    neededIn: 8,
    daysAgo: 3,
    comments: [
      { author: "leo-martins", body: "I have a rolling rail from my photo studio. It's yours for the day.", hoursLater: 4 },
    ],
  },
  {
    id: "google-post-camera-bag",
    community: "google-uk",
    author: "leo-martins",
    type: "OFFER",
    title: "Camera backpack and travel tripod for offsites",
    body: "After years of gig photography I've ended up with more camera bags than cameras. I can lend a camera backpack (it fits a body, three lenses and a 16-inch laptop) and a compact travel tripod to anyone shooting an offsite, a conference or their holiday.\n\nFree to borrow for up to two weeks. I usually bring kit into King's Cross on Mondays and Wednesdays, so tell me which day suits and I'll leave it at the lobby desk with your name on it. If you need a camera too, my Sony A7 III is in our community items.",
    price: 0,
    daysAgo: 5,
    comments: [
      { author: "zara-ahmed", body: "Taking the tripod for the Lisbon offsite, thanks Leo!", hoursLater: 6 },
    ],
  },
  {
    id: "google-post-mehndi-outfit",
    community: "google-uk",
    author: "zara-ahmed",
    type: "REQUEST",
    title: "Green or gold outfit for a friend's mehndi",
    body: "My best friend's wedding is in Birmingham in three weeks, and I've just been told the mehndi has a colour theme: everyone in green or gold. Everything I own is pink. I'm looking for a lehenga or a sharara set in green or gold, UK size 10.\n\nI'd need it for the weekend of the 6th, collecting on the Thursday and returning it the following Tuesday after steaming. Happy to pay £30 and cover dry cleaning if it needs it. I live in Wembley and come into King's Cross three days a week, so I can collect from either.",
    neededIn: 14,
    price: 30,
    daysAgo: 4,
    comments: [
      { author: "isla-fraser", body: "I have a gold dupatta that would work with something plain. Happy to lend it.", hoursLater: 9 },
    ],
  },
  {
    id: "google-post-talk-outfits",
    community: "google-uk",
    author: "isla-fraser",
    type: "OFFER",
    title: "Blazers and styling for your first conference talk",
    body: "When I'm not at Google I work as a stylist, and I've noticed how many people panic about what to wear for their first big conference talk. I have a rail of blazers in sizes 6 to 16, a few smart shirts and some neutral trousers that look good under stage lighting.\n\nBorrow anything for free for your talk, and if you like, I'll spend twenty minutes helping you put together an outfit that won't wash out on camera. I'm at Belgrave House on Tuesdays and King's Cross on Thursdays. Book a slot in the comments.",
    price: 0,
    daysAgo: 7,
    status: "FULFILLED",
    comments: [
      { author: "zara-ahmed", body: "Booked you for Thursday before my talk rehearsal. Thank you!", hoursLater: 2 },
    ],
  },
  // Meta
  {
    id: "meta-post-standing-desk",
    community: "meta-uk",
    author: "ruby-patel",
    type: "REQUEST",
    title: "Standing desk converter for a month",
    body: "Working at my kitchen table has given me lower-back pain, and before I spend £300 on a standing desk I'd like to see whether I actually use one. Does anyone have a desk converter, the kind that sits on top of a normal desk, that I could try for a month?\n\nIdeally it fits a laptop and an external monitor side by side. I live in Chelsea but I'm at Rathbone Square three days a week, so I can collect from the office or anywhere around Fitzrovia. Paying £15 for the month, and I'll bring it back in its box.",
    neededIn: 5,
    price: 15,
    daysAgo: 1,
    comments: [
      { author: "daniel-reyes", body: "Ours has been gathering dust since we moved. I'll bring it in on Tuesday.", hoursLater: 5 },
    ],
  },
  {
    id: "meta-post-camera",
    community: "meta-uk",
    author: "daniel-reyes",
    type: "OFFER",
    title: "Canon DSLR for hack week demo videos",
    body: "Hack week is coming up, and every team needs a demo video. I have a Canon DSLR with an 18–135mm lens, a decent tripod and an on-camera microphone, which is more than enough for a two-minute demo that doesn't look like it was filmed on a potato.\n\nFree to borrow for the week; just bring your own SD card. If you're not sure about the settings, I'll give you a five-minute crash course at pickup. I'll leave everything at Rathbone Square reception, first come, first served. Please charge the batteries before you give it back.",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "ruby-patel", body: "Amazing, I'd love it for Thursday's demo!", hoursLater: 2 },
    ],
  },
  {
    id: "meta-post-velvet-blazer",
    community: "meta-uk",
    author: "daniel-reyes",
    type: "REQUEST",
    title: "Velvet blazer for the holiday party",
    body: "This year's holiday party theme is winter glamour, which apparently rules out the navy suit I've worn to every work event for three years. I'd love to borrow a velvet dinner jacket or blazer in dark green or burgundy, size 40R.\n\nI'd need it from the Thursday before the party until the Monday after. Paying £15, and I'll have it professionally cleaned. I'm in Camden, near the Northern line, so I can pick up from anywhere in north London or from the office.",
    neededIn: 18,
    price: 15,
    daysAgo: 3,
    comments: [
      { author: "ruby-patel", body: "I have a burgundy velvet bow tie that would go with whatever you find.", hoursLater: 4 },
    ],
  },
  {
    id: "meta-post-video-kit",
    community: "meta-uk",
    author: "ruby-patel",
    type: "OFFER",
    title: "Ring light and lapel mics for recording talks",
    body: "I made a lot of video content when I worked in fashion PR, so I still have an 18-inch ring light, two wireless lapel mics that plug into a phone, and a small green screen. They're handy for internal talks, onboarding videos, or anything you'd rather not film in a meeting room under fluorescent lights.\n\nFree to borrow for a week at a time, and everything fits in one tote bag. I'm at Rathbone Square on Mondays, Wednesdays and Thursdays, and I'll leave it all with reception if you reply with the dates you need.",
    price: 0,
    daysAgo: 4,
    comments: [
      { author: "daniel-reyes", body: "Could I get the mics for our team all-hands recording on Wednesday?", hoursLater: 3 },
    ],
  },
  {
    id: "meta-post-moving-boxes",
    community: "meta-uk",
    author: "daniel-reyes",
    type: "OFFER",
    title: "Moving boxes and a folding trolley, free",
    body: "We've just moved flats, and I now have twenty flat-packed moving boxes, a roll of bubble wrap and a folding trolley that got everything up four flights of stairs. Rather than recycle the boxes, I'd love someone else to use them.\n\nFree to anyone moving in the next month. You'd need to collect from Camden, and ideally take the lot. If you're moving within London and want an extra pair of hands on the day, I'm reasonably strong and very motivated by pizza.",
    price: 0,
    daysAgo: 6,
    status: "FULFILLED",
    comments: [
      { author: "ruby-patel", body: "Took the lot for my move, thank you Daniel!", hoursLater: 8 },
    ],
  },
  {
    id: "meta-post-ski-outfit",
    community: "meta-uk",
    author: "ruby-patel",
    type: "REQUEST",
    title: "Ski jacket and salopettes for the team trip",
    body: "Our team is off to Morzine in January, and it will be my first time skiing. I'd rather not buy an expensive ski outfit before I know whether I like it, so I'm looking for a ski jacket and salopettes in a UK 10 (or a women's S/M), plus gloves if you have them.\n\nI'd need them from the Friday we fly until the following Sunday, and everything will come back washed. Paying £25, more if it's really good kit. I'm at Rathbone Square most days, or I can collect from anywhere in west London.",
    neededIn: 25,
    price: 25,
    daysAgo: 5,
  },
  {
    id: "meta-post-party-dresses",
    community: "meta-uk",
    author: "ruby-patel",
    type: "OFFER",
    title: "Party dresses for the holiday party",
    body: "Sample sales got the better of me years ago, so I have a rail of party dresses in sizes 8 to 12 that have each been worn once at most: sequins, velvet, and a few classic black ones for anyone who doesn't want to stand out.\n\nWith the holiday party coming up, borrow one for £8 to cover the dry cleaning. Come and look at the rail at Rathbone Square on Wednesday lunchtime, or tell me your size and I'll send photos. My red floral midi is already in our community items if you'd rather book it straight away.",
    price: 8,
    daysAgo: 7,
    comments: [
      { author: "daniel-reyes", body: "Sending my partner your way. She's been stressing about this for a week.", hoursLater: 6 },
    ],
  },
  // Barclays
  {
    id: "barclays-post-second-suit",
    community: "barclays",
    author: "ben-carter",
    type: "REQUEST",
    title: "Second suit for a week of client meetings",
    body: "Three months into the graduate scheme, I've just been put on a deal team with client meetings every day next week. I own one suit. It's a good suit, but not good enough to wear five days in a row in front of the same people.\n\nI'm looking for a dark navy or charcoal suit, 40R jacket and 32 waist, from Sunday to the following Saturday. Paying £20, and I'll have it dry-cleaned before it comes back. I'm at 1 Churchill Place every day and live in Greenwich, so the DLR makes pickup easy.",
    neededIn: 2,
    price: 20,
    daysAgo: 0,
    comments: [
      { author: "tunde-bakare", body: "My spare charcoal one is a 40R. I'll bring it in on Friday.", hoursLater: 3 },
    ],
  },
  {
    id: "barclays-post-gala-wardrobe",
    community: "barclays",
    author: "chloe-evans",
    type: "OFFER",
    title: "Black tie outfits for the charity gala",
    body: "I organise the charity gala every year, and every year someone messages me in a panic two days beforehand because they have nothing to wear. So this year I'm opening my wardrobe early: six floor-length gowns in sizes 8 to 14, two clutch bags and a box of earrings.\n\n£10 per outfit, and all the money goes to this year's charity partner. Come and look at the rail on the 12th floor on Wednesday lunchtime, or comment with your size and I'll send photos. Book early: the emerald sequinned one always goes first.",
    neededIn: 3,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "ben-carter", body: "Do you have anything for men? Asking for a friend (me).", hoursLater: 2 },
      { author: "chloe-evans", body: "Ask Tunde, I'm told he has a drawer full of bow ties.", hoursLater: 3 },
    ],
  },
  {
    id: "barclays-post-camera-kit",
    community: "barclays",
    author: "tunde-bakare",
    type: "OFFER",
    title: "Camera kit for team events and leaving dos",
    body: "Weekend wedding photographer here. Between weddings, I have a spare Canon body, a 50mm f/1.8 and a speedlight that are mostly gathering dust. They're great for team events, leaving dos or the gala, where phone photos never quite capture the night.\n\nFree to borrow for team events. I'll give you a five-minute lesson on the settings so you don't come back with a hundred blurry photos. I'm at 1 Churchill Place all week, and around Deptford and Greenwich at weekends. My Sigma Art lens is in our community items if you want something faster.",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "chloe-evans", body: "Could I borrow it for the gala? The agency photographer only covers the first two hours.", hoursLater: 5 },
    ],
  },
  {
    id: "barclays-post-golf-clubs",
    community: "barclays",
    author: "ben-carter",
    type: "REQUEST",
    title: "Golf clubs for the client golf day",
    body: "I've been invited to a client golf day in Hertfordshire, which is great for my career and terrible for my ego, as the last time I played golf was on holiday years ago. I'd rather not buy clubs before I know whether I enjoy it.\n\nI'm looking for a full set of right-handed clubs with a bag, plus a few balls I can lose without guilt. I'd need them for the Friday and would collect on Thursday after work. Paying £25, and I'll buy you a pint afterwards to report back on how badly it went.",
    neededIn: 10,
    price: 25,
    daysAgo: 3,
    comments: [
      { author: "tunde-bakare", body: "My dad's old set is in my garage. Not fancy, but complete.", hoursLater: 4 },
    ],
  },
  {
    id: "barclays-post-quiz-night",
    community: "barclays",
    author: "chloe-evans",
    type: "REQUEST",
    title: "Projector and speaker for the team quiz night",
    body: "I've volunteered to host our floor's quiz night next Thursday in the 3rd-floor breakout space, which has neither a screen nor speakers. I need a projector that works with a laptop over HDMI and a Bluetooth speaker loud enough for about sixty people.\n\nI'd collect on Wednesday after work and return everything on Friday morning. Paying £10, and your team gets a bonus point (I'm completely open to bribery). I can pick up from anywhere in Canary Wharf or along the Jubilee line.",
    neededIn: 4,
    price: 10,
    daysAgo: 4,
    comments: [
      { author: "tunde-bakare", body: "I have a big Bose speaker. The projector is someone else's problem.", hoursLater: 2 },
    ],
  },
  {
    id: "barclays-post-cufflinks",
    community: "barclays",
    author: "tunde-bakare",
    type: "REQUEST",
    title: "Cufflinks and a pocket square for the gala",
    body: "The charity gala is a week on Friday, and I've finally got a dinner suit that fits. Unfortunately, my only cufflinks are the plastic ones that came with the shirt. I'm after a pair of plain silver or mother-of-pearl cufflinks and a white pocket square.\n\nThey're for the night itself: I'd collect on the Thursday and return them on the Monday. £5 or a drink at the gala. They'll live in a box, not loose in my pocket, because I've lost a cufflink before and I'm still not over it.",
    neededIn: 9,
    price: 5,
    daysAgo: 5,
    status: "FULFILLED",
    comments: [
      { author: "ben-carter", body: "I have silver knot ones from my graduation. You're welcome to them.", hoursLater: 3 },
    ],
  },
  {
    id: "barclays-post-ski-kit",
    community: "barclays",
    author: "chloe-evans",
    type: "OFFER",
    title: "Ski jackets, helmet and goggles for the team trip",
    body: "After three ski seasons I have more kit than one person needs: two ski jackets (women's S and M), salopettes in a size 10, a medium helmet and two pairs of goggles. If you're going on the team ski trip in February and don't want to buy everything for one week, borrow mine.\n\nFree, on the understanding that everything comes back dry and not stuffed in a bin bag. I'm on the 12th floor at 1 Churchill Place. Let me know what you need and your sizes, and I'll bring it in the week before you go.",
    price: 0,
    daysAgo: 7,
  },
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
