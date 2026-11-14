import type { Metadata } from "next";
import Link from "next/link";
import { Building2, GraduationCap, MapPin } from "lucide-react";
import { Container } from "@/components/ui";
import { areaName } from "@/lib/areas";
import { plural } from "@/lib/cn";
import { listCommunities, getViewerCommunityIds } from "@/server/communities";

export const metadata: Metadata = {
  title: "Communities",
  description: "Borrow from people at your school or company. Verify with your school or work email and see members-only items and the exchange board.",
};

export default async function CommunitiesPage() {
  const [communities, mine] = await Promise.all([listCommunities(), getViewerCommunityIds()]);
  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Schools and companies</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Rent from people you already share a building with</h1>
        <p className="mt-2 text-muted">Verify with your school or work email (or ID card), then filter search to your community, see members-only items and ask for what you need on the exchange board.</p>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => {
          const Icon = c.type === "UNIVERSITY" ? GraduationCap : Building2;
          const member = mine.includes(c.id);
          return (
            <li key={c.id}>
              <Link href={`/communities/${c.slug}`} className="block h-full rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-ink">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {member && <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">You&apos;re verified</span>}
                </div>
                <h2 className="mt-4 text-lg font-semibold">{c.name}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-3.5" aria-hidden />
                  {areaName(c.area)}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-ink-2">{c.description}</p>
                <p className="mt-4 font-mono text-xs text-muted">
                  {plural(c._count.members, "member")} · {plural(c._count.listings, "item")} · {plural(c._count.posts, "open post")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
