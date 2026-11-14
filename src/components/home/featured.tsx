import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Rating } from "@/components/ui";
import { areaName } from "@/lib/areas";
import { categoryLabel, conditionLabel } from "@/lib/catalogue";
import { formatGBP } from "@/lib/money";
import type { ListingCardData } from "@/server/queries";
import { RevealSection } from "./reveal-section";

/** "Popular with Londoners": the home page's product showcase. */
export function FeaturedSection({ listings }: { listings: ListingCardData[] }) {
  return (
    <RevealSection className="mt-16 sm:mt-24" labelledBy="featured">
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div>
          <p className="mb-1 font-mono text-xs tracking-[0.14em] text-muted uppercase">
            <span className="word-mask">
              <span data-reveal-line className="inline-block">
                Featured
              </span>
            </span>
          </p>
          <h2 id="featured" className="text-2xl font-semibold sm:text-[2.1rem] sm:leading-tight">
            {["Popular", "with", "Londoners"].map((w, i) => (
              <span key={w}>
                {i > 0 && " "}
                <span className="word-mask">
                  <span data-reveal-line className="inline-block">
                    {w}
                  </span>
                </span>
              </span>
            ))}
          </h2>
        </div>
        <Link href="/search" className="link-arrow hidden items-center gap-1 text-sm font-semibold sm:inline-flex">
          See everything <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listings.map((l) => (
          <FeaturedCard key={l.id} listing={l} />
        ))}
      </div>
    </RevealSection>
  );
}

/**
 * On hover (or keyboard focus) the card swaps to the listing's second photo, a close-up of the same item,
 * which settles from a slight zoom. Price and details stay put and always readable.
 */
function FeaturedCard({ listing: l }: { listing: ListingCardData }) {
  const [first, second] = l.photos;
  const sizes = "(min-width: 1280px) 300px, (min-width: 1024px) 31vw, (min-width: 480px) 46vw, 92vw";
  return (
    <Link href={`/items/${l.id}`} data-card className="feature-card group block rounded-2xl">
      <div data-card-media className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
        {first && <Image src={first} alt={l.title} fill sizes={sizes} className="feature-img feature-img-a object-cover" />}
        {/* Only hover-capable devices ever see the second photo, so touch screens never download it. */}
        {second && <Image src={second} alt="" fill sizes={sizes} className="feature-img feature-img-b hidden object-cover [@media(hover:hover)]:block" />}
        <span className="absolute top-3 left-3 rounded-full bg-paper/90 px-2 py-1 font-mono text-[0.62rem] tracking-[0.12em] text-ink uppercase backdrop-blur-sm">
          {categoryLabel(l.category)}
        </span>
        <span className="feature-cta absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
          Check dates <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
      <div data-card-body>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-sans text-[0.95rem] leading-snug font-semibold tracking-normal">{l.title}</h3>
          <Rating sum={l.ratingSum} count={l.ratingCount} showCount={false} className="shrink-0" />
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {areaName(l.area)} · {conditionLabel(l.condition)}
        </p>
        <p className="mt-1 text-[0.95rem]">
          <span className="font-semibold">{formatGBP(l.pricePerDay)}</span> <span className="text-muted">per day</span>
        </p>
      </div>
    </Link>
  );
}
