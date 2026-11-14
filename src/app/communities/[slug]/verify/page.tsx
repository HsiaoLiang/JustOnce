import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VerifyCommunityForms } from "@/components/community-forms";
import { Container } from "@/components/ui";
import { communityWords, maskEmail } from "@/lib/communities";
import { requireUser } from "@/server/auth";
import { getCommunityBySlug, getMembership } from "@/server/communities";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const community = await getCommunityBySlug((await params).slug);
  return { title: community ? `Verify with ${community.shortName}` : "Community not found", robots: { index: false } };
}

export default async function VerifyCommunityPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/communities/${slug}/verify`);
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();
  const membership = await getMembership(user.id, community.id);
  if (membership?.status === "VERIFIED") redirect(`/communities/${slug}`);
  const pendingEmail =
    membership?.method === "EMAIL" && membership.status === "PENDING" && membership.email && membership.codeExpiresAt && membership.codeExpiresAt > new Date()
      ? maskEmail(membership.email)
      : null;

  const words = communityWords(community.type);

  return (
    <Container className="py-8 md:py-12">
      <div className="mx-auto max-w-lg">
        <Link href={`/communities/${slug}`} className="text-sm font-semibold text-muted hover:text-ink">
          ← {community.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Verify with {community.shortName}</h1>
        <p className="mt-2 text-muted">
          Verified members get a {community.shortName} badge, can see members-only items, and can post on the exchange board. Your {words.email} is never shown to anyone.
        </p>
        {membership?.status === "REJECTED" && (
          <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">Your last ID card couldn&apos;t be approved. Try your {words.email}, or upload a clearer photo.</p>
        )}
        <div className="mt-8">
          <VerifyCommunityForms
            slug={slug}
            shortName={community.shortName}
            type={community.type}
            domains={community.domains}
            pendingEmail={pendingEmail}
            pendingIdCard={membership?.method === "ID_CARD" && membership.status === "PENDING"}
          />
        </div>
      </div>
    </Container>
  );
}
