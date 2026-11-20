import { FeaturedSection } from "@/components/home/featured";
import { Hero } from "@/components/home/hero";
import { CategoriesSection, CommunitiesSection, HowItWorks } from "@/components/home/sections";
import { ListingGrid } from "@/components/listing-card";
import { Container, SectionHeading } from "@/components/ui";
import { StorySection } from "@demo/components/story-section";
import { ALL_COMMUNITIES, getHomeData } from "@demo/lib/data";

export default function HomePage() {
  const { featured, latest, counts, hero, stats } = getHomeData();
  const communities = ALL_COMMUNITIES.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    shortName: c.shortName,
    type: c.type,
    _count: c.counts,
  }));

  return (
    <>
      <Hero tickets={hero} stats={stats} lendHref="/communities" ai={false} communities={communities} viewerCommunity="" />

      <Container>
        <StorySection />
      </Container>

      <Container className="mt-16 sm:mt-20">
        <CommunitiesSection communities={communities} mine={[]} />
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
      </Container>
    </>
  );
}
