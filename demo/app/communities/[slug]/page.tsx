import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, Clock, GraduationCap, Lock, MapPin, MessageCircle } from "lucide-react";
import { MemberTag } from "@/components/community-badge";
import { ListingGrid } from "@/components/listing-card";
import { Avatar, Container, LinkButton } from "@/components/ui";
import { areaName } from "@/lib/areas";
import { cn, plural, shortName as personShort } from "@/lib/cn";
import { postTypeLabel } from "@/lib/communities";
import { formatDateTime } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { ALL_COMMUNITIES, getCommunity, toCard } from "@demo/lib/data";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_COMMUNITIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCommunity((await params).slug);
  return c ? { title: `${c.name} community`, description: c.description } : {};
}

export default async function CommunityPage({ params }: Props) {
  const community = getCommunity((await params).slug);
  if (!community) notFound();
  const TypeIcon = community.type === "COMPANY" ? Building2 : GraduationCap;

  return (
    <Container className="py-6 md:py-10">
      <header className="rounded-3xl bg-ink p-6 text-paper sm:p-8">
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.14em] text-paper/70 uppercase">
          <TypeIcon className="size-3.5" aria-hidden />
          {community.type === "UNIVERSITY" ? "University" : "Company"} community
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{community.name}</h1>
        <p className="mt-2 max-w-2xl text-paper/80">{community.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-paper/80">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden />
            {areaName(community.area)} · {community.handoverSpot}
          </span>
          <span>{plural(community.counts.members, "verified member")}</span>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <LinkButton href={`/search?community=${community.slug}`}>Search {community.shortName} items</LinkButton>
          <span className="flex items-center -space-x-2">
            {community.members.map((m) => (
              <Avatar key={m.id} name={m.name} src={m.avatarUrl} size={32} className="ring-2 ring-ink" />
            ))}
          </span>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="board-heading">
          <h2 id="board-heading" className="text-2xl font-semibold">
            Exchange board
          </h2>
          <p className="mt-1 text-sm text-muted">Members ask for what they need this week, or offer what they can lend. Only verified members can post and reply.</p>
          <ul className="mt-5 space-y-3">
            {community.posts.map((p) => (
              <li key={p.id} className={cn("rounded-2xl border border-line bg-paper p-4", p.status === "FULFILLED" && "opacity-60")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", p.type === "REQUEST" ? "bg-accent text-ink" : "bg-success-soft text-success")}>
                    {postTypeLabel(p.type)}
                  </span>
                  {p.status === "FULFILLED" && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">Sorted</span>}
                  {p.neededInDays !== null && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5" aria-hidden />
                      {p.type === "REQUEST" ? "Needed" : "Free"} {p.neededInDays <= 1 ? (p.neededInDays === 0 ? "today" : "tomorrow") : `in ${p.neededInDays} days`}
                    </span>
                  )}
                  {p.pricePence != null && (
                    <span className="font-mono text-xs text-muted">
                      {p.pricePence === 0 ? "Free" : `${p.type === "REQUEST" ? "Budget" : "Ask"} ${formatGBP(p.pricePence)}${p.type === "OFFER" ? "/day" : ""}`}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-sans text-base font-semibold tracking-normal">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-2">{p.body}</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={p.author.name} src={p.author.avatarUrl} size={24} />
                    <span className="truncate font-medium text-ink-2">{personShort(p.author.name)}</span>
                    <MemberTag shortName={community.shortName} />
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3.5" aria-hidden /> {p.comments.length}
                    </span>
                    {formatDateTime(p.createdAt)}
                  </span>
                </div>
                {p.comments.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-line pt-3">
                    {p.comments.map((cm) => (
                      <li key={cm.id} className="flex gap-2 text-sm">
                        <Avatar name={cm.author.name} src={cm.author.avatarUrl} size={24} />
                        <p className="min-w-0 rounded-2xl bg-surface px-3 py-1.5">
                          <span className="font-semibold">{personShort(cm.author.name)}</span> <span className="text-ink-2">{cm.body}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-accent-soft p-5">
            <p className="flex items-center gap-2 font-semibold">
              <Lock className="size-4" aria-hidden /> Why a community board?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Most first rentals start with a question like &ldquo;does anyone have a&hellip;?&rdquo;. The board is where {community.shortName} people already ask
              it, so it&apos;s how a new community gets going: one request, one lender, then a listing.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-14 border-t border-line pt-10" aria-labelledby="items-heading">
        <h2 id="items-heading" className="text-2xl font-semibold">
          {community.shortName} items
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted">{plural(community.listings.length, "item")} from verified members that anyone can rent.</p>
        {community.hiddenListings > 0 && (
          <p className="mb-6 flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink-2">
            <Lock className="size-4 shrink-0" aria-hidden />
            {plural(community.hiddenListings, "more item")} {community.hiddenListings === 1 ? "is" : "are"} only visible to verified {community.shortName} members.
          </p>
        )}
        <ListingGrid listings={community.listings.map(toCard)} />
      </section>
    </Container>
  );
}
