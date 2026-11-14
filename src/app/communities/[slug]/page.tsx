import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Clock, GraduationCap, MapPin, MessageCircle, Plus } from "lucide-react";
import { NewPostForm } from "@/components/community-forms";
import { MemberTag } from "@/components/community-badge";
import { ListingGrid } from "@/components/listing-card";
import { Avatar, Container, EmptyState, LinkButton } from "@/components/ui";
import { areaName } from "@/lib/areas";
import { cn, plural, shortName as personShort } from "@/lib/cn";
import { communityWords, postTypeLabel } from "@/lib/communities";
import { formatDateTime, formatDay, todayInLondon, toISO } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { getCurrentUser } from "@/server/auth";
import { getCommunityBySlug, getCommunityPage, getMembership, getViewer } from "@/server/communities";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const community = await getCommunityBySlug((await params).slug);
  if (!community) return { title: "Community not found" };
  return { title: `${community.name} community`, description: community.description };
}

export default async function CommunityPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();
  const tab = sp.tab === "items" ? "items" : "board";
  const type = sp.type === "REQUEST" || sp.type === "OFFER" ? sp.type : undefined;
  const [user, viewer] = await Promise.all([getCurrentUser(), getViewer()]);
  const membership = user ? await getMembership(user.id, community.id) : null;
  const isMember = membership?.status === "VERIFIED";
  const { memberCount, posts, listings } = await getCommunityPage(community.id, { tab, type, viewer });
  const verifyHref = user ? `/communities/${slug}/verify` : `/login?next=${encodeURIComponent(`/communities/${slug}/verify`)}`;
  const words = communityWords(community.type);
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
            {areaName(community.area)}
            {community.handoverSpot ? ` · ${community.handoverSpot}` : ""}
          </span>
          <span>{plural(memberCount, "verified member")}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {isMember ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink">
              <TypeIcon className="size-4" aria-hidden /> You&apos;re a verified {community.shortName} member
            </span>
          ) : membership?.status === "PENDING" && membership.method === "ID_CARD" ? (
            <span className="rounded-full bg-paper/15 px-4 py-2 text-sm font-semibold">ID card in review</span>
          ) : (
            <LinkButton href={verifyHref}>Verify with {community.shortName}</LinkButton>
          )}
          <LinkButton href={`/search?community=${community.slug}`} variant="secondary">
            Search {community.shortName} items
          </LinkButton>
          {isMember && (
            <LinkButton href={`/listings/new?community=${community.id}`} variant="secondary">
              List with {community.shortName}
            </LinkButton>
          )}
        </div>
      </header>

      <nav aria-label="Community sections" className="mt-6 flex gap-2 border-b border-line">
        {(
          [
            { id: "board", label: "Exchange board" },
            { id: "items", label: `${community.shortName} items` },
          ] as const
        ).map((t) => (
          <Link
            key={t.id}
            href={t.id === "board" ? `/communities/${slug}` : `/communities/${slug}?tab=items`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-3 text-sm font-semibold", tab === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "items" ? (
        <section className="mt-6">
          {!isMember && (
            <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink-2">
              Some {community.shortName} items are members only. <Link href={verifyHref} className="font-semibold underline underline-offset-4">Verify</Link> to see them all.
            </p>
          )}
          {listings.length ? (
            <ListingGrid listings={listings} />
          ) : (
            <EmptyState title={`No ${community.shortName} items yet`} body={`Be the first to list something for your ${words.peers}.`} />
          )}
        </section>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
          <section aria-label="Posts">
            <div className="mb-4 flex gap-2">
              {[
                { id: undefined, label: "All" },
                { id: "REQUEST", label: "Looking for" },
                { id: "OFFER", label: "Have to lend" },
              ].map((f) => (
                <Link
                  key={f.label}
                  href={f.id ? `/communities/${slug}?type=${f.id}` : `/communities/${slug}`}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", type === f.id ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink")}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            {posts.length ? (
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/communities/${slug}/posts/${p.id}`} className={cn("block rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-ink", p.status === "FULFILLED" && "opacity-60")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", p.type === "REQUEST" ? "bg-accent text-ink" : "bg-success-soft text-success")}>{postTypeLabel(p.type)}</span>
                        {p.status === "FULFILLED" && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">Sorted</span>}
                        {p.neededBy && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Clock className="size-3.5" aria-hidden />
                            {p.type === "REQUEST" ? "By" : "From"} {formatDay(toISO(p.neededBy))}
                          </span>
                        )}
                        {p.pricePence != null && <span className="font-mono text-xs text-muted">{p.type === "REQUEST" ? "Budget" : "Ask"} {formatGBP(p.pricePence)}{p.type === "OFFER" ? "/day" : ""}</span>}
                      </div>
                      <h2 className="mt-2 font-sans text-base font-semibold tracking-normal">{p.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.body}</p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={p.author.name} src={p.author.avatarUrl} size={24} />
                          <span className="truncate font-medium text-ink-2">{personShort(p.author.name)}</span>
                          <MemberTag shortName={community.shortName} />
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="size-3.5" aria-hidden /> {p._count.comments}
                          </span>
                          {formatDateTime(p.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing on the board yet" body="Ask for something you need for a class, interview or event, or offer something you can lend." />
            )}
          </section>
          <aside id="new-post" className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-line bg-paper p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="size-5" aria-hidden /> New post
              </h2>
              {isMember ? (
                <div className="mt-4">
                  <NewPostForm slug={slug} today={todayInLondon()} />
                </div>
              ) : (
                <div className="mt-2 space-y-3 text-sm text-ink-2">
                  <p>Only verified {community.shortName} members can post and reply, so you always know who you&apos;re dealing with.</p>
                  <LinkButton href={verifyHref} size="sm">
                    Verify with {community.shortName}
                  </LinkButton>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </Container>
  );
}
