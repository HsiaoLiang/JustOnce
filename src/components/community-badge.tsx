import Link from "next/link";
import { GraduationCap, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

/** "LBS community" or "LBS members only" pill, linking to the community page. */
export function CommunityBadge({ slug, shortName, membersOnly = false, link = true, className }: { slug: string; shortName: string; membersOnly?: boolean; link?: boolean; className?: string }) {
  const Icon = membersOnly ? Lock : GraduationCap;
  const classes = cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
    membersOnly ? "bg-ink text-paper" : "bg-accent-soft text-ink",
    className,
  );
  const content = (
    <>
      <Icon className="size-3.5" aria-hidden />
      {membersOnly ? `${shortName} members only` : `${shortName} community`}
    </>
  );
  return link ? (
    <Link href={`/communities/${slug}`} className={cn(classes, "hover:opacity-90")}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}

/** Small "Verified LBS" tag shown next to people on the exchange board. */
export function MemberTag({ shortName }: { shortName: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.7rem] font-semibold text-ink">
      <GraduationCap className="size-3" aria-hidden />
      Verified {shortName}
    </span>
  );
}
