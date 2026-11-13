import { NextResponse } from "next/server";
import { checkResetKey, demoResetEnabled, resetDemoData } from "@/server/demo-reset";

export const maxDuration = 60;

// curl -X POST https://your-app.vercel.app/api/demo/reset -H "x-demo-key: $DEMO_RESET_KEY"
export async function POST(request: Request) {
  if (!demoResetEnabled()) return NextResponse.json({ error: "Demo reset is turned off. Set DEMO_RESET_KEY to enable it." }, { status: 404 });
  if (!checkResetKey(request.headers.get("x-demo-key") ?? "")) return NextResponse.json({ error: "Wrong key." }, { status: 401 });
  const summary = await resetDemoData();
  return NextResponse.json({ ok: true, ...summary });
}
