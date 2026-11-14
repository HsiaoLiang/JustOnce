import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Sparkles, X } from "lucide-react";
import { SearchResults } from "@/components/search-results";
import { publicPin } from "@/lib/geo";
import { SearchFilters } from "@/components/search-filters";
import { Container, LinkButton } from "@/components/ui";
import { areaFilterLabel } from "@/lib/areas";
import { CATEGORIES, categoryLabel } from "@/lib/catalogue";
import { formatRange, todayInLondon } from "@/lib/dates";
import { cn, plural } from "@/lib/cn";
import { parseSearch, searchHref } from "@/lib/search-params";
import { searchListings } from "@/server/queries";
import { communityOptions, getViewer } from "@/server/communities";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseSearch(await searchParams);
  return { title: f.category ? `Rent ${categoryLabel(f.category).toLowerCase()} in London` : "Search rentals" };
}

export default async function SearchPage({ searchParams }: Props) {
  const raw = await searchParams;
  const filters = parseSearch(raw);
  const via = raw.via === "ai" || raw.via === "photo" ? raw.via : null;
  // Set by /search/situation when the AI couldn't turn the description into filters.
  const aiMissed = typeof raw.ai === "string" && ["quota", "key", "model", "timeout", "provider", "busy"].includes(raw.ai) ? raw.ai : null;
  const [communities, viewer] = await Promise.all([communityOptions(), getViewer()]);
  const community = communities.find((c) => c.slug === filters.community);
  const listings = await searchListings({
    communityId: community?.id,
    viewer,
    q: filters.q,
    category: filters.category,
    area: filters.area,
    from: filters.from,
    to: filters.to,
    maxPrice: filters.max ? filters.max * 100 : undefined,
    sort: filters.sort,
    bbox: filters.bbox,
    delivery: filters.delivery,
  });
  // Approximate public pins only: no exact pickup point is ever selected here.
  const items = listings.map((l) => ({ ...l, pin: publicPin(l.id, l.area) }));

  const areaLabel = areaFilterLabel(filters.area);
  const heading = `${filters.category ? categoryLabel(filters.category) : filters.q ? `“${filters.q}”` : "Everything"} ${areaLabel ? `in ${areaLabel}` : "in London"}`;
  const active = [
    filters.q && { label: `“${filters.q}”`, href: searchHref(filters, { q: undefined }) },
    areaLabel && { label: areaLabel, href: searchHref(filters, { area: undefined }) },
    filters.from && filters.to && { label: formatRange(filters.from, filters.to), href: searchHref(filters, { from: undefined, to: undefined }) },
    filters.max && { label: `Up to £${filters.max}/day`, href: searchHref(filters, { max: undefined }) },
    filters.bbox && { label: "Map area", href: searchHref(filters, { bbox: undefined }) },
    filters.delivery && { label: "Delivery available", href: searchHref(filters, { delivery: undefined }) },
    community && { label: `${community.shortName} community`, href: searchHref(filters, { community: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <Container className="py-6 md:py-8">
      <nav aria-label="Categories" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <CategoryChip href={searchHref(filters, { category: undefined })} active={!filters.category} label="All" />
        {CATEGORIES.map((c) => (
          <CategoryChip key={c.id} href={searchHref(filters, { category: c.slug })} active={filters.category === c.id} label={c.label} />
        ))}
      </nav>

      {communities.length > 0 && (
        <nav aria-label="Communities" className="scrollbar-none -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <span className="shrink-0 font-mono text-[0.7rem] tracking-[0.14em] text-muted uppercase">Community</span>
          <CategoryChip href={searchHref(filters, { community: undefined })} active={!community} label="All London" />
          {communities.map((c) => (
            <CategoryChip key={c.id} href={searchHref(filters, { community: c.slug })} active={community?.id === c.id} label={`${c.shortName} only`} />
          ))}
        </nav>
      )}

      <SearchFilters filters={filters} today={todayInLondon()} activeCount={active.filter((a) => !a.label.startsWith("“")).length} />

      <div className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-muted">
            {plural(listings.length, "item")}
            {filters.from && filters.to ? ` free ${formatRange(filters.from, filters.to)}` : " to rent"}
          </p>
        </div>
        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <Link key={a.label} href={a.href} className="inline-flex items-center gap-1 rounded-full bg-surface py-1.5 pr-2 pl-3 text-sm font-medium hover:bg-surface-2">
                {a.label}
                <X className="size-3.5 text-muted" aria-label="Remove filter" />
              </Link>
            ))}
            <Link href={filters.category ? `/search?category=${filters.categorySlug}` : "/search"} className="px-2 text-sm font-semibold underline underline-offset-4">
              Clear all
            </Link>
          </div>
        )}
      </div>

      {via && (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
          <span>
            {via === "photo"
              ? "These are items like the one in your photo. We matched on the kind of item, not the exact model, so remove or change any filter above that we got wrong."
              : "We turned your description into the filters above. Remove or change any that we got wrong. Sizes aren't filtered yet, so check the size on each item."}
          </span>
        </p>
      )}

      {aiMissed && (
        <p role="status" className="mb-6 rounded-xl bg-surface px-4 py-3 text-sm text-ink-2">
          {aiMissed === "quota"
            ? "The AI has used up its quota for now, so this is a plain keyword search for what you typed."
            : aiMissed === "busy"
              ? "Lots of people are describing what they need right now, so this is a plain keyword search for what you typed."
              : aiMissed === "key" || aiMissed === "model"
                ? "The AI isn't set up correctly right now, so this is a plain keyword search for what you typed."
                : "The AI couldn't read your description just now, so this is a plain keyword search for what you typed."}{" "}
          Use the filters above to narrow it down.
        </p>
      )}

      {listings.length > 0 ? (
        <SearchResults key={JSON.stringify(filters)} items={items} view={filters.view} query={filters.from && filters.to ? `start=${filters.from}&end=${filters.to}` : undefined} />
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center">
          <SearchX className="size-8 text-muted" aria-hidden />
          <p className="mt-3 font-display text-xl font-semibold">Nothing matches all of that</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Try different dates, a wider area or fewer keywords. New things are listed every week.
          </p>
          <LinkButton href="/search" variant="secondary" className="mt-6">
            Show everything
          </LinkButton>
        </div>
      )}
    </Container>
  );
}

function CategoryChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active ? "border-ink bg-ink text-white" : "border-line-strong bg-paper hover:border-ink",
      )}
    >
      {label}
    </Link>
  );
}
