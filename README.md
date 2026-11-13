# Just Once

**Rent the things you only need once.** Just Once is a peer-to-peer rental marketplace for London: formalwear for a wedding, a camera for a weekend away, a tent for a festival, a Santa suit for the office party. Owners earn from things sitting in a cupboard; renters don't buy something they'll use once and then store in a small flat.

Built for AI Cup, Track B (Creativity & Commerce). The core journey works end to end: list → search → book → accept → pickup check → return check → deposit back → ratings.

| Home | Item page | Booking request (owner) |
| --- | --- | --- |
| ![Home page](docs/screenshots/home.jpg) | ![Item page with dates picked](docs/screenshots/item.jpg) | ![Owner deciding on a request](docs/screenshots/booking-request.jpg) |

| Owner dashboard | On a phone: item | On a phone: return check |
| --- | --- | --- |
| ![My listings dashboard](docs/screenshots/owner-dashboard.jpg) | ![Item page on a phone](docs/screenshots/phone-item.jpg) | ![Return check on a phone](docs/screenshots/phone-booking.jpg) |

---

## Contents

- [Run it locally](#run-it-locally)
- [Put it on a public URL (Vercel + Neon)](#put-it-on-a-public-url-vercel--neon)
- [Demo accounts](#demo-accounts)
- [Suggested demo script](#suggested-demo-script)
- [Before you present](#before-you-present)
- [What's in the app](#whats-in-the-app)
- [How it works](#how-it-works)
- [Data model and the future swap option](#data-model-and-the-future-swap-option)
- [Testing](#testing)
- [Scripts and environment variables](#scripts-and-environment-variables)
- [Limitations and next steps](#limitations-and-next-steps)

---

## Run it locally

You need **Node.js 20.9 or newer** and a **PostgreSQL** database (14 or newer).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your `.env` file (the defaults match the Docker database below):

   ```bash
   cp .env.example .env
   ```

3. Start Postgres. With Docker:

   ```bash
   docker compose up -d
   ```

   No Docker? Create a free database at [neon.tech](https://neon.tech) and paste its connection string into `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in `.env`. Postgres.app or a local install works too.

4. Create the tables and load the demo data:

   ```bash
   npm run setup
   ```

5. Start the app and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

To try it on your phone over Wi-Fi, open the "Network" address that `npm run dev` prints (for example `http://192.168.1.20:3000`).

## Put it on a public URL (Vercel + Neon)

Both have free plans and need no credit card. Allow about 10 minutes.

1. Push this repository to GitHub (it already is if you're reading this there).
2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub and **import** the repository. Leave the framework as Next.js and every build setting as it is: `vercel.json` already tells Vercel to run `npm run vercel-build`.
3. Before you deploy (or straight after the first deploy fails because it has no database), open the project's **Storage** tab, choose **Create Database → Neon**, and connect it to the project for all environments. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the project's environment variables.
4. Optional but recommended: in **Settings → Environment Variables**, add `DEMO_RESET_KEY` with a long random value. It lets you reset the demo data from the browser (see [Before you present](#before-you-present)).
5. Deploy (or **Redeploy** from the Deployments tab). The build runs the database migrations and, on a brand-new database only, loads the demo data. Later deploys never wipe your data.

Your app is now live at `https://<project-name>.vercel.app`. Share that link with the judges.

**Other hosts.** Anything that runs Node.js with a Postgres database works (Railway, Render, Fly.io, a VPS). Set `DATABASE_URL` (and `DATABASE_URL_UNPOOLED` if your provider gives you a separate direct connection), then run `npm run db:migrate`, `npm run db:seed`, `npm run build` and `npm start`.

**If something goes wrong on Vercel:**

- *"DATABASE_URL is not set"* in the build log: the Neon database isn't connected to this project, or not for the Production environment. Connect it, then redeploy.
- *"prepared statement already exists"* at runtime: add `&pgbouncer=true` to the end of `DATABASE_URL` in the project settings and redeploy.

## Demo accounts

Every demo account uses the password **`justonce`**. In demo mode the log-in page also has one-tap buttons for the main accounts, and the account menu (top right) has a "Switch demo account" list, so you can jump between owner and renter in two clicks.

| Person | Email | Role | Waiting for them after a fresh seed |
| --- | --- | --- | --- |
| **Sophie Clarke** | `sophie@example.com` | Renter, Islington | A camera on rent to return (Fujifilm X100V, due tomorrow), a ski kit booked for next month, a gown request waiting on Amara, past rentals with reviews |
| **Priya Shah** | `priya@example.com` | Owner, Hackney | Two *overlapping* requests for her Sony A7 III, a Polaroid pickup due today, a content-creator kit return to confirm, a review to write |
| Amara Okafor | `amara@example.com` | Owner, Peckham | Sophie's request for the plum evening gown; Halloween props |
| Leo Martins | `leo@example.com` | Renter and owner, Brixton | Waiting on Priya's answer about the Sony; a tuxedo booked for a black-tie party |
| Tom Hughes | `tom@example.com` | Owner, Walthamstow | Tents and camping kit; a bell-tent booking next week |

Also seeded: `hannah@`, `callum@`, `oliver@`, `daniel@`, `zara@`, `mei@` and `sam@example.com` (Sam isn't ID-verified, so you can show the unverified state). In total: 12 people, 32 listings across the four categories, 34 bookings in every state and 45 reviews. All dates are relative to the day you seed, so the demo always looks current.

## Suggested demo script

About 6 minutes. Use **two screens** so the judges watch both sides of the same rental: the owner on the laptop and the renter on a phone (or a second browser window in private mode). Pages refresh themselves every few seconds, so when one side acts, the other screen catches up without anyone touching it.

**Setup:** reset the demo data, log the laptop in as **Priya** (owner) and the phone in as **Sophie** (renter). Have one or two photos of a camera on the laptop.

1. **The pitch (30 s), home page.** "Why buy it for one weekend?" Point out the three occasion tickets, the four categories and the search by item, area and dates.
2. **An owner lists an item (75 s), laptop as Priya.** Click **List an item**. Upload a photo, title it *Canon EOS R6 body*, choose **Cameras** and **Like new**, set **£40 a day** and a **£500 deposit**, pickup area **Hackney**. In the calendar, tap two days to block them out. Watch the live preview on the right, then **Publish listing**. It's live straight away and appears in *Just listed* on the home page.
3. **A renter books it (60 s), phone as Sophie.** Search *Canon*, or tap Cameras and filter to East London, and open the new item. Tap a pickup day and a return day: the "return ticket" fills in with the out and back dates, £40 × days, the 10% service fee and, on the tear-off stub, the refundable deposit. Add a note and **Request to book**. Sophie sees *Waiting for Priya to respond* and hasn't been charged.
4. **The owner accepts (30 s), laptop.** The *My listings* badge shows a new request. **Accept request**: the toast confirms Sophie has paid and the deposit is held (simulated). Those dates are now locked, and the phone flips to the pickup check on its own.
5. **Pickup check (60 s), both screens.** On each screen add a photo (on the phone, take one with the camera, or tap *Use the listing photo (demo)*), confirm the item matches the listing and press **Confirm pickup**. Once both have confirmed, the ticket's stamp changes to **ON RENT**.
6. **Return, deposit and ratings (60 s).** Both press **Confirm return** with a photo. The deposit stub turns green: *released to Sophie*, and Priya's payout is marked paid. Each rates the other with stars and a comment, and the reviews appear on both profiles.
7. **Double booking can't happen (30 s), laptop.** Open Priya's Sony A7 III request from Leo. The page warns that one other request overlaps. Accept it: Daniel's overlapping request is declined automatically and he isn't charged, and the dates are crossed out on the calendar. Mention that this is also enforced by the database itself, not just the screen.

**Short on time?** Skip steps 2 to 4 and use the seeded bookings: as Sophie, return the Fujifilm X100V; as Priya, confirm the content-creator kit return (the renter has already confirmed, so Priya's confirmation completes it) and rate Callum.

**Talking points for Creativity & Commerce:** owners keep 100% of their daily price and renters pay a 10% service fee, so the platform earns on every rental while owners see the full price they set. Deposits plus photo checks at both handovers make renting from a stranger feel safe. The data model is ready for a swap option, and every rental is one fewer thing bought for a single use.

## Before you present

The demo data's dates are relative to the day it was seeded, so **reset it on the day** (this also deletes any test accounts and bookings made since):

- **From the browser:** open `/demo/reset` on your deployed site and enter your `DEMO_RESET_KEY`.
- **From a terminal:** `curl -X POST https://<your-app>.vercel.app/api/demo/reset -H "x-demo-key: <your key>"`
- **Locally:** `npm run db:seed` (point `DATABASE_URL` at the production database to reset production).

Resetting logs everyone out. If you're showing the site on a phone, log in again afterwards.

## What's in the app

| Page | What it does |
| --- | --- |
| Home `/` | Search (item, area, dates), categories with live counts, featured items, newest listings, how it works, an earnings pitch for owners |
| Search `/search` | Filters for category, dates (only shows items free on those dates), area (a neighbourhood or a whole region such as East London), price and sort |
| Item `/items/[id]` | Large photo gallery, availability calendar (booked and blocked days crossed out), price breakdown, deposit, owner profile and reviews |
| List an item `/listings/new`, edit `/listings/[id]/edit` | Photos (resized in the browser), category, condition, price, deposit, pickup area and private pickup details, availability window plus days blocked out; pause, resume or remove a listing |
| My rentals `/dashboard/rentals` | Renter view: what needs you, what's on rent, upcoming, past |
| My listings `/dashboard/listings` | Owner view: requests to accept or decline in place, what needs you, earnings, your items, past bookings |
| Booking `/bookings/[id]` | The whole rental on one page: progress, the next step, the return ticket, pickup and return checks with photos, ratings, activity timeline |
| Profile `/users/[id]` | Verified badge, rating, items, reviews from renters and from owners |
| Account `/account` | Edit profile and photo, simulated ID verification, log out |
| Log in, sign up | Email and password; one-tap demo accounts in demo mode |

Payments, deposits and payouts are **simulated**: the app shows every amount and status change (paid, deposit held, deposit released, refunded, paid out) without a payment provider. ID verification is simulated too. There are no AI features in the product.

## How it works

**Stack:** Next.js 16 (App Router, React Server Components, Server Actions), React 19, TypeScript, Tailwind CSS 4, PostgreSQL with Prisma 6, Zod for validation. Fonts are self-hosted: Parkinsans for headings, Figtree for text and DM Mono for ticket details.

**Design:** white space, large photos and one accent colour (tangerine `#FF6A1F`, always with dark text for contrast). The signature element is the **return ticket**: the booking summary is drawn as a ticket with an *out* and a *back* date, a perforated tear line and a stub for the deposit, the part that comes back to you. On the booking page the ticket is stamped with its status.

**The rental lifecycle:**

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: renter asks for dates
    REQUESTED --> ACCEPTED: owner accepts (payment taken, deposit held)
    REQUESTED --> DECLINED: owner declines, or overlapping booking accepted
    REQUESTED --> CANCELLED: renter withdraws
    ACCEPTED --> ACTIVE: both confirm pickup with photos
    ACCEPTED --> CANCELLED: either cancels (full refund)
    ACTIVE --> COMPLETED: both confirm return (deposit released, owner paid)
    COMPLETED --> [*]: both rate each other
```

Key decisions:

- **No double bookings, three layers deep.** The calendar won't let you pick a booked day; the server re-checks the dates on every request; and accepting runs in a transaction that locks the listing row. Underneath, Postgres has an exclusion constraint (`btree_gist`) so two confirmed bookings for the same item can never share a day, whatever the app does. Pending requests don't block dates; when the owner accepts one, overlapping requests are declined automatically.
- **Auth** is email and password (bcrypt). Sessions live in the database; the cookie is `httpOnly` and the database stores only a SHA-256 hash of its token.
- **Photos** are resized to 1600 px JPEG in the browser before upload, which also strips EXIF data such as a phone's GPS location. They're stored in Postgres and served from `/api/images/[id]` with long-lived caching and Next.js image optimisation, so the app deploys without a separate file store. The server checks the file type from its first bytes and only accepts photo URLs from its own uploads.
- **Pickup details stay private:** renters see the area up front and the owner's exact pickup notes only once a booking is accepted.
- **Both sides always know what's next:** each booking computes its next step for the person looking at it ("Pickup check due today", "Rate Callum"), which drives the badges in the header and the *Needs you* sections.
- **Live updates without websockets:** booking pages and dashboards quietly re-fetch every 5–8 seconds while visible, pausing while someone is typing or has unsaved photos.
- **The demo looks current:** seed dates are offsets from today, so there's always a pickup due today and a return due tomorrow.

**Project layout:**

```
prisma/              schema, migrations (including the double-booking constraint), seed entry point
public/seed/         demo photos (see public/seed/CREDITS.md)
src/app/             pages and API routes (one folder per route)
src/components/      UI: calendar, booking ticket, photo uploader, forms, cards
src/lib/             pure logic shared by server and browser: dates, money, booking rules, areas
src/server/          database, auth, queries, server actions, seed data
e2e/                 Playwright end-to-end tests
```

## Data model and the future swap option

Main tables: `User`, `Session`, `Listing`, `BlockedDate`, `Booking`, `HandoverCheck` (one per side per stage, with photos), `Review`, `BookingEvent` (the timeline) and `ImageBlob` (uploaded photos). Money is stored in pence; rental dates are Postgres `date` values.

Swaps aren't built, but the model is ready for them:

- `ExchangeType` is an enum with `RENTAL` and `SWAP`.
- `Listing.exchangeTypes` says how an item can change hands (today always `[RENTAL]`).
- `Booking.type` defaults to `RENTAL`, and `Booking.offeredListingId` is reserved for the requester's own item offered in exchange.

Adding swaps means: letting owners tick "open to swaps", offering one of your listings instead of paying, skipping payment and payout for `SWAP` bookings, and running the same pickup and return checks for both items. The statuses, checks, reviews and timeline all carry over unchanged.

## Testing

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:e2e
```

- `npm test` runs unit tests for the pricing, date and booking rules (`src/lib/__tests__`).
- `npm run test:e2e` drives the real app with Playwright through the whole journey in two browsers: an owner signs up and lists an item with a photo upload, a renter searches and books, the owner accepts, both confirm pickup and return, the deposit is released, both leave reviews, and overlapping requests are declined automatically. A second test checks the phone layout. It starts `npm run dev` if nothing is running; to test another server, set `E2E_BASE_URL`. First-time setup: `npx playwright install chromium`. **The tests create data, so run `npm run db:seed` afterwards.**

## Scripts and environment variables

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run setup` | Apply migrations and load the demo data |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Wipe the database and reload the demo data (dates relative to today) |
| `npm run build` / `npm start` | Production build and server |
| `npm run vercel-build` | What Vercel runs: migrate, seed only if the database is empty, build |
| `npm test`, `npm run test:e2e`, `npm run typecheck` | Unit tests, end-to-end tests, type checks |

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string (the pooled one on Neon) |
| `DATABASE_URL_UNPOOLED` | Optional | Direct connection for migrations; falls back to `DATABASE_URL` |
| `DEMO_RESET_KEY` | Optional | Turns on `/demo/reset` and `POST /api/demo/reset` |
| `NEXT_PUBLIC_DEMO_MODE` | Optional | Set to `false` to hide the one-tap demo log-ins and account switcher (takes effect on the next build) |

## Limitations and next steps

This is a competition demo, so some things are deliberately simulated or left out:

- **Payments:** simulated. In production this would be Stripe Connect, with the deposit held as an uncaptured authorisation and released after the return check.
- **ID verification:** simulated. A real version would hand off to a provider such as Stripe Identity.
- **Not built yet:** in-app messages, damage claims against the deposit, email and push notifications, map search, and the swap option described above.
- **Demo mode** publishes the demo password and adds one-tap log-ins. Set `NEXT_PUBLIC_DEMO_MODE=false` for anything beyond a demo.

Photos come from [Unsplash](https://unsplash.com) under the Unsplash License (details in [`public/seed/CREDITS.md`](public/seed/CREDITS.md)). The people, listings and reviews are made up.
