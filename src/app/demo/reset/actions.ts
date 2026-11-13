"use server";

import { redirect } from "next/navigation";
import { checkResetKey, resetDemoData } from "@/server/demo-reset";
import { setFlash } from "@/server/flash";

export type ResetState = { error?: string } | undefined;

export async function resetDemo(_prev: ResetState, formData: FormData): Promise<ResetState> {
  if (!checkResetKey(String(formData.get("key") ?? ""))) return { error: "That key doesn't match DEMO_RESET_KEY." };
  const summary = await resetDemoData();
  await setFlash(`Demo data reset: ${summary.listings} listings and ${summary.bookings} bookings, dated from today.`);
  redirect("/login");
}
