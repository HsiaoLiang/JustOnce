// Map maths. Public pins are deliberately approximate: the neighbourhood centre
// nudged by a stable, listing-specific offset, so nobody's address is implied.

import { AREAS, getArea } from "./areas";

export interface LatLng {
  lat: number;
  lng: number;
}

/** [west, south, east, north] */
export type Bbox = [number, number, number, number];

const EARTH_RADIUS_MILES = 3958.8;
const METRES_PER_DEGREE_LAT = 111_320;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/** A number in [0, 1) derived from a string, the same every time. */
export function stableUnit(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Where a listing appears on public maps: 150–400 m from its area centre, in a direction fixed by its id. */
export function publicPin(listingId: string, areaSlug: string): LatLng | null {
  const area = getArea(areaSlug);
  if (!area) return null;
  const angle = stableUnit(`${listingId}:angle`) * 2 * Math.PI;
  const metres = 150 + stableUnit(`${listingId}:distance`) * 250;
  const dLat = (metres * Math.cos(angle)) / METRES_PER_DEGREE_LAT;
  const dLng = (metres * Math.sin(angle)) / (METRES_PER_DEGREE_LAT * Math.cos((area.lat * Math.PI) / 180));
  return { lat: round(area.lat + dLat), lng: round(area.lng + dLng) };
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;

// Greater London, roughly. Anything outside is treated as invalid input.
const LONDON: Bbox = [-0.6, 51.25, 0.35, 51.72];

export function parseBbox(value: string | undefined): Bbox | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [w, s, e, n] = parts;
  if (w >= e || s >= n) return null;
  const box: Bbox = [Math.max(w, LONDON[0]), Math.max(s, LONDON[1]), Math.min(e, LONDON[2]), Math.min(n, LONDON[3])];
  return box[0] < box[2] && box[1] < box[3] ? box : null;
}

export function formatBbox(box: Bbox): string {
  return box.map((n) => n.toFixed(4)).join(",");
}

export function inBbox(p: LatLng, [w, s, e, n]: Bbox): boolean {
  return p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n;
}

/** Neighbourhoods whose centre falls inside the box. */
export function areasInBbox(box: Bbox): string[] {
  return AREAS.filter((a) => inBbox(a, box)).map((a) => a.slug);
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return "Under 0.1 miles away";
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} miles away`;
}

export function directionsUrl(p: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

/** Shaded circles for neighbourhoods (approximate locations, safe for public maps). */
export function areaCircle(...slugs: string[]): { lat: number; lng: number; label: string }[] {
  return [...new Set(slugs)].flatMap((slug) => {
    const a = getArea(slug);
    return a ? [{ lat: a.lat, lng: a.lng, label: a.name }] : [];
  });
}
