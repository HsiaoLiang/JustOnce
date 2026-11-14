import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturedSection } from "@/components/home/featured";
import { Hero } from "@/components/home/hero";
import { ListingGrid } from "@/components/listing-card";
import { Container, LinkButton, SectionHeading } from "@/components/ui";
import { CATEGORY_GROUPS, categoriesInGroup, type CategoryInfo } from "@/lib/catalogue";
import { formatGBP } from "@/lib/money";
import { cn, plural } from "@/lib/cn";
import { getHomeData } from "@/server/queries";
import { aiEnabled } from "@/server/ai";
import { getCurrentUser } from "@/server/auth";
import { getViewerCommunityIds, listCommunities } from "@/server/communities";
import { BadgeCheck, Building2, GraduationCap, MessagesSquare, SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ featured, latest, counts, hero, stats }, user, communities, mine] = await Promise.all([getHomeData(), getCurrentUser(), listCommunities(), getViewerCommunityIds()]);
  const viewerCommunity = communities.find((c) => mine.includes(c.id))?.slug ?? "";

  return (
    <>
      {/* Hero: the occasion comes first, the item second. */}
      <Hero tickets={hero} stats={stats} lendHref={user ? "/listings/new" : "/signup?next=/listings/new"} ai={aiEnabled()} communities={communities} viewerCommunity={viewerCommunity} />

      <Container>
        <CommunitiesSection communities={communities} mine={mine} />
      </Container>

      <Container>
        <section aria-labelledby="categories" className="pt-16 sm:pt-20">
          <SectionHeading title="What do you need it for?" kicker="Browse" />
          <h2 id="categories" className="sr-only">Categories</h2>
          <div className="space-y-8 sm:space-y-10">
            {CATEGORY_GROUPS.map((group, gi) => (
              <div key={group.id}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:mb-4">
                  <h3 className="text-lg font-semibold sm:text-xl">{group.label}</h3>
                  <p className="text-sm text-muted">{group.blurb}</p>
                </div>
                {/* A swipeable row on phones, a grid from tablet up. */}
                <div
                  className={cn(
                    "scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0",
                    group.id === "FASHION" ? "sm:grid-cols-4" : "sm:grid-cols-3",
                  )}
                >
                  {categoriesInGroup(group.id).map((c, i) => (
                    <CategoryTile key={c.id} category={c} count={counts[c.id] ?? 0} wide={group.id === "KIT"} priority={gi === 0 && i < 4} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <FeaturedSection listings={featured} />

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

function CategoryTile({ category: c, count, wide, priority }: { category: CategoryInfo; count: number; wide: boolean; priority: boolean }) {
  return (
    <Link
      href={`/search?category=${c.slug}`}
      className={cn(
        "group relative aspect-[4/5] w-[42vw] max-w-56 shrink-0 snap-start overflow-hidden rounded-2xl bg-surface sm:w-auto sm:max-w-none",
        wide ? "sm:aspect-[4/3]" : "sm:aspect-square lg:aspect-[4/5]",
      )}
    >
      <Image
        src={c.image}
        alt=""
        fill
        priority={priority}
        sizes={wide ? "(min-width: 640px) 33vw, 42vw" : "(min-width: 1024px) 300px, (min-width: 640px) 25vw, 42vw"}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 pt-16 text-white sm:p-5">
        <p className="font-display text-xl font-semibold sm:text-2xl">{c.label}</p>
        <p className="mt-0.5 hidden text-sm text-white/85 sm:block">{c.blurb}</p>
        <p className="mt-2 inline-flex items-center gap-1 font-mono text-[0.7rem] tracking-[0.12em] uppercase">
          {count} {count === 1 ? "item" : "items"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </p>
      </div>
    </Link>
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

type CommunitySummary = Awaited<ReturnType<typeof listCommunities>>[number];

function CommunitiesSection({ communities, mine }: { communities: CommunitySummary[]; mine: string[] }) {
  if (!communities.length) return null;
  const steps = [
    { icon: BadgeCheck, title: "Verify once", body: "Use your school or work email, or upload your ID card." },
    { icon: SlidersHorizontal, title: "Filter to your people", body: "Search everyone in London, or only your community." },
    { icon: MessagesSquare, title: "Ask the board", body: "Post what you need or what you can lend this week." },
  ];
  return (
    <section className="overflow-hidden rounded-3xl bg-ink text-paper" aria-labelledby="communities-heading">
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.35fr] lg:gap-12 lg:p-12">
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">Communities</p>
          <h2 id="communities-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">Borrow from people on your campus or in your office.</h2>
          <ol className="mt-6 space-y-4">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
                  <s.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-paper/70">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <LinkButton href="/communities" className="mt-7">
            Find your community
          </LinkButton>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {communities.map((c) => {
            const Icon = c.type === "COMPANY" ? Building2 : GraduationCap;
            const joined = mine.includes(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/communities/${c.slug}`}
                  className="group flex h-full flex-col rounded-2xl bg-paper/[0.06] p-5 ring-1 ring-paper/10 transition-colors hover:bg-paper/[0.12]"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full bg-paper/10">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {joined && <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-semibold text-ink">You&apos;re in</span>}
                  </span>
                  <p className="mt-4 font-display text-xl leading-tight font-semibold">{c.shortName}</p>
                  <p className="mt-0.5 text-xs text-paper/65">{c.name}</p>
                  <p className="mt-auto flex items-center gap-1 pt-4 font-mono text-[0.7rem] tracking-[0.12em] text-paper/80 uppercase">
                    {plural(c._count.members, "member")} · {plural(c._count.listings, "item")} · {plural(c._count.posts, "open post")}
                    <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
