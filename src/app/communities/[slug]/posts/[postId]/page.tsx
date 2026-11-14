import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { CommentForm } from "@/components/community-forms";
import { MemberTag } from "@/components/community-badge";
import { Avatar, Button, Container, LinkButton } from "@/components/ui";
import { cn, plural, shortName as personShort } from "@/lib/cn";
import { postTypeLabel } from "@/lib/communities";
import { formatDateTime, formatLongDay, toISO } from "@/lib/dates";
import { formatGBP } from "@/lib/money";
import { getCurrentUser } from "@/server/auth";
import { deleteCommunityPost, setCommunityPostStatus } from "@/server/actions/communities";
import { getCommunityBySlug, getCommunityPost, getMembership } from "@/server/communities";

type Props = { params: Promise<{ slug: string; postId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postId } = await params;
  const community = await getCommunityBySlug(slug);
  const post = community ? await getCommunityPost(community.id, postId) : null;
  if (!community || !post) return { title: "Post not found" };
  return { title: `${post.title} · ${community.shortName} exchange board`, description: post.body.slice(0, 150) };
}

export default async function CommunityPostPage({ params }: Props) {
  const { slug, postId } = await params;
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();
  const [post, user] = await Promise.all([getCommunityPost(community.id, postId), getCurrentUser()]);
  if (!post) notFound();
  const membership = user ? await getMembership(user.id, community.id) : null;
  const isMember = membership?.status === "VERIFIED";
  const isAuthor = user?.id === post.author.id;
  const verifyHref = user ? `/communities/${slug}/verify` : `/login?next=${encodeURIComponent(`/communities/${slug}/verify`)}`;

  return (
    <Container className="py-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <Link href={`/communities/${slug}`} className="text-sm font-semibold text-muted hover:text-ink">
          ← {community.shortName} exchange board
        </Link>
        <article className="mt-4 rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", post.type === "REQUEST" ? "bg-accent text-ink" : "bg-success-soft text-success")}>{postTypeLabel(post.type)}</span>
            {post.status === "FULFILLED" && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">Sorted</span>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{post.title}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Avatar name={post.author.name} src={post.author.avatarUrl} size={32} />
            <Link href={`/users/${post.author.id}`} className="font-semibold hover:underline">
              {personShort(post.author.name)}
            </Link>
            <MemberTag shortName={community.shortName} />
            <span className="text-muted">· {formatDateTime(post.createdAt)}</span>
          </div>
          <p className="mt-4 whitespace-pre-line text-ink-2">{post.body}</p>
          {(post.neededBy || post.pricePence != null) && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {post.neededBy && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-muted" aria-hidden />
                  <dt className="text-muted">{post.type === "REQUEST" ? "Needed by" : "Available from"}</dt>
                  <dd className="font-semibold">{formatLongDay(toISO(post.neededBy))}</dd>
                </div>
              )}
              {post.pricePence != null && (
                <div className="flex items-center gap-1.5">
                  <dt className="text-muted">{post.type === "REQUEST" ? "Budget" : "Price"}</dt>
                  <dd className="font-semibold">
                    {formatGBP(post.pricePence)}
                    {post.type === "OFFER" ? " a day" : ""}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {post.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {post.photos.map((src) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface">
                  <Image src={src} alt="" fill sizes="(min-width: 640px) 320px, 45vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
          {isAuthor && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <form action={setCommunityPostStatus}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="status" value={post.status === "OPEN" ? "FULFILLED" : "OPEN"} />
                <Button type="submit" variant="secondary" size="sm">
                  {post.status === "OPEN" ? "Mark as sorted" : "Reopen"}
                </Button>
              </form>
              {post.type === "OFFER" && post.status === "OPEN" && (
                <LinkButton href={`/listings/new?community=${community.id}`} variant="secondary" size="sm">
                  Turn into a listing
                </LinkButton>
              )}
              <form action={deleteCommunityPost}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="postId" value={post.id} />
                <Button type="submit" variant="danger" size="sm">
                  Delete
                </Button>
              </form>
            </div>
          )}
        </article>

        <section className="mt-8" aria-labelledby="replies">
          <h2 id="replies" className="text-lg font-semibold">
            {plural(post.comments.length, "reply", "replies")}
          </h2>
          <ul className="mt-4 space-y-4">
            {post.comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.author.name} src={c.author.avatarUrl} size={32} />
                <div className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{personShort(c.author.name)}</span>
                    {c.author.id === post.author.id && <span className="text-xs text-muted">Author</span>}
                    <span className="text-xs text-muted">{formatDateTime(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-ink-2">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {isMember ? (
              <CommentForm slug={slug} postId={post.id} />
            ) : (
              <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink-2">
                Only verified {community.shortName} members can reply.{" "}
                <Link href={verifyHref} className="font-semibold underline underline-offset-4">
                  Verify with {community.shortName}
                </Link>
              </p>
            )}
          </div>
        </section>
      </div>
    </Container>
  );
}
