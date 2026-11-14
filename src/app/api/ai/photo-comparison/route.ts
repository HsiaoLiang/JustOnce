import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnabled, devDetail } from "@/server/ai";
import { getCurrentUser } from "@/server/auth";
import { runPhotoComparison } from "@/server/photo-comparison";

// The model call can take several seconds, plus one retry.
export const maxDuration = 60;

const MAX_PER_HOUR = 30;
const UNAVAILABLE = "Couldn't compare the photos automatically.";

const bodySchema = z.object({ checkId: z.string().regex(/^[a-z0-9]{10,40}$/) });

// Best-effort limit per user. It lives in memory, so it resets when the server restarts.
const recentCalls = new Map<string, number[]>();
function overLimit(userId: string): boolean {
  const cutoff = Date.now() - 3_600_000;
  const calls = (recentCalls.get(userId) ?? []).filter((t) => t > cutoff);
  if (calls.length >= MAX_PER_HOUR) return true;
  recentCalls.set(userId, [...calls, Date.now()]);
  return false;
}

/**
 * POST /api/ai/photo-comparison { checkId }  →  { status }.
 * Compares a saved handover check's photos with the earlier ones and stores the
 * result on the check. The booking page calls it once a check has been saved, so
 * a slow or failed model never holds up the check itself.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to see this booking." }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: UNAVAILABLE }, { status: 400 });
  if (overLimit(user.id)) return NextResponse.json({ error: "That's a lot of comparisons in one go. Try again in a little while." }, { status: 429 });

  const result = await runPhotoComparison(body.data.checkId, user.id, new URL(request.url).origin);
  if (result.status === "not-found") return NextResponse.json({ error: UNAVAILABLE }, { status: 404 });
  if (result.status === "failed") {
    console.error("photo-comparison: AI call failed", result.error);
    return NextResponse.json({ error: UNAVAILABLE, detail: devDetail(result.error) }, { status: 502 });
  }
  return NextResponse.json({ status: result.status });
}
