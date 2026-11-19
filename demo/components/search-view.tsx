"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, GraduationCap, Lock, Search, Users } from "lucide-react";
import { ListingGrid } from "@/components/listing-card";
import { EmptyState } from "@/components/ui";
import { areaFilterLabel, areaFilterSlugs } from "@/lib/areas";
import { CATEGORIES, categoryBySlug } from "@/lib/catalogue";
import { cn, plural } from "@/lib/cn";
import type { ListingCardData } from "@/server/queries";

type Community = { slug: string; shortName: string; name: string; type: "UNIVERSITY" | "COMPANY" };

/** Search that runs in the browser over every listing: the static stand-in for the real search page. */
export function SearchView({ listings, communities }: { listings: ListingCardData[]; communities: Community[] }) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(categoryBySlug(params.get("category") ?? undefined)?.id ?? "");
  const [community, setCommunity] = useState(communities.some((c) => c.slug === params.get("community")) ? params.get("community")! : "");
  const [area, setArea] = useState(areaFilterSlugs(params.get("area") ?? undefined) ? params.get("area")! : "");

  // Keep the URL shareable without a round trip to a server.
  function update(next: { q?: string; category?: string; community?: string; area?: string }) {
    const merged = { q, category, community, area, ...next };
    if (next.q !== undefined) setQ(next.q);
    if (next.category !== undefined) setCategory(next.category);
    if (next.community !== undefined) setCommunity(next.community);
    if (next.area !== undefined) setArea(next.area);
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.category) sp.set("category", CATEGORIES.find((c) => c.id === merged.category)?.slug ?? "");
    if (merged.community) sp.set("community", merged.community);
    if (merged.area) sp.set("area", merged.area);
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const areas = areaFilterSlugs(area || undefined);
    return listings.filter((l) => {
      if (community && l.community?.slug !== community) return false;
      if (category && l.category !== category) return false;
      if (areas && !areas.includes(l.area)) return false;
      const text = `${l.title} ${CATEGORIES.find((c) => c.id === l.category)?.label ?? ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [listings, q, category, community, area]);

  const selected = communities.find((c) => c.slug === community);
  const areaLabel = areaFilterLabel(area || undefined);

  return (
    <>
      <div className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Browse</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{selected ? `Rent from ${selected.shortName} people` : "Rent it for the weekend"}</h1>
        <p className="mt-2 text-muted">
          {selected
            ? `Only items listed by verified ${selected.name} members. Members-only items stay hidden until you verify with ${selected.shortName}.`
            : "Everything listed by people across London. Pick a community to see only items from people you share a campus or office with."}
        </p>
      </div>

      <section aria-label="Filter by community" className="mt-6">
        <p className="mb-2 text-sm font-semibold">Who are you renting from?</p>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Pill active={!community} onClick={() => update({ community: "" })}>
            <Users className="size-4" aria-hidden /> Everyone in London
          </Pill>
          {communities.map((c) => {
            const Icon = c.type === "COMPANY" ? Building2 : GraduationCap;
            return (
              <Pill key={c.slug} active={community === c.slug} onClick={() => update({ community: c.slug })}>
                <Icon className="size-4" aria-hidden /> {c.shortName} only
              </Pill>
            );
          })}
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="flex h-12 items-center gap-2 rounded-full border border-line-strong bg-paper px-4 focus-within:border-ink">
          <Search className="size-5 text-muted" aria-hidden />
          <span className="sr-only">Search</span>
          <input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="Tuxedo, tent, camera…" className="w-full bg-transparent focus:outline-none" />
        </label>
        <label className="flex h-12 items-center rounded-full border border-line-strong bg-paper px-4 focus-within:border-ink">
          <span className="sr-only">Category</span>
          <select value={category} onChange={(e) => update({ category: e.target.value })} className="w-full cursor-pointer bg-transparent focus:outline-none">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <p className="font-semibold">{plural(results.length, "item")}</p>
        {selected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">
            <Lock className="size-3.5" aria-hidden /> Verified {selected.shortName} members
          </span>
        )}
        {areaLabel && (
          <button type="button" onClick={() => update({ area: "" })} className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-semibold hover:border-ink">
            {areaLabel} ✕
          </button>
        )}
      </div>

      {results.length ? (
        <ListingGrid listings={results} priorityCount={4} />
      ) : (
        <EmptyState
          title="Nothing matches yet"
          body={selected ? `Nobody at ${selected.shortName} has listed that. In the real app you'd ask on the exchange board.` : "Try another word or category."}
        />
      )}
    </>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
        active ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}
