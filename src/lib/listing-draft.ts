// AI photo-to-listing: the shapes and pure rules shared by the server route and
// the listing form. Nothing here calls a model; see src/server/ai.ts for that.
import { z } from "zod";
import { CATEGORIES, CONDITIONS, type CategoryId, type ConditionId } from "./catalogue";
import { formatGBP } from "./money";

/** Fields the model may fill in. Anything it is unsure about stays empty with a question instead. */
export const DRAFT_FIELDS = ["title", "category", "condition", "brand", "size", "description"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];

const categoryIds = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
const conditionIds = CONDITIONS.map((c) => c.id) as [ConditionId, ...ConditionId[]];

/** Blank strings and nulls from the model both mean "not sure". */
const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((s) => (s ?? "").trim().slice(0, max));

const optionalPounds = z
  .number()
  .nullish()
  .transform((n) => (typeof n === "number" && Number.isFinite(n) && n > 0 && n < 100_000 ? n : null));

/**
 * What we accept back from the model. Category and condition must be ids from
 * src/lib/catalogue.ts: anything else is dropped rather than trusted.
 */
export const modelDraftSchema = z.object({
  title: optionalText(80),
  category: z.enum(categoryIds).nullish().catch(null),
  condition: z.enum(conditionIds).nullish().catch(null),
  brand: optionalText(60),
  size: optionalText(60),
  description: optionalText(2000),
  questions: z
    .array(z.object({ field: z.enum(DRAFT_FIELDS), question: z.string().trim().min(1).max(200) }))
    .max(6)
    .nullish()
    .catch([])
    .transform((q) => q ?? []),
  /** Rough resale value of this item in this condition, in pounds. Only used when we have few comparables. */
  secondHandValuePounds: optionalPounds.catch(null),
  /** The model's own guess at a fair daily rental price, in pounds. Only used when we have few comparables. */
  pricePerDayPounds: optionalPounds.catch(null),
});
export type ModelDraft = z.infer<typeof modelDraftSchema>;

/** JSON schema handed to the model so its answer arrives in the shape above. Kept null-free so every provider accepts it. */
export const MODEL_DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Listing title, at most 80 characters, e.g. 'Navy three-piece suit, 40R'. Empty if the item is unclear." },
    category: { type: "string", enum: ["UNKNOWN", ...categoryIds], description: "UNKNOWN if none of the categories fits." },
    condition: { type: "string", enum: ["UNKNOWN", ...conditionIds], description: "UNKNOWN if wear can't be judged from the photos." },
    brand: { type: "string", description: "Only if a logo or label is actually visible. Otherwise empty." },
    size: { type: "string", description: "Only if visible on a label or obvious from the item (e.g. 'sleeps 4'). Otherwise empty." },
    description: { type: "string", description: "Two or three plain sentences: what it is, what appears to be included, what it suits." },
    questions: {
      type: "array",
      description: "One short question for each field left empty because the photos don't settle it.",
      items: {
        type: "object",
        properties: { field: { type: "string", enum: [...DRAFT_FIELDS] }, question: { type: "string" } },
        required: ["field", "question"],
      },
    },
    secondHandValuePounds: { type: "number", description: "Rough UK second-hand value in pounds. Leave out if unknown." },
    pricePerDayPounds: { type: "number", description: "A fair daily rental price in pounds. Leave out if unknown." },
  },
  required: ["title", "category", "condition", "brand", "size", "description", "questions"],
} as const;

export interface Comparable {
  pricePerDay: number;
  deposit: number;
}

export interface Suggestion {
  /** Pence, ready for the form. Null when there is nothing sensible to suggest. */
  amount: number | null;
  reason: string;
}

export interface PricingSuggestion {
  price: Suggestion;
  deposit: Suggestion;
  /** True when the numbers come from real listings on the platform. */
  fromComparables: boolean;
}

/** Fewer comparables than this and a median says little, so we say so and fall back. */
export const MIN_COMPARABLES = 3;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const toWholePounds = (pence: number) => Math.max(100, Math.round(pence / 100) * 100);

/**
 * Price and deposit come from what similar items already rent for on the
 * platform. Only when there are too few of those do we lean on the model's
 * estimate, and the reason line says which of the two it was.
 */
export function suggestPricing(comparables: Comparable[], label: string, estimate: Pick<ModelDraft, "secondHandValuePounds" | "pricePerDayPounds">): PricingSuggestion {
  if (comparables.length >= MIN_COMPARABLES) {
    const prices = comparables.map((c) => c.pricePerDay);
    const price = toWholePounds(median(prices)!);
    const deposit = toWholePounds(median(comparables.map((c) => c.deposit))!);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const range = low === high ? formatGBP(low) : `${formatGBP(low)} to ${formatGBP(high)}`;
    return {
      fromComparables: true,
      price: { amount: price, reason: `${formatGBP(price)} a day: ${comparables.length} similar ${label} on Just Once rent for ${range}.` },
      deposit: { amount: deposit, reason: `${formatGBP(deposit)} deposit: the typical deposit on those listings.` },
    };
  }

  const few = "Few similar items on Just Once yet";
  const price = estimate.pricePerDayPounds ? toWholePounds(estimate.pricePerDayPounds * 100) : null;
  const deposit = estimate.secondHandValuePounds ? toWholePounds(estimate.secondHandValuePounds * 50) : null;
  return {
    fromComparables: false,
    price: price
      ? { amount: price, reason: `${few}, so ${formatGBP(price)} a day is an estimate. Check it against similar items elsewhere.` }
      : { amount: null, reason: `${few}, so there's no price to suggest.` },
    deposit: deposit
      ? { amount: deposit, reason: `${formatGBP(deposit)} deposit: about half its estimated second-hand value.` }
      : { amount: null, reason: "" },
  };
}

/** What the route returns to the form. */
export interface ListingDraftResponse {
  draft: Pick<ModelDraft, DraftField | "questions">;
  pricing: PricingSuggestion;
}
