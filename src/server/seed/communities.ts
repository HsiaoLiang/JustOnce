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
    body: "My BA II Plus has chosen violence 💀 The screen fades to nothing halfway through any NPV calculation, which is a bold move three days before the Corporate Finance midterm. New batteries didn't help, and Ryman on Baker Street is sold out until next week.\n\nI only need it Thursday 9am–12pm, and it comes straight back after the exam. £5 or a coffee at the Hub, your choice ☕ I can collect anywhere between Sussex Place and Marylebone. The Professional model would be a dream, but honestly I'll take anything that turns on 🙏",
    neededIn: 3,
    price: 5,
    daysAgo: 0,
    comments: [
      { author: "sophie-clarke", body: "I have a spare one!! I'm at Sussex Place until 5pm today 🙋‍♀️", hoursLater: 2 },
      { author: "mei-chen", body: "Sophie you absolute legend. On my way 🏃‍♀️", hoursLater: 3 },
      { author: "oliver-bennett", body: "Backup plan: mine's in my locker. Good luck Thursday, may your cash flows be positive.", hoursLater: 4 },
    ],
  },
  {
    id: "lbs-post-garment-steamer",
    community: "lbs",
    author: "oliver-bennett",
    type: "REQUEST",
    title: "Garment steamer, urgently. My suit looks like a crisp packet",
    body: "Final rounds with two consulting firms on Friday. My suit has spent the week folded in a carry-on after a trip to Edinburgh, and it now has more creases than a Year 1 case framework.\n\nDoes anyone around Marylebone or Baker Street have a garment steamer I could borrow tomorrow afternoon? Back Thursday morning, tank emptied, no drama. In return: a coffee, a few quid, or a full mock case in which I play the world's most difficult partner. Your call.",
    neededIn: 1,
    daysAgo: 1,
    comments: [
      { author: "mei-chen", body: "Mine's a tiny travel one but it's mighty 💪 Leaving it at Sammy Ofer reception with your name on it.", hoursLater: 3 },
      { author: "oliver-bennett", body: "Collected. My suit and I are both very grateful.", hoursLater: 6 },
    ],
  },
  {
    id: "lbs-post-dell-monitor",
    community: "lbs",
    author: "mei-chen",
    type: "OFFER",
    title: "Free 27\" Dell monitor for the whole of Term 2 🖥️",
    body: "Off to HEC on exchange for Term 2 🇫🇷 so my 27-inch Dell USB-C monitor needs a foster home until April. One cable charges your laptop AND runs the screen. It has survived some truly unhinged 2am Excel models.\n\nFree for the term. The only catch: you collect it from my flat near Marylebone station by the end of next week (it's in the original box, so one Uber and you're sorted). Look after it, don't let your flatmate game on it 24/7, and I'll pick it up when I'm back. Comment and I'll DM you!",
    neededIn: 7,
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "oliver-bennett", body: "This would transform my study group's living room. Saturday?", hoursLater: 5 },
      { author: "mei-chen", body: "Saturday works 👍", hoursLater: 6 },
    ],
  },
  {
    id: "lbs-post-graduation-gown",
    community: "lbs",
    author: "sophie-clarke",
    type: "OFFER",
    title: "Master's gown + hood for grad photos 🎓",
    body: "My master's gown and hood are living in the back of my wardrobe, which feels like a waste. They belong in someone's graduation photos ✨ They're the official LBS ones (black gown, hood in the school colours) and would fit anyone from about 5'4\" to 6'.\n\n£8 for the photoshoot weekend, and I'll steam them first. Pick up from Sammy Ofer reception on Friday afternoon. One request: please don't roll the hood up in a bag afterwards, it creases like nobody's business 🙃\n\nEDIT: taken for this weekend, thanks all! 💛",
    price: 8,
    daysAgo: 4,
    status: "FULFILLED",
    comments: [
      { author: "mei-chen", body: "Took it for Saturday and my mum cried at the photos 😭 Thank you Sophie!", hoursLater: 5 },
    ],
  },
  {
    id: "lbs-post-ski-trip",
    community: "lbs",
    author: "oliver-bennett",
    type: "REQUEST",
    title: "Ski jacket and goggles for Val Thorens (first-timer, be gentle)",
    body: "I signed up for the Ski Club trip to Val Thorens and only afterwards realised I own nothing remotely waterproof. It's my first time skiing, so I'd rather not spend £400 on kit before finding out whether I'm a natural or a cautionary tale.\n\nLooking for:\n• a ski jacket, size M (5'11\", average build)\n• goggles without scratches\n• salopettes, 32 waist (bonus round)\n\nNine days from the Friday we leave. £15 for the lot, everything comes back washed, and I promise to fall over in your jacket no more than strictly necessary.",
    neededIn: 20,
    price: 15,
    daysAgo: 3,
    comments: [
      { author: "mei-chen", body: "Goggles are yours for the week ⛷️", hoursLater: 4 },
      { author: "sophie-clarke", body: "My brother left a size M North Face jacket at mine. It's BRIGHT orange, so mountain rescue will find you in seconds 🧡", hoursLater: 6 },
      { author: "oliver-bennett", body: "Perfect. Safety first, style a close second.", hoursLater: 7 },
    ],
  },
  {
    id: "lbs-post-gala-clutch",
    community: "lbs",
    author: "sophie-clarke",
    type: "REQUEST",
    title: "Clutch + statement earrings for the Gala 💃",
    body: "Gala is a week on Saturday!! I have the dress 🎉 I have nothing to go with the dress 😩\n\nLooking for a small black or gold clutch and some statement earrings (pierced or clip-on, I'm not fussy). I need them from Friday afternoon to Sunday. £10 for both, or more for something truly special. I can collect from Sussex Place or anywhere in Islington, and everything goes back in its pouch, I promise. Bonus: you get photos of your earrings having the night of their lives 📸",
    neededIn: 9,
    price: 10,
    daysAgo: 5,
    comments: [
      { author: "mei-chen", body: "I have gold hoops that would look amazing. Bringing them to the Hub tomorrow ✨", hoursLater: 5 },
    ],
  },
  {
    id: "lbs-post-trek-luggage",
    community: "lbs",
    author: "oliver-bennett",
    type: "OFFER",
    title: "Two cabin cases + a luggage scale for trek season",
    body: "Trek season is upon us, and a few of you have asked about luggage. I have two 55cm hard-shell cabin cases (all four wheels working on both, which is rarer than it should be) and a digital luggage scale that has saved me from budget-airline fees more times than I can count.\n\nFree to borrow for any trek or study trip this term. Just tell me your dates so I don't double-book them, and I'll drop them at Sammy Ofer reception. Please return them empty. Last time one came back with half a bag of Japanese Kit Kats in it, which, to be fair, was a lovely surprise.",
    neededIn: 4,
    price: 0,
    daysAgo: 6,
    comments: [
      { author: "sophie-clarke", body: "Can I take one for the Japan trek at the end of the month? Will report back on the Kit Kat situation 🍫🇯🇵", hoursLater: 7 },
    ],
  },
  // Imperial
  {
    id: "imperial-post-arduino",
    community: "imperial",
    author: "callum-reid",
    type: "REQUEST",
    title: "Arduino kit for a plant-watering robot 🌱🤖",
    body: "Our second-year design project is a robot that waters plants, because apparently we can't be trusted to do it ourselves. The department kits are all signed out until after reading week 😤\n\nNeed: an Arduino Uno (a clone is fine), a breadboard, jumper wires, and ideally a soil moisture sensor and a small servo. Two weeks from Monday. Nothing gets soldered to your board, and everything stays in the box. £10, plus a VIP invite to demo day in the Dyson Building, where you can watch your Arduino water a cactus. Live.",
    neededIn: 4,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "priya-shah", body: "I have one in my lab locker! Message me 📦", hoursLater: 3 },
      { author: "tom-hughes", body: "Got a moisture sensor left over from last year. Yours if you want it.", hoursLater: 5 },
      { author: "callum-reid", body: "You're both heroes. The cactus thanks you 🌵", hoursLater: 6 },
    ],
  },
  {
    id: "imperial-post-lab-coat",
    community: "imperial",
    author: "tom-hughes",
    type: "OFFER",
    title: "Free lab coat and goggles (no mystery smells)",
    body: "I've finished my last chemistry lab module ever, so my lab coat (size M, washed and ironed) and a pair of anti-fog safety goggles need a new home 🥽\n\nBoth are in good nick: no burns, no stains, no mystery smells. Free, and keep them until summer if you're still in labs. I'm at the Royal School of Mines most afternoons and can meet in the foyer. First come, first served, but I'll prioritise a first-year still waiting on the department order. We've all been there.",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "callum-reid", body: "Tom giving away his lab coat. End of an era.", hoursLater: 8 },
    ],
  },
  {
    id: "imperial-post-soldering",
    community: "imperial",
    author: "priya-shah",
    type: "REQUEST",
    title: "Soldering iron for EEE Soc build night 🔥",
    body: "EEE Soc build night is on Saturday and my soldering iron has decided to retire 🫠 After ten minutes it barely melts solder, and my friend and I have about sixty joints to do on a little synth kit 🎹\n\nIdeally a temperature-controlled iron, Friday evening to Sunday afternoon. A stand and a brass tip cleaner would be lovely, but I'll bring my own solder and flux. It'll come back cleaned and tinned. I can collect from South Ken or near Hackney Central. I'll play you the synth when it's done (this may or may not be a reward).",
    neededIn: 2,
    daysAgo: 0,
    comments: [
      { author: "callum-reid", body: "There's a Hakko in the Robotics Soc cupboard, I'll sign it out for you 🔧", hoursLater: 3 },
      { author: "priya-shah", body: "Callum you star ⭐", hoursLater: 4 },
    ],
  },
  {
    id: "imperial-post-walking-boots",
    community: "imperial",
    author: "callum-reid",
    type: "REQUEST",
    title: "Walking boots, size 10, for Snowdon ⛰️",
    body: "Fellwanderers are off to Snowdonia for the long weekend, and the plan is the Watkin Path up Snowdon. I've been reliably informed it is \"not a trainers kind of walk\" 🥾\n\nUK 10, slightly wide feet, Thursday to Monday. I'll break them in around Hyde Park first so I don't get blisters halfway up a mountain, and they'll come back mud-free. £12, or I'll lend you my 22L daypack as a swap. If it rains (it will rain), I'll stuff them with newspaper so they dry properly.",
    neededIn: 10,
    price: 12,
    daysAgo: 3,
    comments: [
      { author: "tom-hughes", body: "I'm a 10 with very broken-in Merrells. Leaving them at the Sherfield foyer on Wednesday.", hoursLater: 2 },
      { author: "callum-reid", body: "Legend. Summit selfie incoming 📸", hoursLater: 3 },
    ],
  },
  {
    id: "imperial-post-tripod-reflector",
    community: "imperial",
    author: "priya-shah",
    type: "OFFER",
    title: "Free tripod + reflector for society shoots 📷",
    body: "I upgraded my tripod and now have two, which is one more than a person needs. The older Manfrotto (ball head still locks properly, I checked) is free to borrow for society events. I'm throwing in a 5-in-1 reflector too, which is basically a cheat code for portraits on the Queen's Lawn when the sun shows up ☀️\n\nUp to a week at a time. All I ask is an Instagram credit if the photos end up on your society's page 🙏 I'm around the Sherfield Building on Tuesdays and Thursdays. Drop your dates below and I'll bring them in.",
    price: 0,
    daysAgo: 5,
    comments: [
      { author: "callum-reid", body: "RCSU Science Challenge photos next Thursday? I'd take both.", hoursLater: 4 },
      { author: "priya-shah", body: "Booked! Thursday it is ✅", hoursLater: 5 },
    ],
  },
  {
    id: "imperial-post-calculator",
    community: "imperial",
    author: "tom-hughes",
    type: "REQUEST",
    title: "Casio fx-991EX for a stats resit (please)",
    body: "I'm resitting a stats exam next Wednesday and have just found out the approved list only allows the Casio fx-991EX or similar. My trusty school calculator from 2016 is not on it. Buying one for a single exam feels wrong when half the department must have one in a drawer 🧮\n\nMonday (so I can practise) to Wednesday afternoon. £5, back straight after the exam with the cover on. Royal School of Mines or the library foyer, any time after 11am.\n\nEDIT: sorted, thanks Priya! Wish me luck 🤞",
    neededIn: 5,
    price: 5,
    daysAgo: 4,
    status: "FULFILLED",
    comments: [
      { author: "priya-shah", body: "Mine's a 991EX. Good luck! I'll bring it Monday.", hoursLater: 6 },
    ],
  },
  {
    id: "imperial-post-drone-showreel",
    community: "imperial",
    author: "callum-reid",
    type: "OFFER",
    title: "Mavic Air 2 for society showreels, pilot included 🚁",
    body: "I'm a CAA-registered drone pilot with a Mavic Air 2, and a few societies have asked for aerial shots. So here's the deal: I'll fly it for your showreel or event video, and you get the edited clips plus all the raw files.\n\nSmall print: airspace rules around South Ken mean I can't fly everywhere (sorry, no dramatic Albert Hall flyover). It works best for outdoor stuff further out: sports days at Harlington, field courses at Silwood Park, society trips. £20 a session covers batteries and travel. Comment with a date and location and I'll check the restrictions first ✈️",
    price: 20,
    daysAgo: 7,
    comments: [
      { author: "tom-hughes", body: "Fellwanderers would love this for the Peak District trip.", hoursLater: 5 },
    ],
  },
  // UCL
  {
    id: "ucl-post-graduation-gown",
    community: "ucl",
    author: "kwame-asante",
    type: "REQUEST",
    title: "BSc gown for an afternoon (my mum is very insistent) 🎓",
    body: "My official ceremony isn't until July, but my family are visiting next Tuesday and my mum has her heart set on photos of me in a gown in front of the Portico. It's not a request, it's a decree 😅 The hire company only does ceremony dates, so I need a hero.\n\nSize M, I'm about 5'10\". A hood would be perfect but it's optional, nobody in the photos will know. Monday evening to Wednesday morning, £10. I'll collect from the Main Quad and return it on a hanger, not crumpled in my rucksack. My mum will be eternally grateful, and so will I 🙏",
    neededIn: 6,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "hannah-brooks", body: "My housemate graduated last summer, asking if hers is still around 👀", hoursLater: 5 },
      { author: "hannah-brooks", body: "She still has it! It's yours 🎉", hoursLater: 9 },
    ],
  },
  {
    id: "ucl-post-projector",
    community: "ucl",
    author: "amara-okafor",
    type: "OFFER",
    title: "Mini projector + screen for society film nights 🍿",
    body: "I bought a mini projector for the African-Caribbean Society film night and it's been sulking in its box ever since. It's 1080p with HDMI and a built-in speaker (fine for a small room, not for a rave), and it comes with an 80-inch pull-up screen that fits in a tote bag 🎬\n\n£5 a night for any society, and every penny goes to the ACS welfare fund. Setup takes five minutes and I'll show you how at pickup. Student Centre or Main Quad. Book a few days ahead, as it gets busy around exam season (everyone suddenly needs a movie night).",
    price: 5,
    daysAgo: 3,
    comments: [
      { author: "hannah-brooks", body: "Could Film Soc borrow it next Wednesday?", hoursLater: 6 },
      { author: "amara-okafor", body: "Yes!! Yours from Wednesday lunchtime 🎉", hoursLater: 8 },
    ],
  },
  {
    id: "ucl-post-textbooks",
    community: "ucl",
    author: "hannah-brooks",
    type: "OFFER",
    title: "Free Year 1 Economics textbooks 📚",
    body: "Final-year me is clearing out first-year me's shelves 📚 I've got Mankiw's Principles of Economics and Varian's Intermediate Microeconomics, both in good condition with a few light pencil notes (some of which are even correct).\n\nFree to borrow for the whole term. If you're a first-year economist, they'll save you the best part of £100. Collect from the Student Centre ground floor, or near Clapham Common at weekends. When you're done, please pass them on to the next person on the board instead of giving them back. Circle of life 🔄\n\nEDIT: both gone, thank you!",
    price: 0,
    daysAgo: 5,
    status: "FULFILLED",
    comments: [
      { author: "kwame-asante", body: "Grabbed Varian for my micro module, you're a star 🌟", hoursLater: 9 },
    ],
  },
  {
    id: "ucl-post-summer-ball-suit",
    community: "ucl",
    author: "kwame-asante",
    type: "REQUEST",
    title: "Dinner suit for the Summer Ball (I panic-bought tickets) 🕺",
    body: "Summer Ball tickets went on sale yesterday, and I panic-bought two before checking whether I own anything black tie. Reader, I do not 🙃\n\n40R jacket, 32 waist, 5'10\". I'm after a dinner suit that doesn't scream fancy-dress shop. It's for the Friday of the ball and I can collect on Thursday. £20, dry-cleaned afterwards if it needs it, and I'll treat it better than my own clothes (low bar, but still). A self-tie bow tie would be a bonus. I've watched three YouTube tutorials and I'm ready.",
    neededIn: 12,
    price: 20,
    daysAgo: 2,
    comments: [
      { author: "amara-okafor", body: "I can lend you a bow tie AND teach you how to tie it 🎀 The suit you'll have to find elsewhere!", hoursLater: 3 },
      { author: "kwame-asante", body: "Deal. Lesson fee: one song request at my next set 🎧", hoursLater: 4 },
    ],
  },
  {
    id: "ucl-post-costume-rail",
    community: "ucl",
    author: "amara-okafor",
    type: "OFFER",
    title: "Costume rail for themed socials 💃 (flapper dresses, wigs, chaos)",
    body: "I style events for a living, which means my flat in Peckham has slowly turned into a costume shop 🪩 We're talking 1920s flapper dresses, a dozen sequinned jackets, feather boas, cowboy hats and a frankly embarrassing number of wigs.\n\nIf your society has a themed social coming up, come and raid it! £3 an outfit for the night, and every penny goes to RAG ❤️ I'll bring a rail to the Student Centre on Thursdays, 12–2pm, so you can try things on. Return within three days, and tell me if anything rips. I can fix almost anything, but only if I know about it 🧵",
    price: 3,
    daysAgo: 4,
    comments: [
      { author: "kwame-asante", body: "Hip-Hop Soc's 90s night is on the 21st. Do you have bucket hats?", hoursLater: 2 },
      { author: "amara-okafor", body: "About six of them 😂", hoursLater: 4 },
      { author: "hannah-brooks", body: "Coming for the flapper dresses for Econ Soc's Gatsby night ✨", hoursLater: 7 },
    ],
  },
  {
    id: "ucl-post-sewing-machine",
    community: "ucl",
    author: "hannah-brooks",
    type: "REQUEST",
    title: "Sewing machine for one evening (hem emergency) 🧵",
    body: "I'm lending one of my ball gowns to a friend for the Summer Ball, but she's a few inches shorter than me, so the hem needs taking up. Temporarily! I would like it back as it was 😅\n\nDoes anyone have a sewing machine I could borrow for an evening? Any basic one is fine, as long as it does a straight stitch and has a needle that can cope with satin. I'll bring my own thread. I can collect from the Main Quad or the Student Centre and bring it back the next day. £8, plus a slice of the lemon drizzle I'm making for pre-drinks 🍋🍰",
    neededIn: 3,
    price: 8,
    daysAgo: 0,
    comments: [
      { author: "amara-okafor", body: "I have a Brother machine at home, bringing it Thursday! Save me the biggest slice 🍋", hoursLater: 1 },
    ],
  },
  {
    id: "ucl-post-dj-kit",
    community: "ucl",
    author: "kwame-asante",
    type: "OFFER",
    title: "DJ controller + speakers for your next social 🎧🔊",
    body: "I DJ at weekends, so I've got a Pioneer DDJ-400 controller and a pair of powered speakers: loud enough for a basement bar, not so loud that you get a noise complaint (tested, unfortunately) 🔊\n\nGood for society socials, birthdays and flat-warmings. £15 a night for the lot, cables included. Never used a controller? I'll set it up in playlist mode so you can just press play. Or I'll DJ it myself for a small fee and a free drink 🍹 I'm in Dalston, but I can bring everything to Bloomsbury in an Uber if you split the fare.",
    price: 15,
    daysAgo: 6,
    comments: [
      { author: "hannah-brooks", body: "Booking you for the Econ Soc end-of-term party!! 🪩", hoursLater: 5 },
      { author: "kwame-asante", body: "Say less 🔥", hoursLater: 6 },
    ],
  },
  // Queen Mary
  {
    id: "qmul-post-moot-suit",
    community: "qmul",
    author: "elena-rossi",
    type: "REQUEST",
    title: "Black suit for a moot final at the Royal Courts of Justice ⚖️",
    body: "WE MADE THE FINAL 🎉 Our mooting team is through to a national final, held in an actual courtroom at the Royal Courts of Justice. Slight problem: the dress code is court dress (dark suit, white shirt, nothing flashy), and my only suit is grey and has seen things.\n\nI'm looking for a black or very dark navy women's suit, UK 10 jacket and UK 10 trousers or skirt, from next Wednesday to Friday. £15, and it'll be dry-cleaned before it comes back. I can collect from Mile End campus or the Law building. If we win, your suit gets a mention in my acceptance speech 🏆",
    neededIn: 6,
    price: 15,
    daysAgo: 0,
    comments: [
      { author: "aisha-rahman", body: "My interview suit is black, size 10! Try it on at Queens' Building tomorrow? 🖤", hoursLater: 2 },
      { author: "elena-rossi", body: "Aisha you're a lifesaver (literally, you're a medic) 😂", hoursLater: 3 },
    ],
  },
  {
    id: "qmul-post-hiking-kit",
    community: "qmul",
    author: "jack-morrison",
    type: "OFFER",
    title: "Tents, mats and a stove for the Lake District trip 🏕️",
    body: "The Hiking Society trip to the Lakes is nearly full 🏔️ and a few people have said they can't justify buying a tent for one weekend. Fair. I have:\n• two 2-person tents\n• one 4-person tent (palatial)\n• three sleeping mats\n• a gas stove and pan set\n\nAll dry, all working, all free for anyone on the trip. Tell me what you need in the comments and I'll bring it to the coach at Mile End on Friday morning. One rule: air the tents out properly when you get back. Packed away wet = mould, and I'd like to use them again 🙏",
    neededIn: 9,
    price: 0,
    daysAgo: 1,
    comments: [
      { author: "elena-rossi", body: "Could I have a mat and share the 4-person tent with Aisha?", hoursLater: 3 },
      { author: "aisha-rahman", body: "Yes please, count me in for the palace 🏰", hoursLater: 4 },
      { author: "jack-morrison", body: "Done. Bring snacks, that's the tent rent 🍫", hoursLater: 5 },
    ],
  },
  {
    id: "qmul-post-medics-ball",
    community: "qmul",
    author: "aisha-rahman",
    type: "REQUEST",
    title: "Floor-length gown for the medics' ball (send help) 🩺💃",
    body: "The Barts and The London ball is in two weeks, and after twelve-hour placement shifts I'm in no state to go dress shopping. My current wardrobe is 80% scrubs 😴\n\nUK 12, 5'6\". I'd love something floor-length in a jewel tone: emerald, sapphire or deep red. Friday afternoon to Sunday. £20, and I'll get it professionally cleaned. I'm in Whitechapel during the week, so I can grab it from the Garrod Building, or from Mile End on Fridays. I'll look after it better than I look after myself on nights (low bar, I know).",
    neededIn: 11,
    price: 20,
    daysAgo: 2,
    comments: [
      { author: "elena-rossi", body: "I have a navy satin one in a 12! Sending a photo tonight 💙", hoursLater: 6 },
      { author: "aisha-rahman", body: "Navy counts as sapphire if you squint. I'm squinting 👀", hoursLater: 7 },
    ],
  },
  {
    id: "qmul-post-law-textbooks",
    community: "qmul",
    author: "elena-rossi",
    type: "OFFER",
    title: "Free first-year law textbooks (heavy, sorry)",
    body: "A full set of first-year law textbooks I no longer need: Contract, Tort, Criminal and Public Law, all in the editions on this year's reading lists 📚 There's some highlighting, but every page is present and accounted for.\n\nFree to borrow for the year if you're a Queen Mary first-year. Warning: they are HEAVY. Bring a rucksack or a friend, ideally both 🏋️ I'm in the Law building most afternoons, or I can meet you at the Mile End library entrance. When you're done, pass them on to next year's first-years. Precedent has been set ⚖️",
    price: 0,
    daysAgo: 3,
    comments: [
      { author: "jack-morrison", body: "\"Precedent has been set\" 😂 lawyers are something else", hoursLater: 6 },
    ],
  },
  {
    id: "qmul-post-bike",
    community: "qmul",
    author: "jack-morrison",
    type: "REQUEST",
    title: "Bike for three weeks (someone stole my front wheel) 🚲",
    body: "Someone took a fancy to my front wheel outside the library last week 🙃 and the bike shop on Mile End Road can't fix it for three weeks. I cycle in from Stratford every day, and the Central line at 8.30am is not how I want to start my mornings (or anyone's).\n\nAny road or hybrid bike with a medium frame (I'm 5'11\") for three weeks. I'll use my own lock and lights, keep it indoors overnight and get it serviced before it goes back. £10 a week. I can collect from Mile End or Stratford. I will guard your wheels with my life.",
    neededIn: 2,
    price: 10,
    daysAgo: 4,
    comments: [
      { author: "aisha-rahman", body: "My brother's hybrid is in our hallway doing nothing. Let me ask him 🚲", hoursLater: 5 },
    ],
  },
  {
    id: "qmul-post-osce-kit",
    community: "qmul",
    author: "aisha-rahman",
    type: "OFFER",
    title: "Stethoscope + OSCE kit for medics and dentists 🩺",
    body: "Just upgraded my stethoscope 🎉 so my old Littmann Classic III is free to borrow, along with a pen torch, a tendon hammer and the OSCE revision cards that carried me through second year.\n\nPerfect if your own kit is still in the post or you want to practise examinations with friends before your OSCEs. Borrow it for up to a month. I'm at the Garrod Building most days. Please give the earpieces and diaphragm an alcohol wipe before handing it back. You know why 🧼\n\nEDIT: on loan at the moment, I'll repost when it's back!",
    price: 0,
    daysAgo: 5,
    status: "FULFILLED",
    comments: [
      { author: "jack-morrison", body: "My flatmate's borrowing this for her first OSCE, thanks so much Aisha 🙏", hoursLater: 7 },
    ],
  },
  {
    id: "qmul-post-gopro",
    community: "qmul",
    author: "jack-morrison",
    type: "REQUEST",
    title: "GoPro to film the novice regatta 🚣",
    body: "The boat club's novice crews are racing at the Royal Docks next Saturday 🚣‍♂️ and I promised the coach some footage for technique reviews (i.e. so we can all watch ourselves catch crabs in slow motion).\n\nNeed a GoPro (Hero 8 or newer) or a similar waterproof action camera, plus a chest or head mount if you've got one. Collect Friday, back Sunday with the footage wiped. £10. It'll be on a leash the entire time, but if it somehow ends up in the dock, I'll replace it, no questions asked. Mile End campus or the Stratford Westfield entrance.",
    neededIn: 8,
    price: 10,
    daysAgo: 6,
    comments: [
      { author: "elena-rossi", body: "Good luck!! I'll be on the bank shouting things I don't understand 📣", hoursLater: 4 },
    ],
  },
  // Google UK
  {
    id: "google-post-monitor",
    community: "google-uk",
    author: "zara-ahmed",
    type: "REQUEST",
    title: "Portable monitor for two weeks (my neck is begging) 🙏",
    body: "My home desk is out of action for two weeks while the flat gets rewired, and working off a 13-inch laptop screen is slowly turning me into a question mark 🦐\n\nI'm after a portable USB-C monitor, 15 or 16 inches, that I can carry between home and the office. From Thursday, for two weeks. £20, and it'll live in its sleeve. I'm in King's Cross most days (fourth floor, 6 Pancras Square), so I can grab it from the lobby whenever suits you.",
    neededIn: 3,
    price: 20,
    daysAgo: 0,
    comments: [
      { author: "leo-martins", body: "Got a 15\" ASUS one, I'll bring it in Monday 👍", hoursLater: 1 },
      { author: "zara-ahmed", body: "Leo you're an angel 😇", hoursLater: 2 },
    ],
  },
  {
    id: "google-post-suitcase",
    community: "google-uk",
    author: "isla-fraser",
    type: "OFFER",
    title: "Cabin suitcase free to borrow between my trips ✈️",
    body: "I travel for work about once a month, and the rest of the time my cabin case sits on top of the wardrobe, judging me. 55cm, spinner wheels, compression pad, and it has fitted in every overhead locker I've ever tried (even on that tiny plane to Jersey) ✈️\n\nFree to borrow between my trips. I'm away the first week of every month, so it's yours the rest of the time. I can drop it at the King's Cross lobby or Belgrave House. Please empty the pockets before you give it back. I once found someone's passport in a borrowed bag 😬",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "zara-ahmed", body: "Could I borrow it for the Dublin offsite on the 19th?", hoursLater: 6 },
      { author: "isla-fraser", body: "All yours! Pockets pre-checked 😉", hoursLater: 7 },
    ],
  },
  {
    id: "google-post-costume",
    community: "google-uk",
    author: "leo-martins",
    type: "REQUEST",
    title: "Halloween costume, size L, for the team party 🎃",
    body: "The team Halloween party is next Friday and I have, once again, left it far too late 🎃 Anything spooky in a size L: a vampire cape, a skeleton onesie, a convincing zombie. I'm not fussy, as long as it isn't a sexy pumpkin. I have standards (barely).\n\nI'll collect on Thursday after work and return it on Monday, washed if it's machine washable. £10. Bonus points if it leaves my hands free, because I'm also the unofficial party photographer and will be carrying a camera all night 📸👻",
    neededIn: 7,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "zara-ahmed", body: "I have a Dracula cape with a VERY high collar. It's dramatic, but so are you 🧛", hoursLater: 3 },
      { author: "leo-martins", body: "Sold. I'll practise my brooding face.", hoursLater: 4 },
    ],
  },
  {
    id: "google-post-clothes-rails",
    community: "google-uk",
    author: "isla-fraser",
    type: "REQUEST",
    title: "Clothes rails for the office clothes swap 👗",
    body: "I'm organising a clothes swap in the King's Cross atrium on the Thursday after next ♻️ I already have about forty donations (thank you!!) and absolutely nowhere to hang them.\n\nDoes anyone own a clothes rail or two they could lend for the day? Collapsible ones are ideal, so I can wheel them up from the loading bay. I'll pick up the day before and have them back to you by Friday morning. There's no budget since it's for charity, but everyone who lends something gets first pick of the rails before we open the doors 👀",
    neededIn: 8,
    daysAgo: 3,
    comments: [
      { author: "leo-martins", body: "I've got a rolling rail from my photo studio. It's yours for the day.", hoursLater: 4 },
    ],
  },
  {
    id: "google-post-camera-bag",
    community: "google-uk",
    author: "leo-martins",
    type: "OFFER",
    title: "Camera backpack + travel tripod for offsites 🎒",
    body: "Years of gig photography have left me with more camera bags than cameras, which my partner describes as \"a problem\" 🎒 I can lend a camera backpack (fits a body, three lenses and a 16-inch laptop) and a compact travel tripod to anyone shooting an offsite, a conference or just their holiday.\n\nFree for up to two weeks. I bring kit into King's Cross on Mondays and Wednesdays, so tell me which day and I'll leave it at the lobby desk with your name on it. Need a camera too? My Sony A7 III is in our community items 📷",
    price: 0,
    daysAgo: 5,
    comments: [
      { author: "zara-ahmed", body: "Taking the tripod to the Lisbon offsite, expect many sunset photos 🌅", hoursLater: 6 },
    ],
  },
  {
    id: "google-post-mehndi-outfit",
    community: "google-uk",
    author: "zara-ahmed",
    type: "REQUEST",
    title: "Green or gold outfit for my best friend's mehndi 💚✨",
    body: "My best friend's wedding is in Birmingham in three weeks, and I've JUST been told the mehndi has a colour theme: green or gold. Everything I own is pink 💀\n\nI'm looking for a lehenga or a sharara set in green or gold, UK 10, for the weekend of the 6th: collect Thursday, return the following Tuesday after steaming. £30, and I'll cover dry cleaning if it needs it. I live in Wembley and I'm in King's Cross three days a week, so either works. I'll send you videos of the dance-off, which I intend to win 💃",
    neededIn: 14,
    price: 30,
    daysAgo: 4,
    comments: [
      { author: "isla-fraser", body: "I have a gold dupatta that would look gorgeous with something plain ✨", hoursLater: 9 },
      { author: "zara-ahmed", body: "Ooh yes please!! 😍", hoursLater: 10 },
    ],
  },
  {
    id: "google-post-talk-outfits",
    community: "google-uk",
    author: "isla-fraser",
    type: "OFFER",
    title: "Blazers and styling for your first conference talk 🎤",
    body: "When I'm not at Google I work as a stylist, and I keep seeing people panic about what to wear for their first big conference talk 😅 So: I have a rail of blazers in sizes 6 to 16, some smart shirts, and neutral trousers that look good under stage lighting.\n\nBorrow anything for free for your talk, and if you like, I'll spend twenty minutes putting together an outfit that won't wash out on camera 🎤 I'm at Belgrave House on Tuesdays and King's Cross on Thursdays. Book a slot in the comments.\n\nEDIT: fully booked this month, I'll post again in December!",
    price: 0,
    daysAgo: 7,
    status: "FULFILLED",
    comments: [
      { author: "zara-ahmed", body: "Booked Thursday before my talk rehearsal, thank you!! 🙏", hoursLater: 2 },
    ],
  },
  // Meta
  {
    id: "meta-post-standing-desk",
    community: "meta-uk",
    author: "ruby-patel",
    type: "REQUEST",
    title: "Standing desk converter for a month (my back hurts) 🪑",
    body: "Working at my kitchen table has given me the lower back of an 80-year-old 👵 Before I spend £300 on a standing desk, I want to check I'll actually use one, and that it won't just become a very expensive coat rack.\n\nHas anyone got a desk converter (the kind that sits on top of a normal desk) I could try for a month? Ideally it fits a laptop and a monitor side by side. I live in Chelsea but I'm at Rathbone Square three days a week, so the office or anywhere around Fitzrovia works. £15 for the month, back in its box 📦",
    neededIn: 5,
    price: 15,
    daysAgo: 1,
    comments: [
      { author: "daniel-reyes", body: "Ours has been gathering dust since we moved. Bringing it in Tuesday.", hoursLater: 5 },
      { author: "ruby-patel", body: "Daniel, my spine thanks you 🙏", hoursLater: 6 },
    ],
  },
  {
    id: "meta-post-camera",
    community: "meta-uk",
    author: "daniel-reyes",
    type: "OFFER",
    title: "Canon DSLR for hack week demo videos 🎥",
    body: "Hack week is coming, and every team needs a demo video 🎬 I've got a Canon DSLR with an 18–135mm lens, a decent tripod and an on-camera mic. That's more than enough for a two-minute demo that doesn't look like it was filmed on a potato 🥔\n\nFree for the week, just bring your own SD card. Not sure about the settings? I'll give you a five-minute crash course at pickup. I'll leave it at Rathbone Square reception, first come, first served. Please charge the batteries before you give it back. I'm looking at you, last year's team.",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "ruby-patel", body: "Amazing, can I grab it for Thursday's demo? 🙌", hoursLater: 2 },
      { author: "daniel-reyes", body: "It's yours. Batteries charged, unlike last year.", hoursLater: 3 },
    ],
  },
  {
    id: "meta-post-velvet-blazer",
    community: "meta-uk",
    author: "daniel-reyes",
    type: "REQUEST",
    title: "Velvet blazer for the holiday party (theme: winter glamour) 🎄",
    body: "This year's holiday party theme is \"winter glamour\", which apparently rules out the navy suit I've worn to every work event since I joined 🫠\n\nI'd love to borrow a velvet dinner jacket or blazer in dark green or burgundy, size 40R, from the Thursday before the party until the Monday after. £15, and I'll have it professionally cleaned. I'm in Camden near the Northern line, so I can pick up anywhere in north London or from the office. My partner says I'm \"not a velvet person\". I'd like to prove her wrong 💅",
    neededIn: 18,
    price: 15,
    daysAgo: 3,
    comments: [
      { author: "ruby-patel", body: "I have a burgundy velvet bow tie that would go with whatever you find 🎀", hoursLater: 4 },
      { author: "daniel-reyes", body: "Ruby, you're about to make me a velvet person.", hoursLater: 5 },
    ],
  },
  {
    id: "meta-post-video-kit",
    community: "meta-uk",
    author: "ruby-patel",
    type: "OFFER",
    title: "Ring light + lapel mics for recording talks 💡🎙️",
    body: "I left fashion PR but kept the content creator kit 💅 I've got an 18-inch ring light, two wireless lapel mics that plug into a phone, and a small green screen. Great for internal talks, onboarding videos, or anything you'd rather not film in a meeting room under fluorescent lights (nobody looks good under those, it's science).\n\nFree to borrow for a week at a time, and it all fits in one tote. I'm at Rathbone Square on Mondays, Wednesdays and Thursdays. Reply with your dates and I'll leave it with reception ✨",
    price: 0,
    daysAgo: 4,
    comments: [
      { author: "daniel-reyes", body: "Could I get the mics for our team all-hands recording on Wednesday?", hoursLater: 3 },
      { author: "ruby-patel", body: "Done! Tote bag will be at reception 💁‍♀️", hoursLater: 4 },
    ],
  },
  {
    id: "meta-post-moving-boxes",
    community: "meta-uk",
    author: "daniel-reyes",
    type: "OFFER",
    title: "Free moving boxes + a trolley that survived four flights of stairs 📦",
    body: "We've just moved flats 🏠 and I now own twenty flat-packed moving boxes, a roll of bubble wrap, and a folding trolley that got an entire flat's worth of stuff up four flights of stairs without dying.\n\nRather than recycle the boxes, I'd love someone else to use them. Free to anyone moving in the next month: collect from Camden and ideally take the lot. If you're moving within London and want an extra pair of hands on the day, I'm reasonably strong and very motivated by pizza 🍕\n\nEDIT: all gone! Good luck with the move, Ruby!",
    price: 0,
    daysAgo: 6,
    status: "FULFILLED",
    comments: [
      { author: "ruby-patel", body: "Took the lot for my move, I owe you a pizza 🍕", hoursLater: 8 },
    ],
  },
  {
    id: "meta-post-ski-outfit",
    community: "meta-uk",
    author: "ruby-patel",
    type: "REQUEST",
    title: "Ski jacket + salopettes for the team trip ⛷️",
    body: "The team is off to Morzine in January and it'll be my first time skiing ⛷️ I refuse to buy an expensive ski outfit before I know whether I like it (or whether I'll spend the week in the chalet with a hot chocolate, which, honestly, also sounds great ☕).\n\nI'm looking for a ski jacket and salopettes in a UK 10 (women's S–M), plus gloves if you have them. From the Friday we fly to the following Sunday, and everything comes back washed. £25, or more if it's really good kit. I'm at Rathbone Square most days, or I can collect anywhere in west London.",
    neededIn: 25,
    price: 25,
    daysAgo: 5,
    comments: [
      { author: "daniel-reyes", body: "Do it. Worst case, the hot chocolate is excellent.", hoursLater: 5 },
    ],
  },
  {
    id: "meta-post-party-dresses",
    community: "meta-uk",
    author: "ruby-patel",
    type: "OFFER",
    title: "Party dresses for the holiday party ✨ sizes 8–12",
    body: "Sample sales got the better of me years ago 🛍️ so I now own a rail of party dresses in sizes 8 to 12, each worn once at most. Sequins, velvet, and a few classic black ones for anyone who'd rather not be the main character.\n\nWith the holiday party coming up, borrow one for £8 to cover the dry cleaning. Come and look at the rail at Rathbone Square on Wednesday lunchtime, or tell me your size and I'll send photos 📸 My red floral midi is already in our community items if you want to book it straight away 💃",
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
    title: "Second suit for a week of client meetings 😅",
    body: "Three months into the grad scheme and I've been put on a deal team with client meetings every day next week. Exciting! Slight issue: I own one suit 😅 It's a good suit, but not good enough to wear five days in a row in front of the same people.\n\nI'm looking for a dark navy or charcoal suit, 40R jacket, 32 waist, from Sunday to the following Saturday. £20, and it'll be dry-cleaned before it comes back. I'm at 1 Churchill Place every day and live in Greenwich, so the DLR makes pickup easy 🚈",
    neededIn: 2,
    price: 20,
    daysAgo: 0,
    comments: [
      { author: "tunde-bakare", body: "My spare charcoal one is a 40R. I'll bring it in on Friday.", hoursLater: 3 },
      { author: "ben-carter", body: "You've saved my career (and my dignity) 🙏", hoursLater: 4 },
    ],
  },
  {
    id: "barclays-post-gala-wardrobe",
    community: "barclays",
    author: "chloe-evans",
    type: "OFFER",
    title: "Black tie outfits for the charity gala 🥂 (book early!)",
    body: "Every year I organise the charity gala, and every year someone messages me in a panic two days before because they have nothing to wear 😱 So this year I'm opening my wardrobe EARLY:\n• six floor-length gowns, sizes 8–14\n• two clutch bags\n• a box of earrings\n\n£10 per outfit, and it all goes to this year's charity partner 💛 Come and look at the rail on the 12th floor on Wednesday lunchtime, or comment with your size and I'll send photos. Book early: the emerald sequinned one always goes first, and I won't be taking complaints.",
    neededIn: 3,
    price: 10,
    daysAgo: 1,
    comments: [
      { author: "ben-carter", body: "Anything for men? Asking for a friend (the friend is me) 👀", hoursLater: 2 },
      { author: "chloe-evans", body: "Ask Tunde, I'm told he has a drawer full of bow ties 🎀", hoursLater: 3 },
      { author: "tunde-bakare", body: "Can confirm. It's a problem.", hoursLater: 4 },
    ],
  },
  {
    id: "barclays-post-camera-kit",
    community: "barclays",
    author: "tunde-bakare",
    type: "OFFER",
    title: "Camera kit for team events and leaving dos 📸",
    body: "Tax associate by day, wedding photographer at weekends 📸 Between weddings, I've got a spare Canon body, a 50mm f/1.8 and a speedlight that are mostly gathering dust. They're great for team events, leaving dos or the gala, where phone photos never quite capture the vibe.\n\nFree to borrow for team events. I'll give you a five-minute lesson on the settings so you don't come back with a hundred blurry photos of the bar. I'm at 1 Churchill Place all week, and around Deptford and Greenwich at weekends. Want something faster? My Sigma Art lens is in our community items.",
    price: 0,
    daysAgo: 2,
    comments: [
      { author: "chloe-evans", body: "Could I borrow it for the gala? The agency photographer only covers the first two hours 🙏", hoursLater: 5 },
      { author: "tunde-bakare", body: "Of course. Just don't let anyone near it after the open bar.", hoursLater: 6 },
    ],
  },
  {
    id: "barclays-post-golf-clubs",
    community: "barclays",
    author: "ben-carter",
    type: "REQUEST",
    title: "Golf clubs for the client golf day ⛳ (send moral support)",
    body: "I've been invited to a client golf day in Hertfordshire ⛳ Great for my career, terrible for my ego, as the last time I played golf it involved a windmill and a crazy-golf scorecard.\n\nI'm looking for a full set of right-handed clubs with a bag, plus a few balls I can lose without guilt (I will lose them). I need them for the Friday and can collect on Thursday after work. £25, and I'll buy you a pint afterwards to report back on exactly how badly it went 🍺",
    neededIn: 10,
    price: 25,
    daysAgo: 3,
    comments: [
      { author: "tunde-bakare", body: "My dad's old set is in my garage. Not fancy, but complete.", hoursLater: 4 },
      { author: "chloe-evans", body: "Pro tip: compliment the client's swing, not your own 😉", hoursLater: 6 },
    ],
  },
  {
    id: "barclays-post-quiz-night",
    community: "barclays",
    author: "chloe-evans",
    type: "REQUEST",
    title: "Projector + speaker for the team quiz night 🧠🎤",
    body: "I've volunteered to host our floor's quiz night next Thursday 🧠 in the 3rd-floor breakout space, which has neither a screen nor speakers. Classic.\n\nI need a projector that works with a laptop over HDMI, and a Bluetooth speaker loud enough for about sixty very competitive people. Collect Wednesday after work, back Friday morning. £10, plus your team gets a bonus point (I am completely open to bribery 😇). I can pick up anywhere in Canary Wharf or along the Jubilee line.",
    neededIn: 4,
    price: 10,
    daysAgo: 4,
    comments: [
      { author: "tunde-bakare", body: "I have a big Bose speaker. The projector is someone else's problem.", hoursLater: 2 },
      { author: "ben-carter", body: "Does lending the projector get two bonus points? Asking for a team.", hoursLater: 5 },
    ],
  },
  {
    id: "barclays-post-cufflinks",
    community: "barclays",
    author: "tunde-bakare",
    type: "REQUEST",
    title: "Cufflinks + pocket square for the gala (plastic ones won't cut it)",
    body: "Chloe's charity gala is a week on Friday, and I finally have a dinner suit that fits 🕴️ Unfortunately, my only cufflinks are the plastic ones that came free with the shirt.\n\nI'm after a pair of plain silver or mother-of-pearl cufflinks and a white pocket square. Collect Thursday, return Monday. £5 or a drink at the gala. They'll live in a little box, not loose in my pocket, because I've lost a cufflink before and I'm still not over it 💔\n\nEDIT: sorted! Ben came through 🙌",
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
    title: "Ski jackets, helmet and goggles for the team trip 🎿",
    body: "Three ski seasons in, and I own more kit than one human needs 🎿 Up for grabs:\n• two ski jackets (women's S and M)\n• salopettes, size 10\n• a medium helmet\n• two pairs of goggles\n\nIf you're coming on the team ski trip in February and don't want to buy everything for one week, borrow mine! Free, on the strict understanding that it all comes back dry and NOT stuffed in a bin bag 🙅‍♀️ I'm on the 12th floor at 1 Churchill Place. Tell me what you need and your sizes, and I'll bring it in the week before.",
    price: 0,
    daysAgo: 7,
    comments: [
      { author: "ben-carter", body: "Is there a helmet for people whose skiing is 90% falling?", hoursLater: 3 },
      { author: "chloe-evans", body: "That's what the helmet is for, Ben 😂", hoursLater: 4 },
    ],
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
