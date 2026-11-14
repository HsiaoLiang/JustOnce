"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Asks the server to look up what the item costs to buy new, once, then refreshes
 * the page so the price appears. Shown on the item page only when the stored price
 * is missing or stale. `quiet` hides the "checking" line when an older price is
 * already on screen. If the lookup fails, nothing else on the page changes.
 */
export function BuyPriceRunner({ listingId, quiet }: { listingId: string; quiet: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      let found = false;
      try {
        const response = await fetch("/api/ai/buy-price", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        const data = (await response.json().catch(() => ({}))) as { status?: string; detail?: string };
        if (data.detail) console.error("Buy price lookup failed:", data.detail);
        found = data.status === "found";
      } catch {
        // Offline or interrupted: the page simply shows no buy price.
      }
      setBusy(false);
      if (found) router.refresh();
    })();
  }, [listingId, router]);

  if (!busy || quiet) return null;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted" role="status">
      <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Checking what it costs to buy new…
    </p>
  );
}
