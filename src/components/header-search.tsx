"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/** Compact search pill in the header. Hidden on the home page, which has its own big search. */
export function HeaderSearch() {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname === "/") return null;
  return (
    <form action="/search" className="relative hidden w-full max-w-sm md:block" role="search">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        key={params.get("q") ?? ""}
        name="q"
        defaultValue={pathname === "/search" ? (params.get("q") ?? "") : ""}
        placeholder="Search tents, tuxes, drones…"
        aria-label="Search items"
        className="h-11 w-full rounded-full border border-line-strong bg-paper pr-4 pl-10 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] placeholder:text-muted focus:border-ink focus:outline-none"
      />
    </form>
  );
}
