"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LayoutGrid, LocateFixed, Map as MapIcon } from "lucide-react";
import { ListingCard } from "./listing-card";
import type { MapPin } from "./map/listing-map";
import { areaName } from "@/lib/areas";
import { formatBbox, formatMiles, haversineMiles, type Bbox, type LatLng } from "@/lib/geo";
import { formatGBP } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { ListingCardData } from "@/server/queries";

// Leaflet needs `window`, so the map is only ever rendered in the browser.
const ListingMap = dynamic(() => import("./map/listing-map").then((m) => m.ListingMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-surface" />,
});

export type SearchItem = ListingCardData & { pin: LatLng | null };

/**
 * Results as a list, a map, or both side by side on desktop. "Near me" uses the
 * browser's location to sort and show distances; it never leaves the browser.
 */
export function SearchResults({ items, view, query }: { items: SearchItem[]; view: "list" | "map"; query?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [me, setMe] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const showMap = view === "map";

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const nearMe = () => {
    if (!("geolocation" in navigator)) {
      setLocError("Your browser can't share a location, so results are in the usual order.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setMe(null);
        setLocating(false);
        setLocError("Location not shared, so results are in the usual order.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };

  const sorted = useMemo(() => {
    const withDistance = items.map((item) => ({ item, miles: me && item.pin ? haversineMiles(me, item.pin) : null }));
    if (me) withDistance.sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity));
    return withDistance;
  }, [items, me]);

  const pins: MapPin[] = useMemo(
    () =>
      items
        .filter((i) => i.pin)
        .map((i) => ({ id: i.id, title: i.title, price: formatGBP(i.pricePerDay), photo: i.photos[0], area: areaName(i.area), lat: i.pin!.lat, lng: i.pin!.lng })),
    [items],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-line-strong p-1" role="group" aria-label="Show results as">
          <ToggleButton active={!showMap} onClick={() => setParam({ view: null, bbox: null })} icon={<LayoutGrid className="size-4" />} label="List" />
          <ToggleButton active={showMap} onClick={() => setParam({ view: "map" })} icon={<MapIcon className="size-4" />} label="Map" />
        </div>
        <button
          type="button"
          onClick={me ? () => setMe(null) : nearMe}
          disabled={locating}
          aria-pressed={Boolean(me)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
            me ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink",
          )}
        >
          <LocateFixed className="size-4" aria-hidden />
          {locating ? "Finding you…" : me ? "Sorted by distance" : "Near me"}
        </button>
        {locError && (
          <p role="status" className="text-sm text-muted">
            {locError}
          </p>
        )}
        {me && <p className="text-xs text-muted">Distances are approximate. Your location stays in your browser.</p>}
      </div>

      <div className={cn(showMap && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8")}>
        <ul
          aria-label="Results"
          className={cn(
            "grid grid-cols-1 gap-x-6 gap-y-9 min-[480px]:grid-cols-2",
            showMap ? "hidden lg:grid xl:grid-cols-2" : "lg:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {sorted.map(({ item, miles }, i) => (
            <li key={item.id}>
              <ListingCard listing={item} priority={i < 4} href={query ? `/items/${item.id}?${query}` : undefined} distance={miles !== null ? formatMiles(miles) : undefined} />
            </li>
          ))}
        </ul>
        {showMap && (
          <ListingMap
            pins={pins}
            me={me}
            onSearchArea={(box: Bbox) => setParam({ bbox: formatBbox(box), view: "map" })}
            className="h-[70vh] lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"
          />
        )}
      </div>
    </div>
  );
}

function ToggleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors", active ? "bg-ink text-white" : "text-ink-2 hover:text-ink")}
    >
      {icon}
      {label}
    </button>
  );
}
