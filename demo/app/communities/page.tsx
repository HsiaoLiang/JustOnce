import type { Metadata } from "next";
import Link from "next/link";
import { Building2, GraduationCap, MapPin } from "lucide-react";
import { Container } from "@/components/ui";
import { areaName } from "@/lib/areas";
import { plural } from "@/lib/cn";
import { ALL_COMMUNITIES } from "@demo/lib/data";

export const metadata: Metadata = {
  title: "Communities",
  description: "Borrow from people at your school or company, with members-only items and an exchange board.",
};

export default function CommunitiesPage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Schools and companies</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Rent from people you already share a building with</h1>
        <p className="mt-2 text-muted">
          Members verify with their school or work email (or ID card). Then they can filter search to their community, see members-only items and ask for what
          they need on the exchange board.
        </p>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_COMMUNITIES.map((c) => {
          const Icon = c.type === "UNIVERSITY" ? GraduationCap : Building2;
          return (
            <li key={c.id}>
              <Link href={`/communities/${c.slug}`} className="block h-full rounded-2xl border border-line bg-paper p-5 transition-colors hover:border-ink">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{c.name}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-3.5" aria-hidden />
                  {areaName(c.area)}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-ink-2">{c.description}</p>
                <p className="mt-4 font-mono text-xs text-muted">
                  {plural(c.counts.members, "member")} · {plural(c.counts.listings, "item")} · {plural(c.counts.posts, "open post")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
