// Pickup areas. Listings store a neighbourhood slug; search can filter by a
// single neighbourhood or a whole region ("East London").

export type RegionId = "central" | "north" | "east" | "south" | "west";

export interface Area {
  slug: string;
  name: string;
  region: RegionId;
  postcode: string;
  /** Approximate centre of the neighbourhood, for maps. Never a real address. */
  lat: number;
  lng: number;
}

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: "central", label: "Central London" },
  { id: "north", label: "North London" },
  { id: "east", label: "East London" },
  { id: "south", label: "South London" },
  { id: "west", label: "West London" },
];

export const AREAS: Area[] = [
  { slug: "bloomsbury", name: "Bloomsbury", region: "central", postcode: "WC1", lat: 51.5226, lng: -0.1253 },
  { slug: "kings-cross", name: "King's Cross", region: "central", postcode: "N1C", lat: 51.5347, lng: -0.1246 },
  { slug: "soho", name: "Soho", region: "central", postcode: "W1", lat: 51.5136, lng: -0.1365 },
  { slug: "camden", name: "Camden", region: "north", postcode: "NW1", lat: 51.539, lng: -0.1426 },
  { slug: "islington", name: "Islington", region: "north", postcode: "N1", lat: 51.5362, lng: -0.1033 },
  { slug: "kentish-town", name: "Kentish Town", region: "north", postcode: "NW5", lat: 51.5507, lng: -0.1407 },
  { slug: "stoke-newington", name: "Stoke Newington", region: "north", postcode: "N16", lat: 51.5627, lng: -0.0756 },
  { slug: "wembley", name: "Wembley", region: "north", postcode: "HA9", lat: 51.556, lng: -0.2796 },
  { slug: "bethnal-green", name: "Bethnal Green", region: "east", postcode: "E2", lat: 51.527, lng: -0.055 },
  { slug: "canary-wharf", name: "Canary Wharf", region: "east", postcode: "E14", lat: 51.5054, lng: -0.0235 },
  { slug: "dalston", name: "Dalston", region: "east", postcode: "E8", lat: 51.5462, lng: -0.075 },
  { slug: "hackney", name: "Hackney", region: "east", postcode: "E8", lat: 51.545, lng: -0.0553 },
  { slug: "shoreditch", name: "Shoreditch", region: "east", postcode: "E2", lat: 51.5265, lng: -0.0786 },
  { slug: "stratford", name: "Stratford", region: "east", postcode: "E15", lat: 51.5413, lng: -0.0036 },
  { slug: "walthamstow", name: "Walthamstow", region: "east", postcode: "E17", lat: 51.583, lng: -0.02 },
  { slug: "balham", name: "Balham", region: "south", postcode: "SW12", lat: 51.4434, lng: -0.1525 },
  { slug: "battersea", name: "Battersea", region: "south", postcode: "SW11", lat: 51.47, lng: -0.168 },
  { slug: "bermondsey", name: "Bermondsey", region: "south", postcode: "SE1", lat: 51.498, lng: -0.064 },
  { slug: "brixton", name: "Brixton", region: "south", postcode: "SW2", lat: 51.4613, lng: -0.115 },
  { slug: "clapham", name: "Clapham", region: "south", postcode: "SW4", lat: 51.462, lng: -0.138 },
  { slug: "deptford", name: "Deptford", region: "south", postcode: "SE8", lat: 51.478, lng: -0.026 },
  { slug: "greenwich", name: "Greenwich", region: "south", postcode: "SE10", lat: 51.4826, lng: -0.0077 },
  { slug: "peckham", name: "Peckham", region: "south", postcode: "SE15", lat: 51.474, lng: -0.069 },
  { slug: "wimbledon", name: "Wimbledon", region: "south", postcode: "SW19", lat: 51.4214, lng: -0.2064 },
  { slug: "chelsea", name: "Chelsea", region: "west", postcode: "SW3", lat: 51.4875, lng: -0.1687 },
  { slug: "ealing", name: "Ealing", region: "west", postcode: "W5", lat: 51.513, lng: -0.3089 },
  { slug: "fulham", name: "Fulham", region: "west", postcode: "SW6", lat: 51.473, lng: -0.201 },
  { slug: "hammersmith", name: "Hammersmith", region: "west", postcode: "W6", lat: 51.4927, lng: -0.224 },
  { slug: "kensington", name: "Kensington", region: "west", postcode: "W8", lat: 51.501, lng: -0.193 },
  { slug: "notting-hill", name: "Notting Hill", region: "west", postcode: "W11", lat: 51.509, lng: -0.196 },
  { slug: "richmond", name: "Richmond", region: "west", postcode: "TW9", lat: 51.4613, lng: -0.3037 },
  { slug: "shepherds-bush", name: "Shepherd's Bush", region: "west", postcode: "W12", lat: 51.504, lng: -0.218 },
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
