import { NextResponse } from "next/server";
import { z } from "zod";
import { aiFailureKind, devDetail } from "@/server/ai";
import { buyPriceLookupEnabled, runBuyPriceLookup } from "@/server/market-price";

// A web search plus the model's answer can take a while, and there is one fallback call.
export const maxDuration = 60;

const MAX_PER_HOUR = 120;

// Listing ids are cuids, or slugs for the seeded demo listings.
const bodySchema = z.object({ listingId: z.string().regex(/^[a-z0-9-]{3,60}$/) });

// Best-effort limit for the whole server, since item pages are public. Each listing is also
// only looked up once per cache period, whoever asks. In memory, so it resets on restart.
let recentCalls: number[] = [];
function overLimit(): boolean {
  const cutoff = Date.now() - 3_600_000;
  recentCalls = recentCalls.filter((t) => t > cutoff);
  if (recentCalls.length >= MAX_PER_HOUR) return true;
  recentCalls.push(Date.now());
  return false;
}

/**
 * POST /api/ai/buy-price { listingId }  →  { status }.
 * Looks up what the item costs to buy new (eBay, then the AI model with a web
 * search) and stores it on the listing. The item page calls it in the background
 * when the stored price is missing or stale, so a slow lookup never holds up the page.
 */
export async function POST(request: Request) {
  if (!buyPriceLookupEnabled()) return NextResponse.json({ status: "off" }, { status: 503 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ status: "not-found" }, { status: 400 });
  if (overLimit()) return NextResponse.json({ status: "busy" }, { status: 429 });

  const result = await runBuyPriceLookup(body.data.listingId);
  if (result.status === "not-found") return NextResponse.json({ status: result.status }, { status: 404 });
  if (result.status === "failed") {
    console.error("buy-price: lookup failed", result.error);
    return NextResponse.json({ status: result.status, reason: aiFailureKind(result.error), detail: devDetail(result.error) }, { status: 502 });
  }
  return NextResponse.json({ status: result.status });
}
