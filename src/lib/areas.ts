// Pickup areas. Listings store a neighbourhood slug; search can filter by a
// single neighbourhood or a whole region ("East London").

export type RegionId = "central" | "north" | "east" | "south" | "west";

export interface Area {
  slug: string;
  name: string;
  region: RegionId;
  postcode: string;
}

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: "central", label: "Central London" },
  { id: "north", label: "North London" },
  { id: "east", label: "East London" },
  { id: "south", label: "South London" },
  { id: "west", label: "West London" },
];

export const AREAS: Area[] = [
  { slug: "bloomsbury", name: "Bloomsbury", region: "central", postcode: "WC1" },
  { slug: "kings-cross", name: "King's Cross", region: "central", postcode: "N1C" },
  { slug: "soho", name: "Soho", region: "central", postcode: "W1" },
  { slug: "camden", name: "Camden", region: "north", postcode: "NW1" },
  { slug: "islington", name: "Islington", region: "north", postcode: "N1" },
  { slug: "kentish-town", name: "Kentish Town", region: "north", postcode: "NW5" },
  { slug: "stoke-newington", name: "Stoke Newington", region: "north", postcode: "N16" },
  { slug: "wembley", name: "Wembley", region: "north", postcode: "HA9" },
  { slug: "bethnal-green", name: "Bethnal Green", region: "east", postcode: "E2" },
  { slug: "canary-wharf", name: "Canary Wharf", region: "east", postcode: "E14" },
  { slug: "dalston", name: "Dalston", region: "east", postcode: "E8" },
  { slug: "hackney", name: "Hackney", region: "east", postcode: "E8" },
  { slug: "shoreditch", name: "Shoreditch", region: "east", postcode: "E2" },
  { slug: "stratford", name: "Stratford", region: "east", postcode: "E15" },
  { slug: "walthamstow", name: "Walthamstow", region: "east", postcode: "E17" },
  { slug: "balham", name: "Balham", region: "south", postcode: "SW12" },
  { slug: "battersea", name: "Battersea", region: "south", postcode: "SW11" },
  { slug: "bermondsey", name: "Bermondsey", region: "south", postcode: "SE1" },
  { slug: "brixton", name: "Brixton", region: "south", postcode: "SW2" },
  { slug: "clapham", name: "Clapham", region: "south", postcode: "SW4" },
  { slug: "deptford", name: "Deptford", region: "south", postcode: "SE8" },
  { slug: "greenwich", name: "Greenwich", region: "south", postcode: "SE10" },
  { slug: "peckham", name: "Peckham", region: "south", postcode: "SE15" },
  { slug: "wimbledon", name: "Wimbledon", region: "south", postcode: "SW19" },
  { slug: "chelsea", name: "Chelsea", region: "west", postcode: "SW3" },
  { slug: "ealing", name: "Ealing", region: "west", postcode: "W5" },
  { slug: "fulham", name: "Fulham", region: "west", postcode: "SW6" },
  { slug: "hammersmith", name: "Hammersmith", region: "west", postcode: "W6" },
  { slug: "kensington", name: "Kensington", region: "west", postcode: "W8" },
  { slug: "notting-hill", name: "Notting Hill", region: "west", postcode: "W11" },
  { slug: "richmond", name: "Richmond", region: "west", postcode: "TW9" },
  { slug: "shepherds-bush", name: "Shepherd's Bush", region: "west", postcode: "W12" },
];

const bySlug = new Map(AREAS.map((a) => [a.slug, a]));

export function getArea(slug: string | null | undefined): Area | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

export function areaName(slug: string | null | undefined): string {
  return getArea(slug)?.name ?? "London";
}

export function isAreaSlug(value: unknown): value is string {
  return typeof value === "string" && bySlug.has(value);
}

export function isRegionId(value: unknown): value is RegionId {
  return REGIONS.some((r) => r.id === value);
}

/** Search filter value: a region id or a neighbourhood slug. Returns the matching slugs. */
export function areaFilterSlugs(value: string | undefined): string[] | null {
  if (!value) return null;
  if (isRegionId(value)) return AREAS.filter((a) => a.region === value).map((a) => a.slug);
  if (isAreaSlug(value)) return [value];
  return null;
}

export function areaFilterLabel(value: string | undefined): string | null {
  if (!value) return null;
  return REGIONS.find((r) => r.id === value)?.label ?? getArea(value)?.name ?? null;
}

export function areasByRegion(): { region: (typeof REGIONS)[number]; areas: Area[] }[] {
  return REGIONS.map((region) => ({ region, areas: AREAS.filter((a) => a.region === region.id) }));
}
