"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

type Flash = { message: string; tone?: "success" | "info" | "error"; id?: number };
const COOKIE = "jo_flash";

function takeFlash(): Flash | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
  let value = raw.slice(COOKIE.length + 1);
  for (let i = 0; i < 3; i++) {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed?.message === "string" ? parsed : null;
    } catch {
      try {
        value = decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Shows one-shot messages set by server actions ("Request sent", "Booking confirmed").
 * Server actions re-render the page but not the root layout, so the message is
 * picked up from its cookie on the client as soon as a response sets it.
 */
export function FlashToast() {
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    const check = () => {
      const next = takeFlash();
      if (next) setFlash({ ...next, id: next.id ?? Date.now() });
    };
    check();
    const poll = setInterval(check, 400);
    const store = (window as unknown as { cookieStore?: EventTarget }).cookieStore;
    store?.addEventListener("change", check);
    return () => {
      clearInterval(poll);
      store?.removeEventListener("change", check);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), flash.tone === "error" ? 8000 : 5500);
    return () => clearTimeout(t);
  }, [flash]);

  if (!flash) return null;
  const tone = flash.tone ?? "success";
  const Icon = tone === "success" ? CircleCheck : tone === "error" ? CircleAlert : Info;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:top-22 md:bottom-auto">
      <div
        key={flash.id}
        role={tone === "error" ? "alert" : "status"}
        className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl bg-ink py-3 pr-3 pl-4 text-sm font-medium text-white shadow-lift"
      >
        <Icon className={tone === "info" ? "size-5 shrink-0 text-white/70" : tone === "error" ? "size-5 shrink-0 text-[#ff8a7a]" : "size-5 shrink-0 text-accent"} aria-hidden />
        <span>{flash.message}</span>
        <button type="button" onClick={() => setFlash(null)} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
