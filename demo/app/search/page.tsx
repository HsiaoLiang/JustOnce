import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui";
import { SearchView } from "@demo/components/search-view";
import { ALL_COMMUNITIES, toCard, VISIBLE_LISTINGS } from "@demo/lib/data";

export const metadata: Metadata = { title: "Browse" };

export default function SearchPage() {
  const communities = ALL_COMMUNITIES.map((c) => ({ slug: c.slug, shortName: c.shortName, name: c.name, type: c.type }));
  return (
    <Container className="py-8 md:py-12">
      {/* useSearchParams needs a Suspense boundary in a static export. */}
      <Suspense>
        <SearchView listings={VISIBLE_LISTINGS.map(toCard)} communities={communities} />
      </Suspense>
    </Container>
  );
}
