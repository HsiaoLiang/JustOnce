// AI situation search: a renter describes what they need in a sentence and we
// turn it into the ordinary search filters. The model only picks filters; the
// results always come from the database through the normal search page.
import { z } from "zod";
import { AREAS, REGIONS } from "./areas";
import { CATEGORIES } from "./catalogue";
import { isISODate, type ISODate } from "./dates";
import { MAX_PRICES, parseSearch, searchHref, type ParsedSearch } from "./search-params";

export const MAX_SITUATION_LENGTH = 300;

const text = z
  .string()
  .nullish()
  .transform((s) => (s ?? "").trim());

/** What we accept back from the model. Everything is optional and re-checked by parseSearch. */
export const situationSchema = z.object({
  keywords: text,
  category: text,
  area: text,
  from: text,
  to: text,
  maxPricePerDayPounds: z.number().nullish().catch(null),
});
export type SituationAnswer = z.infer<typeof situationSchema>;

export const SITUATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    keywords: { type: "string", description: "At most two plain words naming the item itself, e.g. 'tent' or 'tuxedo'. Empty if the category alone covers it or several different items would suit." },
    category: { type: "string", enum: ["", ...CATEGORIES.map((c) => c.slug)], description: "Empty if none fits." },
    area: { type: "string", enum: ["", ...REGIONS.map((r) => r.id), ...AREAS.map((a) => a.slug)], description: "A London region or neighbourhood, only if the person names one. Empty otherwise." },
    from: { type: "string", description: "Pickup date as YYYY-MM-DD, only if the person gives a date or day. Empty otherwise." },
    to: { type: "string", description: "Return date as YYYY-MM-DD. Same as 'from' for a one-day need. Empty if no date was given." },
    maxPricePerDayPounds: { type: "number", description: "Daily budget in pounds, only if the person states one. Leave out otherwise." },
  },
  required: ["keywords", "category", "area", "from", "to"],
} as const;

/** The largest price filter the search page offers that still respects the stated budget. */
export function budgetToMaxPrice(pounds: number | null | undefined): number | undefined {
  if (typeof pounds !== "number" || !Number.isFinite(pounds) || pounds <= 0) return undefined;
  return [...MAX_PRICES].reverse().find((option) => option <= pounds);
}

/** Runs the model's answer through the same clean-up as a hand-typed search URL. */
export function situationToSearch(answer: SituationAnswer): ParsedSearch {
  const max = budgetToMaxPrice(answer.maxPricePerDayPounds);
  const date = (value: string): ISODate | undefined => (isISODate(value) ? value : undefined);
  return parseSearch({
    q: answer.keywords.split(/\s+/).slice(0, 2).join(" "),
    category: answer.category,
    area: answer.area,
    from: date(answer.from),
    to: date(answer.to),
    max: max ? String(max) : undefined,
    // A budget below the cheapest filter can't be filtered on, so show the cheapest first instead.
    sort: answer.maxPricePerDayPounds && !max ? "price-asc" : undefined,
  });
}

/** True when the model found nothing usable, so plain keyword search is the better fallback. */
export function isEmptySearch(s: ParsedSearch): boolean {
  return !s.q && !s.category && !s.area && !s.from && !s.max;
}

export function situationHref(search: ParsedSearch, via: "ai" | "photo" = "ai"): string {
  const href = searchHref(search, {});
  return `${href}${href.includes("?") ? "&" : "?"}via=${via}`;
}

/** Photo search: what the model saw in the borrower's photo, as search filters. */
export const photoSearchSchema = z.object({
  /** A few words naming the item, shown back to the borrower. Empty when nothing rentable is visible. */
  item: text.transform((s) => s.slice(0, 60)),
  keywords: text,
  category: text,
});

export const PHOTO_SEARCH_JSON_SCHEMA = {
  type: "object",
  properties: {
    item: { type: "string", description: "What the main item is, in two to five plain words, e.g. 'black dinner jacket' or 'two-person dome tent'. Empty if no rentable item is visible or the photo is unreadable." },
    keywords: { type: "string", description: "One or two plain words someone would type to find this kind of item, most general first, e.g. 'tent' or 'tuxedo'. No brand unless it is clearly visible." },
    category: SITUATION_JSON_SCHEMA.properties.category,
  },
  required: ["item", "keywords", "category"],
} as const;

export function photoToSearch(answer: z.infer<typeof photoSearchSchema>): ParsedSearch {
  return situationToSearch({ keywords: answer.keywords, category: answer.category, area: "", from: "", to: "", maxPricePerDayPounds: null });
}
