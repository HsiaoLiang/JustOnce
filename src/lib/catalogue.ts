// Labels for enums shared by server and client code. These mirror the Prisma
// enums as string unions so client components never import @prisma/client.

export type CategoryId = "FORMALWEAR" | "CAMERAS" | "CAMPING" | "SEASONAL";
export type ConditionId = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";

export interface CategoryInfo {
  id: CategoryId;
  slug: string;
  label: string;
  blurb: string;
  image: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "FORMALWEAR", slug: "formalwear", label: "Formalwear", blurb: "Suits, gowns and black-tie extras", image: "/seed/categories/formalwear.jpg" },
  { id: "CAMERAS", slug: "cameras", label: "Cameras", blurb: "Cameras, lenses and drones", image: "/seed/categories/cameras.jpg" },
  { id: "CAMPING", slug: "camping", label: "Camping", blurb: "Tents, packs and festival kit", image: "/seed/categories/camping.jpg" },
  { id: "SEASONAL", slug: "seasonal", label: "Seasonal", blurb: "Halloween, Christmas and ski trips", image: "/seed/categories/seasonal.jpg" },
];

export const CONDITIONS: { id: ConditionId; label: string; hint: string }[] = [
  { id: "NEW", label: "New", hint: "Unused, tags or packaging still on" },
  { id: "LIKE_NEW", label: "Like new", hint: "Used once or twice, no visible wear" },
  { id: "GOOD", label: "Good", hint: "Light signs of use, works perfectly" },
  { id: "FAIR", label: "Fair", hint: "Visible wear, fully usable" },
];

export function categoryInfo(id: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function categoryBySlug(slug: string | undefined): CategoryInfo | undefined {
  return slug ? CATEGORIES.find((c) => c.slug === slug) : undefined;
}

export function categoryLabel(id: string): string {
  return categoryInfo(id)?.label ?? id;
}

export function conditionLabel(id: string): string {
  return CONDITIONS.find((c) => c.id === id)?.label ?? id;
}

export function isCategoryId(value: unknown): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value);
}

export function isConditionId(value: unknown): value is ConditionId {
  return CONDITIONS.some((c) => c.id === value);
}
