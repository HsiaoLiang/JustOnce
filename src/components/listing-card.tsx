import Image from "next/image";
import Link from "next/link";
import { areaName } from "@/lib/areas";
import { conditionLabel } from "@/lib/catalogue";
import { formatGBP } from "@/lib/money";
import type { ListingCardData } from "@/server/queries";
import { Rating } from "./ui";

export function ListingCard({ listing, priority = false, href, distance }: { listing: ListingCardData; priority?: boolean; href?: string; distance?: string }) {
  return (
    <Link href={href ?? `/items/${listing.id}`} className="group block rounded-2xl">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
        {listing.photos[0] && (
          <Image
            src={listing.photos[0]}
            alt={listing.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
        )}
        {listing.status === "PAUSED" && (
          <span className="absolute top-3 left-3 rounded-full bg-paper/95 px-2.5 py-1 text-xs font-semibold shadow-card">Paused</span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="line-clamp-1 font-sans text-[0.95rem] leading-snug font-semibold tracking-normal">{listing.title}</h3>
        <Rating sum={listing.ratingSum} count={listing.ratingCount} showCount={false} className="shrink-0" />
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {areaName(listing.area)} · {conditionLabel(listing.condition)}
      </p>
      {distance && <p className="mt-0.5 text-sm font-medium text-ink-2">{distance}</p>}
      <p className="mt-1 text-[0.95rem]">
        <span className="font-semibold">{formatGBP(listing.pricePerDay)}</span> <span className="text-muted">per day</span>
      </p>
    </Link>
  );
}

export function ListingGrid({ listings, priorityCount = 0, query }: { listings: ListingCardData[]; priorityCount?: number; query?: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l, i) => (
        <ListingCard key={l.id} listing={l} priority={i < priorityCount} href={query ? `/items/${l.id}?${query}` : undefined} />
      ))}
    </div>
  );
}
