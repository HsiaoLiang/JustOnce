"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Asks the server to compare a saved check's photos with the earlier ones, then
 * refreshes the page so the result appears. With `auto` it starts by itself the
 * first time it is shown; otherwise it is a "try again" link after a failure.
 * If the call fails nothing else on the page changes: the check is already saved.
 */
export function PhotoComparisonRunner({ checkId, auto, label }: { checkId: string; auto: boolean; label: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [busy, setBusy] = useState(auto);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/ai/photo-comparison", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkId }),
      });
      const data = (await response.json().catch(() => ({}))) as { detail?: string };
      if (data.detail) console.error("Photo comparison failed:", data.detail);
    } catch {
      // Offline or interrupted: the page simply shows no comparison.
    }
    setBusy(false);
    router.refresh();
  }, [checkId, router]);

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    void run();
  }, [auto, run]);

  if (busy) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted" role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> {label}
      </p>
    );
  }
  if (auto) return null;
  return (
    <p className="mt-3 text-xs text-muted">
      Couldn&apos;t compare the photos automatically.{" "}
      <button type="button" onClick={() => void run()} className="font-semibold text-ink underline underline-offset-2">
        Try again
      </button>
    </p>
  );
}
