import { areaFilterSlugs } from "./areas";
import { categoryBySlug, type CategoryId } from "./catalogue";
import { isISODate, todayInLondon, type ISODate } from "./dates";
import { formatBbox, parseBbox, type Bbox } from "./geo";

export type SortKey = "recommended" | "price-asc" | "price-desc" | "newest";
export const SORTS: { id: SortKey; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "newest", label: "Newest" },
];
export const MAX_PRICES = [10, 20, 30, 50];

export interface ParsedSearch {
  q: string;
  categorySlug: string;
  category?: CategoryId;
  area: string;
  from?: ISODate;
  to?: ISODate;
  max?: number;
  sort: SortKey;
  view: "list" | "map";
  /** Only items that can be sent by courier or locker. */
  delivery: boolean;
  /** Map area the results are limited to ("Search this area"). */
  bbox?: Bbox;
  /** Community slug, e.g. "lbs": only items listed with that school or company. */
  community: string;
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseSearch(raw: Raw): ParsedSearch {
  const q = one(raw.q).trim().slice(0, 80);
  const category = categoryBySlug(one(raw.category));
  const area = areaFilterSlugs(one(raw.area)) ? one(raw.area) : "";
  let from = isISODate(one(raw.from)) ? one(raw.from) : undefined;
  let to = isISODate(one(raw.to)) ? one(raw.to) : undefined;
  // One date means a one-day rental; reversed dates get swapped; the past is ignored.
  if (from && !to) to = from;
  if (to && !from) from = to;
  if (from && to && to < from) [from, to] = [to, from];
  const today = todayInLondon();
  if (from && to && to < today) from = to = undefined;
  if (from && from < today) from = today;
  const maxRaw = Number(one(raw.max));
  const max = MAX_PRICES.includes(maxRaw) ? maxRaw : undefined;
  const sortRaw = one(raw.sort) as SortKey;
  const sort = SORTS.some((s) => s.id === sortRaw) ? sortRaw : "recommended";
  const view = one(raw.view) === "map" ? "map" : "list";
  const bbox = parseBbox(one(raw.bbox)) ?? undefined;
  const delivery = one(raw.delivery) === "1";
  const communityRaw = one(raw.community).toLowerCase();
  const community = /^[a-z0-9-]{2,40}$/.test(communityRaw) ? communityRaw : "";
  return { q, categorySlug: category?.slug ?? "", category: category?.id, area, from, to, max, sort, view, bbox, delivery, community };
}

/** Builds a /search URL from the current filters with some values replaced. */
export function searchHref(current: ParsedSearch, changes: Partial<Record<"q" | "category" | "area" | "from" | "to" | "max" | "sort" | "view" | "bbox" | "delivery" | "community", string | undefined>>): string {
  const values: Record<string, string | undefined> = {
    q: current.q || undefined,
    category: current.categorySlug || undefined,
    area: current.area || undefined,
    from: current.from,
    to: current.to,
    max: current.max ? String(current.max) : undefined,
    sort: current.sort !== "recommended" ? current.sort : undefined,
    view: current.view === "map" ? "map" : undefined,
    bbox: current.bbox ? formatBbox(current.bbox) : undefined,
    delivery: current.delivery ? "1" : undefined,
    community: current.community || undefined,
    ...changes,
  };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
