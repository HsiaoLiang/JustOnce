"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Quietly re-fetches the page while it's visible, so when the other person
 * accepts or confirms a check on their phone, this screen catches up by itself.
 * Pauses while someone is typing or has unsaved photos in a form.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      if (document.querySelector("[data-dirty='true']")) return;
      router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}
