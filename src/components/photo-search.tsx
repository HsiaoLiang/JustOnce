"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle } from "lucide-react";
import { resizeImage } from "@/lib/resize-image";

/** "Search with a photo": a borrower shows us the thing they need and AI finds similar items to rent. */
export function PhotoSearch() {
  const router = useRouter();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "danger"; text: string } | null>(null);

  async function search(file: File) {
    setBusy(true);
    setMessage({ tone: "info", text: "Looking at your photo…" });
    try {
      // Shrinking in the browser keeps the upload small and strips location data from phone photos.
      const { blob } = await resizeImage(file, 1024);
      const body = new FormData();
      body.append("file", blob, "photo.jpg");
      const response = await fetch("/api/ai/photo-search", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { href?: string; item?: string; error?: string; detail?: string };
      if (data.detail) console.error("Photo search failed:", data.detail);
      if (!response.ok || !data.href) throw new Error(data.error ?? "Couldn't read that photo. Try the search box instead.");
      setMessage({ tone: "info", text: `Looks like: ${data.item}. Finding similar items…` });
      router.push(data.href);
    } catch (e) {
      setMessage({ tone: "danger", text: e instanceof Error ? e.message : "Couldn't read that photo. Try the search box instead." });
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-1 text-sm">
      <label
        htmlFor={inputId}
        className={`inline-flex cursor-pointer items-center gap-1.5 font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 focus-within:outline-2 focus-within:outline-ink ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
        Or search with a photo
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void search(file);
          }}
        />
      </label>
      <span className="text-muted">Show us what you need and we&apos;ll find one to rent.</span>
      <p aria-live="polite" className={`basis-full ${message?.tone === "danger" ? "font-medium text-danger" : "text-ink-2"}`}>
        {message?.text}
      </p>
    </div>
  );
}
