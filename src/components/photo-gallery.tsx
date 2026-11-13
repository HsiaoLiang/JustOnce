"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Big photos: one swipeable strip that works with touch on phones and with arrows or thumbnails on desktop. */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const el = strip.current;
    if (!el) return;
    const index = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div className="group relative -mx-4 sm:-mx-6 lg:mx-0">
        <div
          ref={strip}
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto lg:rounded-3xl"
        >
          {photos.map((src, i) => (
            <div key={src + i} className="relative aspect-[4/3] w-full shrink-0 snap-center overflow-hidden bg-surface">
              <Image src={src} alt="" aria-hidden fill sizes="96px" className="scale-125 object-cover blur-2xl" />
              <Image
                src={src}
                alt={`${title}, photo ${i + 1} of ${photos.length}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1280px) 800px, (min-width: 1024px) 62vw, 100vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-1 font-mono text-xs text-white lg:hidden">
              {active + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label="Previous photo"
              className="absolute top-1/2 left-4 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/95 shadow-card transition-opacity disabled:opacity-0 lg:flex"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              disabled={active === photos.length - 1}
              aria-label="Next photo"
              className="absolute top-1/2 right-4 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/95 shadow-card transition-opacity disabled:opacity-0 lg:flex"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 hidden gap-3 lg:flex">
          {photos.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === active}
              className={cn("relative size-20 overflow-hidden rounded-xl bg-surface ring-offset-2 transition", i === active ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100")}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
