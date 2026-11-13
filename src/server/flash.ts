// One-shot messages shown after a redirect ("Request sent", "Listing published").

import { cookies } from "next/headers";

export const FLASH_COOKIE = "jo_flash";

export type Flash = { message: string; tone?: "success" | "info" | "error"; id?: number };

export async function setFlash(message: string, tone: Flash["tone"] = "success") {
  const store = await cookies();
  // Next URL-encodes cookie values itself.
  store.set(FLASH_COOKIE, JSON.stringify({ message, tone, id: Date.now() }), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
  });
}
