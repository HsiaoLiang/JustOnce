import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { HeroSearch } from "@/components/hero-search";
import { PhotoSearch } from "@/components/photo-search";
import { SituationSearch } from "@/components/situation-search";
import { Container } from "@/components/ui";
import { formatGBP } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { ListingCardData } from "@/server/queries";
import { HeroMotion } from "./hero-motion";

/** Each ticket is an occasion; the headline's last word rolls to it. The first word is what the page says without JavaScript. */
export const OCCASION_WORDS = ["weekend", "wedding", "festival", "shoot"] as const;
const TICKETS = [
  { occasion: "Black-tie wedding", duration: "1 night" },
  { occasion: "Festival weekend", duration: "3 days" },
  { occasion: "Sunrise shoot", duration: "1 day" },
];

/** A word inside a mask, so it can rise into view from below its own baseline. */
function Word({ children }: { children: ReactNode }) {
  return (
    <span className="word-mask">
      <span data-word className="inline-block">
        {children}
      </span>
    </span>
  );
}

export function Hero({
  tickets,
  stats,
  lendHref,
  ai,
}: {
  tickets: ListingCardData[];
  stats: { items: number; rentals: number; rating: string | null };
  lendHref: string;
  ai: boolean;
}) {
  return (
    <HeroMotion>
      <Container className="pt-8 pb-12 md:pt-14 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.08fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <h1 className="max-w-2xl text-[2.75rem] leading-[0.98] font-semibold tracking-[-0.04em] sm:text-[4.1rem] lg:text-[4.6rem] xl:text-[5.2rem]">
              <span className="sr-only">Why buy it for one weekend?</span>
              <span aria-hidden className="block">
                <Word>Why</Word> <Word>buy</Word> <Word>it</Word> <Word>for</Word>{" "}
                <span data-occasion className="relative inline-block whitespace-nowrap">
                  <Word>one</Word>{" "}
                  <span data-roller className="roller">
                    {OCCASION_WORDS.map((w, i) => (
                      <span key={w} data-roller-word={i} className={cn("inline-block", i > 0 && "roller-idle")}>
                        {w}?
                      </span>
                    ))}
                  </span>
                  <Underline />
                </span>
              </span>
            </h1>
            <p data-hero-fade className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
              Rent outfits, bags, jewellery, cameras and camping kit from people near you in London. Pick it up, use it, hand it back.
            </p>
            {stats.rentals > 0 && (
              <p data-hero-fade className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
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
            <TicketStack listings={tickets} />
          </div>

          <div data-hero-search className="min-w-0 lg:col-span-2">
            <HeroSearch />
            {ai && (
              <>
                <SituationSearch />
                <PhotoSearch />
              </>
            )}
            <p className="mt-4 text-sm text-muted">
              Got something gathering dust?{" "}
              <Link href={lendHref} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                Lend it out
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </HeroMotion>
  );
}

function Underline() {
  return (
    <span data-underline className="absolute -bottom-2 left-0 -z-10 block h-3 w-full origin-left text-accent sm:-bottom-3 sm:h-4">
      <svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden className="block size-full">
        <path d="M3 13c48-8 98-11 150-9.5 52 1.4 98 4.8 144 3" pathLength={1} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function TicketStack({ listings }: { listings: ListingCardData[] }) {
  // The fan lives in CSS (rotate/translate); GSAP animates transforms on top of it, so the two never fight.
  const fan = ["lg:-rotate-[4deg] lg:translate-y-4", "lg:rotate-[1.5deg] lg:-translate-y-1 lg:z-10", "lg:rotate-[5deg] lg:translate-y-5"];
  return (
    <div className="-mx-4 sm:-mx-6 lg:mx-0">
      <ul data-tickets className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-3 pb-6 sm:px-6 lg:justify-between lg:gap-0 lg:overflow-visible lg:px-0 lg:py-4">
        {listings.map((l, i) => (
          <li key={l.id} data-ticket={i} className={cn("w-[66%] shrink-0 snap-center sm:w-[42%] lg:w-[32.5%]", fan[i])}>
            <div data-ticket-depth>
              <Link href={`/items/${l.id}`} data-ticket-card className="ticket hero-ticket block p-2 shadow-lift">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[0.85rem] bg-surface">
                  <Image src={l.photos[0]} alt={l.title} fill priority sizes="(min-width: 1024px) 260px, 66vw" className="object-cover" />
                  <span data-ticket-price className="absolute bottom-2 left-2 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold shadow-card">
                    {formatGBP(l.pricePerDay)}
                    <span className="font-normal text-muted">/day</span>
                  </span>
                </div>
                <div className="px-1.5 pt-2.5 pb-1">
                  <p className="hero-ticket-label font-mono text-[0.62rem] tracking-[0.14em] text-muted uppercase">For · {TICKETS[i]?.duration}</p>
                  <p className="truncate font-display text-[1rem] leading-tight font-semibold">{TICKETS[i]?.occasion}</p>
                </div>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
