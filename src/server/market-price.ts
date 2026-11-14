// Looks up what an item costs to buy new on eBay UK, for the rent-versus-buy line
// on the item page. Server-only: the eBay keys never reach the browser.
//
// Nothing here throws. With no keys, no match, or eBay being slow or down, the
// caller gets "no market price" and the page falls back to the owner's
// replacement value (see buyPriceFor in src/lib/market-price.ts).
//
// Uses eBay's Browse API (item_summary/search) with an application token.
// Keys: https://developer.ebay.com/my/keys. Sandbox keys work but return made-up
// listings; production keys need eBay's approval for the Buy APIs.

import { marketPriceIsStale, marketQuery, plausibleMarketPrice, typicalPrice } from "@/lib/market-price";
import { db } from "./db";

// The item page waits for this on a listing's first view, so keep it short.
const TIMEOUT_MS = 3_000;
const RESULTS = 30;

const apiBase = () => (process.env.EBAY_ENV?.toLowerCase() === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com");

/** The rent-versus-buy line uses live prices only when both keys are set. */
export function marketPricesEnabled(): boolean {
  return !!process.env.EBAY_CLIENT_ID && !!process.env.EBAY_CLIENT_SECRET;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function appToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${apiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`eBay token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("eBay token response had no access_token");
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 7200) * 1000 };
  return cachedToken.value;
}

/** The same search on ebay.co.uk (new, Buy It Now), for renters who want to check the number. */
function publicSearchUrl(query: string): string {
  return `https://www.ebay.co.uk/sch/i.html?${new URLSearchParams({ _nkw: query, LH_ItemCondition: "1000", LH_BIN: "1" })}`;
}

export interface MarketPrice {
  /** Pence. */
  price: number;
  count: number;
  url: string;
}

/** Typical new, Buy It Now price on eBay UK for this item, or null. Never throws. */
export async function lookupMarketPrice(listing: { title: string; brand?: string | null; replacementValue?: number | null }): Promise<MarketPrice | null> {
  if (!marketPricesEnabled()) return null;
  const query = marketQuery(listing);
  if (query.length < 3) return null;
  try {
    const token = await appToken();
    const params = new URLSearchParams({ q: query, limit: String(RESULTS), filter: "conditions:{NEW},buyingOptions:{FIXED_PRICE}" });
    const res = await fetch(`${apiBase()}/buy/browse/v1/item_summary/search?${params}`, {
      headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_GB" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status === 401) cachedToken = null;
    if (!res.ok) throw new Error(`eBay search failed: ${res.status}`);
    const json = (await res.json()) as { itemSummaries?: { price?: { value?: string; currency?: string } }[] };
    const prices = (json.itemSummaries ?? [])
      .filter((item) => item.price?.currency === "GBP")
      .map((item) => Math.round(Number(item.price?.value) * 100));
    const typical = typicalPrice(prices);
    if (!typical || !plausibleMarketPrice(typical.price, listing.replacementValue)) return null;
    return { price: typical.price, count: typical.count, url: publicSearchUrl(query) };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn("[market-price]", error instanceof Error ? error.message : error);
    return null;
  }
}

interface ListingWithMarketPrice {
  id: string;
  title: string;
  brand: string | null;
  replacementValue: number | null;
  marketPrice: number | null;
  marketPriceCount: number | null;
  marketPriceUrl: string | null;
  marketPriceCheckedAt: Date | null;
}

type MarketPriceFields = Pick<ListingWithMarketPrice, "marketPrice" | "marketPriceCount" | "marketPriceUrl">;

/**
 * The listing's cached market price, looked up again first if it is missing or
 * stale. A hit is kept for a week and a miss for a few hours, so eBay is called
 * about once per listing per week, on whichever page view comes first.
 */
export async function ensureMarketPrice(listing: ListingWithMarketPrice): Promise<MarketPriceFields> {
  const cached: MarketPriceFields = { marketPrice: listing.marketPrice, marketPriceCount: listing.marketPriceCount, marketPriceUrl: listing.marketPriceUrl };
  if (!marketPricesEnabled() || !marketPriceIsStale(listing.marketPriceCheckedAt, !!listing.marketPrice)) return cached;
  const found = await lookupMarketPrice(listing);
  const fresh: MarketPriceFields = { marketPrice: found?.price ?? null, marketPriceCount: found?.count ?? null, marketPriceUrl: found?.url ?? null };
  try {
    await db.listing.update({ where: { id: listing.id }, data: { ...fresh, marketPriceCheckedAt: new Date() } });
  } catch {
    // The listing was edited or removed meanwhile; the next view tries again.
  }
  return fresh;
}
