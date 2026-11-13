"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Plus, Search, Store, Ticket, UserRound, LogIn } from "lucide-react";
import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: typeof Compass; count?: number; match: (p: string) => boolean; primary?: boolean };

/** App-style bottom navigation on phones, so judges on mobile always have the main routes one tap away. */
export function MobileTabBar({ signedIn, counts, userId }: { signedIn: boolean; counts: { rentals: number; listings: number }; userId?: string }) {
  const pathname = usePathname();
  // Item pages have their own sticky booking bar at the bottom.
  if (pathname.startsWith("/items/")) return null;
  const tabs: Tab[] = signedIn
    ? [
        { href: "/", label: "Explore", icon: Compass, match: (p) => p === "/" || p.startsWith("/search") || p.startsWith("/items") },
        { href: "/dashboard/rentals", label: "Rentals", icon: Ticket, count: counts.rentals, match: (p) => p.startsWith("/dashboard/rentals") },
        { href: "/listings/new", label: "List", icon: Plus, match: (p) => p === "/listings/new", primary: true },
        { href: "/dashboard/listings", label: "Listings", icon: Store, count: counts.listings, match: (p) => p.startsWith("/dashboard/listings") || p.endsWith("/edit") },
        { href: "/account", label: "Profile", icon: UserRound, match: (p) => p.startsWith("/account") || (!!userId && p === `/users/${userId}`) },
      ]
    : [
        { href: "/", label: "Explore", icon: Compass, match: (p) => p === "/" || p.startsWith("/items") },
        { href: "/search", label: "Search", icon: Search, match: (p) => p.startsWith("/search") },
        { href: "/signup?next=/listings/new", label: "List", icon: Plus, match: () => false, primary: true },
        { href: "/login", label: "Log in", icon: LogIn, match: (p) => p.startsWith("/login") || p.startsWith("/signup") },
      ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[0.7rem] font-semibold", active ? "text-ink" : "text-muted")}
              >
                {tab.primary ? (
                  <span className="mb-0.5 flex size-8 items-center justify-center rounded-full bg-accent text-ink">
                    <Icon className="size-5" strokeWidth={2.4} aria-hidden />
                  </span>
                ) : (
                  <Icon className={cn("size-6", active && "stroke-[2.3]")} aria-hidden />
                )}
                <span className={tab.primary ? "-mt-0.5" : ""}>{tab.label}</span>
                {!!tab.count && (
                  <span className="absolute top-1 left-1/2 ml-2 inline-flex min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] leading-4.5 font-bold text-ink">
                    {tab.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
