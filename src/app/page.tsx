import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSearch } from "@/components/hero-search";
import { SituationSearch } from "@/components/situation-search";
import { ListingGrid } from "@/components/listing-card";
import { Container, LinkButton, SectionHeading } from "@/components/ui";
import { CATEGORIES } from "@/lib/catalogue";
import { formatGBP } from "@/lib/money";
import { cn } from "@/lib/cn";
import { getHomeData, type ListingCardData } from "@/server/queries";
import { aiEnabled } from "@/server/ai";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";

const OCCASIONS = ["Black-tie wedding", "Festival weekend", "Sunrise shoot"];
const DURATIONS = ["1 night", "3 days", "1 day"];

export default async function HomePage() {
  const [{ featured, latest, counts, hero, stats }, user] = await Promise.all([getHomeData(), getCurrentUser()]);

  return (
    <>
      {/* Hero: the occasion comes first, the item second. */}
      <section className="overflow-hidden">
        <Container className="pt-8 pb-12 md:pt-12 lg:pt-14 lg:pb-16">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
            <div className="min-w-0 animate-fade-up">
              <h1 className="max-w-xl text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-[4rem]">
                Why buy it for <span className="relative inline-block">one weekend?<Underline /></span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
                Rent formalwear, cameras, camping kit and seasonal bits from people near you in London. Pick it up, use it, hand it back.
              </p>
              {stats.rentals > 0 && (
                <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span><span className="font-semibold text-ink">{stats.items}</span> items to rent</span>
                  <span aria-hidden>·</span>
                  <span><span className="font-semibold text-ink">{stats.rentals}</span> rentals completed</span>
                  {stats.rating && (
                    <>
                      <span aria-hidden>·</span>
                      <span><span className="font-semibold text-ink">{stats.rating}</span> average rating</span>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="order-last min-w-0 lg:order-none">
              <TicketStack listings={hero} />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <HeroSearch />
              {aiEnabled() && <SituationSearch />}
              <p className="mt-4 text-sm text-muted">
                Got something gathering dust?{" "}
                <Link href={user ? "/listings/new" : "/signup?next=/listings/new"} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                  Lend it out
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <section aria-labelledby="categories" className="pt-2">
          <SectionHeading title="What do you need it for?" kicker="Browse" />
          <h2 id="categories" className="sr-only">Categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {CATEGORIES.map((c, i) => (
              <Link key={c.id} href={`/search?category=${c.slug}`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
                <Image
                  src={c.image}
                  alt=""
                  fill
                  priority={i < 2}
                  sizes="(min-width: 1024px) 300px, 46vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 pt-16 text-white sm:p-5">
                  <p className="font-display text-xl font-semibold sm:text-2xl">{c.label}</p>
                  <p className="mt-0.5 hidden text-sm text-white/85 sm:block">{c.blurb}</p>
                  <p className="mt-2 inline-flex items-center gap-1 font-mono text-[0.7rem] tracking-[0.12em] uppercase">
                    {counts[c.id] ?? 0} items <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="featured">
          <SectionHeading
            title="Popular with Londoners"
            kicker="Featured"
            action={
              <Link href="/search" className="hidden items-center gap-1 text-sm font-semibold hover:underline sm:inline-flex">
                See everything <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <h2 id="featured" className="sr-only">Featured items</h2>
          <ListingGrid listings={featured} />
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="latest">
          <SectionHeading title="Just listed" kicker="New in" />
          <h2 id="latest" className="sr-only">Just listed</h2>
          <ListingGrid listings={latest} />
        </section>

        <HowItWorks />

        <section className="mt-16 overflow-hidden rounded-3xl bg-ink text-white sm:mt-20">
          <div className="grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:p-14">
            <div>
              <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">For owners</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">That suit in your wardrobe could pay for itself.</h2>
              <p className="mt-3 max-w-lg text-white/75">
                List it in two minutes, accept the requests that suit you, and get paid once it&apos;s back. You keep 100% of your daily price.
              </p>
              <LinkButton href={user ? "/listings/new" : "/signup?next=/listings/new"} className="mt-7" size="lg">
                List an item
              </LinkButton>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              <Earning label="Tuxedo, 6 weddings a year" value={6 * 2 * 2200} />
              <Earning label="Tent, 4 festival weekends" value={4 * 3 * 1500} />
              <Earning label="Camera, 1 weekend a month" value={12 * 2 * 3500} />
              <Earning label="Christmas tree, 1 December" value={28 * 300} />
            </dl>
          </div>
        </section>
      </Container>
    </>
  );
}

function Underline() {
  return (
    <svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden className="absolute -bottom-2 left-0 h-3 w-full text-accent sm:-bottom-3 sm:h-4">
      <path d="M3 13c48-8 98-11 150-9.5 52 1.4 98 4.8 144 3" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function TicketStack({ listings }: { listings: ListingCardData[] }) {
  const fan = ["lg:-rotate-[4deg] lg:translate-y-4", "lg:rotate-[1.5deg] lg:-translate-y-1 lg:z-10", "lg:rotate-[5deg] lg:translate-y-5"];
  return (
    <div className="-mx-4 sm:-mx-6 lg:mx-0">
      <ul className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-2 pb-5 sm:px-6 lg:justify-between lg:gap-0 lg:overflow-visible lg:px-0 lg:py-4">
        {listings.map((l, i) => (
          <li
            key={l.id}
            className={cn("w-[66%] shrink-0 snap-center sm:w-[42%] lg:w-[32.5%]", fan[i], "transition-transform duration-300 lg:hover:z-20 lg:hover:-translate-y-2")}
          >
            <Link href={`/items/${l.id}`} className="ticket block p-2 shadow-lift">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[0.85rem] bg-surface">
                <Image src={l.photos[0]} alt={l.title} fill priority sizes="(min-width: 1024px) 240px, 66vw" className="object-cover" />
                <span className="absolute bottom-2 left-2 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold shadow-card">
                  {formatGBP(l.pricePerDay)}
                  <span className="font-normal text-muted">/day</span>
                </span>
              </div>
              <div className="px-1.5 pt-2.5 pb-1">
                <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">For · {DURATIONS[i]}</p>
                <p className="truncate font-display text-[1rem] leading-tight font-semibold">{OCCASIONS[i]}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowItWorks() {
  const renter = [
    { title: "Find it nearby", body: "Search by date and area. You see the daily price and the refundable deposit before you ask." },
    { title: "Pick up and check", body: "Meet the owner, and both of you snap a few photos so the item's condition is on record." },
    { title: "Hand it back", body: "Both confirm the return, your deposit is released, and you rate each other." },
  ];
  const owner = [
    { title: "List it in two minutes", body: "Add photos, set your daily price, deposit, pickup area and the dates it's free." },
    { title: "Accept the requests you like", body: "Booked dates are locked automatically, so nobody can double-book you." },
    { title: "Get paid when it's back", body: "Your payout is released after the return check. You keep 100% of your price." },
  ];
  return (
    <section id="how-it-works" className="mt-16 scroll-mt-24 sm:mt-24" aria-labelledby="how-heading">
      <SectionHeading title="How Just Once works" kicker="Out, back, done" />
      <h2 id="how-heading" className="sr-only">How it works</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Steps heading="Renting" steps={renter} />
        <Steps heading="Lending" steps={owner} />
      </div>
    </section>
  );
}

function Steps({ heading, steps }: { heading: string; steps: { title: string; body: string }[] }) {
  return (
    <div className="rounded-3xl border border-line p-6 sm:p-8">
      <p className="font-display text-lg font-semibold">{heading}</p>
      <ol className="mt-5 space-y-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-medium text-ink">{i + 1}</span>
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Earning({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
      <dt className="text-xs leading-snug text-white/65">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold">{formatGBP(value)}</dd>
    </div>
  );
}
