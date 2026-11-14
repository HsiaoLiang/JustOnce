// "What would it cost to buy?" The pure rules behind the rent-versus-buy line.
// No imports, so it runs anywhere; the eBay and AI calls live in src/server/market-price.ts.
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

/**
 * Where a stored market price came from (Listing.marketPriceSource):
 *   EBAY   median of live eBay listings
 *   AI_WEB the AI model searched the web for current prices, then answered
 *   AI     the AI model's own estimate, with no search behind it
 */
export type MarketPriceSource = "EBAY" | "AI_WEB" | "AI";

/** What renters are shown as the price to buy the item new. */
export interface BuyPrice {
  amount: number;
  /** "ebay": median of live listings. "web": AI estimate backed by a web search. "ai": AI estimate. "owner": the owner's replacement value. */
  source: "ebay" | "web" | "ai" | "owner";
  /** How many listings (eBay) or web pages (AI with search) the figure came from. */
  count?: number;
  /** The search those listings came from, for renters who want to check. */
  url?: string;
}

/** The looked-up price when there is one, otherwise the owner's replacement value, otherwise nothing. */
export function buyPriceFor(listing: {
  marketPrice?: number | null;
  marketPriceCount?: number | null;
  marketPriceUrl?: string | null;
  marketPriceSource?: string | null;
  replacementValue?: number | null;
}): BuyPrice | null {
  if (listing.marketPrice && listing.marketPrice > 0) {
    const source = listing.marketPriceSource === "AI_WEB" ? "web" : listing.marketPriceSource === "AI" ? "ai" : "ebay";
    return { amount: listing.marketPrice, source, count: listing.marketPriceCount ?? undefined, url: listing.marketPriceUrl ?? undefined };
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

/** What the AI model is asked to return for "what does this cost to buy new?". */
export interface BuyPriceEstimate {
  /** Typical UK price to buy it new, in pounds. 0 when the model can't tell. */
  priceGBP: number;
  /** The product the model priced, so a wrong match is visible in the logs. */
  matchedProduct: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Turns the model's answer into pence, or null when it shouldn't be shown: not a
 * sensible number, a low-confidence guess, or far from the owner's own estimate.
 */
export function buyPriceFromEstimate(estimate: unknown, ownerEstimate: number | null | undefined): number | null {
  if (!estimate || typeof estimate !== "object") return null;
  const { priceGBP, confidence } = estimate as Partial<BuyPriceEstimate>;
  if (typeof priceGBP !== "number" || !Number.isFinite(priceGBP) || priceGBP < 1 || priceGBP > 50_000) return null;
  if (confidence !== "high" && confidence !== "medium") return null;
  const pence = Math.round(priceGBP) * 100;
  return plausibleMarketPrice(pence, ownerEstimate) ? pence : null;
}

// ---------------------------------------------------------------- links to buy it instead

/** Where a renter can go to buy the item, with our affiliate IDs on the links when they are set. */
export interface BuyLinks {
  amazon: string;
  ebay: string;
  /** True when at least one link carries an affiliate ID, so the commission notice is shown. */
  affiliate: boolean;
}

/** eBay Partner Network rotation ID for ebay.co.uk. */
const EBAY_UK_ROTATION = "710-53481-19255-0";

/**
 * Search links on amazon.co.uk and ebay.co.uk for a listing. `amazonTag` is an Amazon
 * Associates tracking ID (e.g. "justonce-21"); `ebayCampaignId` is an eBay Partner
 * Network campaign ID. Without them the links still work, they just earn nothing.
 */
export function buyLinks(listing: { title: string; brand?: string | null }, ids: { amazonTag?: string | null; ebayCampaignId?: string | null } = {}): BuyLinks {
  const query = marketQuery(listing);
  const amazonTag = ids.amazonTag?.trim();
  const ebayCampaignId = ids.ebayCampaignId?.trim();
  const amazon = new URLSearchParams({ k: query });
  if (amazonTag) amazon.set("tag", amazonTag);
  const ebay = new URLSearchParams({ _nkw: query, LH_BIN: "1" });
  if (ebayCampaignId) {
    for (const [key, value] of Object.entries({ mkcid: "1", mkrid: EBAY_UK_ROTATION, siteid: "3", campid: ebayCampaignId, toolid: "10001", mkevt: "1" })) ebay.set(key, value);
  }
  return {
    amazon: `https://www.amazon.co.uk/s?${amazon}`,
    ebay: `https://www.ebay.co.uk/sch/i.html?${ebay}`,
    affiliate: Boolean(amazonTag || ebayCampaignId),
  };
}
