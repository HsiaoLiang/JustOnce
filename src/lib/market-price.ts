// "What would it cost to buy?" The pure rules behind the rent-versus-buy line.
// No imports, so it runs anywhere; the eBay calls live in src/server/market-price.ts.
// All amounts are integer pence.

/** Fewer prices than this is too thin to call a typical price. */
export const MIN_MARKET_RESULTS = 3;
/** A marketplace price further than this factor from the owner's own estimate is treated as a bad match. */
export const PLAUSIBLE_FACTOR = 4;
/** How long a found price is trusted, and how soon a miss is tried again. */
export const MARKET_PRICE_TTL_HOURS = { hit: 24 * 7, miss: 6 } as const;

/** The marketplace search for a listing: brand and title, without brackets or punctuation. */
export function marketQuery(listing: { title: string; brand?: string | null }): string {
  const title = listing.title.replace(/\([^)]*\)/g, " ");
  const brand = listing.brand?.trim() ?? "";
  const withBrand = brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${title}` : title;
  return withBrand
    .replace(/[^\p{L}\p{N}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90)
    .trim();
}

/**
 * A typical price from a page of search results: the median of the middle half,
 * rounded to whole pounds. Dropping the cheapest and dearest quarter keeps a £5
 * lens cap or a collector's listing from moving the number.
 */
export function typicalPrice(prices: number[]): { price: number; count: number } | null {
  const sorted = prices.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  if (sorted.length < MIN_MARKET_RESULTS) return null;
  const trim = Math.floor(sorted.length / 4);
  const middle = sorted.slice(trim, sorted.length - trim);
  const mid = Math.floor(middle.length / 2);
  const median = middle.length % 2 ? middle[mid] : (middle[mid - 1] + middle[mid]) / 2;
  return { price: Math.round(median / 100) * 100, count: sorted.length };
}

/** With no owner estimate anything goes; with one, the marketplace price has to be in the same ballpark. */
export function plausibleMarketPrice(marketPrice: number, ownerEstimate: number | null | undefined): boolean {
  if (marketPrice <= 0) return false;
  if (!ownerEstimate) return true;
  return marketPrice >= ownerEstimate / PLAUSIBLE_FACTOR && marketPrice <= ownerEstimate * PLAUSIBLE_FACTOR;
}

/** True when the cached lookup is missing or old enough to run again. */
export function marketPriceIsStale(checkedAt: Date | null | undefined, hasPrice: boolean, now: Date = new Date()): boolean {
  if (!checkedAt) return true;
  const hours = hasPrice ? MARKET_PRICE_TTL_HOURS.hit : MARKET_PRICE_TTL_HOURS.miss;
  return now.getTime() - checkedAt.getTime() > hours * 3_600_000;
}

/** What renters are shown as the price to buy the item new. */
export interface BuyPrice {
  amount: number;
  /** "ebay": median of live listings. "owner": the owner's replacement value. */
  source: "ebay" | "owner";
  /** How many listings the eBay figure came from. */
  count?: number;
  /** The search those listings came from, for renters who want to check. */
  url?: string;
}

/** The marketplace price when there is one, otherwise the owner's replacement value, otherwise nothing. */
export function buyPriceFor(listing: {
  marketPrice?: number | null;
  marketPriceCount?: number | null;
  marketPriceUrl?: string | null;
  replacementValue?: number | null;
}): BuyPrice | null {
  if (listing.marketPrice && listing.marketPrice > 0) {
    return { amount: listing.marketPrice, source: "ebay", count: listing.marketPriceCount ?? undefined, url: listing.marketPriceUrl ?? undefined };
  }
  if (listing.replacementValue && listing.replacementValue > 0) return { amount: listing.replacementValue, source: "owner" };
  return null;
}

/**
 * What renting saves against buying, in whole pounds. `rentTotal` is everything the
 * renter pays and doesn't get back (rental, service fee, delivery), not the deposit.
 * Null when renting isn't cheaper, so the line is never shown as a loss.
 */
export function savingVsBuying(buyPrice: number, rentTotal: number): { saving: number; percent: number } | null {
  if (buyPrice <= 0 || rentTotal <= 0) return null;
  const saving = Math.floor((buyPrice - rentTotal) / 100) * 100;
  if (saving < 100) return null;
  return { saving, percent: Math.floor((saving / buyPrice) * 100) };
}
