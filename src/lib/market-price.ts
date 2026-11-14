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

export interface BuyStore {
  name: string;
  url: string;
}

/** Where a renter can go to buy the item: shops that actually sell that kind of product. */
export interface BuyLinks {
  stores: BuyStore[];
  /** True when at least one link carries an affiliate ID, so the commission notice is shown. */
  affiliate: boolean;
}

/**
 * Designer and luxury names. These aren't sold new on Amazon, so their listings
 * link to department stores that stock them instead. Matched as whole words in
 * the brand or title, ignoring case and accents.
 */
export const LUXURY_BRANDS = [
  "Gucci", "Chanel", "Louis Vuitton", "Hermes", "Prada", "Dior", "Fendi", "Celine", "Loewe", "Balenciaga", "Bottega Veneta",
  "Saint Laurent", "YSL", "Burberry", "Valentino", "Givenchy", "Versace", "Dolce & Gabbana", "Alexander McQueen", "Tom Ford",
  "Moncler", "Max Mara", "Miu Miu", "Mulberry", "Vivienne Westwood", "Jimmy Choo", "Manolo Blahnik", "Christian Louboutin",
  "Louboutin", "Rolex", "Cartier", "Omega", "Tag Heuer", "Breitling", "IWC", "Patek Philippe", "Audemars Piguet",
  "Tiffany", "Bulgari", "Bvlgari", "Van Cleef", "Chopard", "Boodles", "Graff",
];

const plainText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const LUXURY_PATTERN = new RegExp(`(^|[^a-z0-9])(${LUXURY_BRANDS.map((b) => plainText(b).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})($|[^a-z0-9])`);

export function isLuxuryBrand(listing: { title: string; brand?: string | null }): boolean {
  return LUXURY_PATTERN.test(plainText(`${listing.brand ?? ""} ${listing.title}`));
}

type StoreId = "amazon" | "ebay" | "selfridges" | "harrods" | "johnlewis" | "asos" | "decathlon";

const STORE_NAMES: Record<StoreId, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  selfridges: "Selfridges",
  harrods: "Harrods",
  johnlewis: "John Lewis",
  asos: "ASOS",
  decathlon: "Decathlon",
};

/** Which shops fit a listing: luxury names go to department stores, everything else by category. */
export function storesFor(listing: { title: string; brand?: string | null; category?: string | null }): StoreId[] {
  if (isLuxuryBrand(listing)) return ["selfridges", "harrods"];
  switch (listing.category) {
    case "FORMALWEAR":
    case "CLOTHING":
    case "SHOES":
    case "BAGS":
    case "ACCESSORIES":
      return ["johnlewis", "asos"];
    case "JEWELLERY":
    case "WATCHES":
      return ["johnlewis", "ebay"];
    case "CAMPING":
      return ["decathlon", "amazon"];
    default:
      // Cameras, seasonal kit, costumes and anything new: the general marketplaces.
      return ["amazon", "ebay"];
  }
}

/** eBay Partner Network rotation ID for ebay.co.uk. */
const EBAY_UK_ROTATION = "710-53481-19255-0";

/**
 * Search links for a listing on the shops that suit it. `amazonTag` is an Amazon
 * Associates tracking ID (e.g. "justonce-21"); `ebayCampaignId` is an eBay Partner
 * Network campaign ID. Without them the links still work, they just earn nothing.
 * The other shops' links are plain: their affiliate schemes run through networks we haven't joined.
 */
export function buyLinks(
  listing: { title: string; brand?: string | null; category?: string | null },
  ids: { amazonTag?: string | null; ebayCampaignId?: string | null } = {},
): BuyLinks {
  const query = marketQuery(listing);
  const amazonTag = ids.amazonTag?.trim();
  const ebayCampaignId = ids.ebayCampaignId?.trim();
  let affiliate = false;
  const url = (store: StoreId): string => {
    switch (store) {
      case "amazon": {
        const params = new URLSearchParams({ k: query });
        if (amazonTag) {
          params.set("tag", amazonTag);
          affiliate = true;
        }
        return `https://www.amazon.co.uk/s?${params}`;
      }
      case "ebay": {
        const params = new URLSearchParams({ _nkw: query, LH_BIN: "1" });
        if (ebayCampaignId) {
          for (const [key, value] of Object.entries({ mkcid: "1", mkrid: EBAY_UK_ROTATION, siteid: "3", campid: ebayCampaignId, toolid: "10001", mkevt: "1" })) params.set(key, value);
          affiliate = true;
        }
        return `https://www.ebay.co.uk/sch/i.html?${params}`;
      }
      case "selfridges":
        return `https://www.selfridges.com/GB/en/cat/?${new URLSearchParams({ freeText: query })}`;
      case "harrods":
        return `https://www.harrods.com/en-gb/search?${new URLSearchParams({ searchTerm: query })}`;
      case "johnlewis":
        return `https://www.johnlewis.com/search?${new URLSearchParams({ "search-term": query })}`;
      case "asos":
        return `https://www.asos.com/search/?${new URLSearchParams({ q: query })}`;
      case "decathlon":
        return `https://www.decathlon.co.uk/search?${new URLSearchParams({ Ntt: query })}`;
    }
  };
  const stores = storesFor(listing).map((store) => ({ name: STORE_NAMES[store], url: url(store) }));
  return { stores, affiliate };
}
