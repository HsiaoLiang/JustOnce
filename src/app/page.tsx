import { FeaturedSection } from "@/components/home/featured";
import { Hero } from "@/components/home/hero";
import { CategoriesSection, CommunitiesSection, HowItWorks, OwnersBand } from "@/components/home/sections";
import { ListingGrid } from "@/components/listing-card";
import { Container, SectionHeading } from "@/components/ui";
import { getHomeData } from "@/server/queries";
import { aiEnabled } from "@/server/ai";
import { getCurrentUser } from "@/server/auth";
import { getViewerCommunityIds, listCommunities } from "@/server/communities";

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
        <CategoriesSection counts={counts} />

        <FeaturedSection listings={featured} />

        <section className="mt-16 sm:mt-20" aria-labelledby="latest">
          <SectionHeading title="Just listed" kicker="New in" />
          <h2 id="latest" className="sr-only">Just listed</h2>
          <ListingGrid listings={latest} />
        </section>

        <HowItWorks />

        <OwnersBand lendHref={user ? "/listings/new" : "/signup?next=/listings/new"} />
      </Container>
    </>
  );
}
