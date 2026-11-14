// Labels for enums shared by server and client code. These mirror the Prisma
// enums as string unions so client components never import @prisma/client.

export type CategoryId =
  | "FORMALWEAR"
  | "CLOTHING"
  | "SHOES"
  | "BAGS"
  | "JEWELLERY"
  | "WATCHES"
  | "ACCESSORIES"
  | "COSTUMES"
  | "CAMERAS"
  | "CAMPING"
  | "SEASONAL";
export type CategoryGroupId = "FASHION" | "KIT";
export type ConditionId = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";

export interface CategoryInfo {
  id: CategoryId;
  slug: string;
  label: string;
  blurb: string;
  image: string;
  group: CategoryGroupId;
}

export const CATEGORY_GROUPS: { id: CategoryGroupId; label: string; blurb: string }[] = [
  { id: "FASHION", label: "Fashion", blurb: "Something to wear for the big day, without buying it" },
  { id: "KIT", label: "Kit and occasions", blurb: "Gear for a weekend away and a party at home" },
];

export const CATEGORIES: CategoryInfo[] = [
  { id: "FORMALWEAR", slug: "formalwear", label: "Formalwear", blurb: "Suits, gowns and black tie", image: "/seed/categories/formalwear.jpg", group: "FASHION" },
  { id: "CLOTHING", slug: "clothing", label: "Clothing", blurb: "Coats, jackets and dresses", image: "/seed/categories/clothing.jpg", group: "FASHION" },
  { id: "SHOES", slug: "shoes", label: "Shoes", blurb: "Heels, brogues and boots", image: "/seed/categories/shoes.jpg", group: "FASHION" },
  { id: "BAGS", slug: "bags", label: "Bags", blurb: "Designer handbags and totes", image: "/seed/categories/bags.jpg", group: "FASHION" },
  { id: "JEWELLERY", slug: "jewellery", label: "Jewellery", blurb: "Necklaces, earrings and bridal sets", image: "/seed/categories/jewellery.jpg", group: "FASHION" },
  { id: "WATCHES", slug: "watches", label: "Watches", blurb: "Dress watches and chronographs", image: "/seed/categories/watches.jpg", group: "FASHION" },
  { id: "ACCESSORIES", slug: "accessories", label: "Accessories", blurb: "Sunglasses, scarves and finishing touches", image: "/seed/categories/accessories.jpg", group: "FASHION" },
  { id: "COSTUMES", slug: "costumes", label: "Costumes", blurb: "Fancy dress and Halloween outfits", image: "/seed/categories/costumes.jpg", group: "FASHION" },
  { id: "CAMERAS", slug: "cameras", label: "Cameras", blurb: "Cameras, lenses and drones", image: "/seed/categories/cameras.jpg", group: "KIT" },
  { id: "CAMPING", slug: "camping", label: "Camping", blurb: "Tents, packs and festival kit", image: "/seed/categories/camping.jpg", group: "KIT" },
  { id: "SEASONAL", slug: "seasonal", label: "Seasonal", blurb: "Christmas, ski trips and Halloween props", image: "/seed/categories/seasonal.jpg", group: "KIT" },
];

export const CONDITIONS: { id: ConditionId; label: string; hint: string }[] = [
  { id: "NEW", label: "New", hint: "Unused, tags or packaging still on" },
  { id: "LIKE_NEW", label: "Like new", hint: "Used once or twice, no visible wear" },
  { id: "GOOD", label: "Good", hint: "Light signs of use, works perfectly" },
  { id: "FAIR", label: "Fair", hint: "Visible wear, fully usable" },
];

export function categoriesInGroup(group: CategoryGroupId): CategoryInfo[] {
  return CATEGORIES.filter((c) => c.group === group);
}

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
