import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { REPO_URL } from "@demo/lib/site";

export function DemoHeader() {
  return (
    <>
      <div className="bg-ink text-paper">
        <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-2 text-center text-xs sm:text-sm">
          <span>
            <span className="font-semibold text-accent">Portfolio demo.</span> Browse freely: bookings, sign-ins and posts are switched off.
          </span>
          <a href={REPO_URL} className="inline-flex items-center gap-0.5 font-semibold underline decoration-accent decoration-2 underline-offset-4">
            Code on GitHub <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        </p>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-18 lg:px-8">
          <Logo />
          <nav className="ml-auto flex items-center gap-0.5 sm:gap-2" aria-label="Main">
            <Link href="/#story" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface sm:px-4">
              Our story
            </Link>
            <Link href="/communities" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface sm:inline-flex">
              Communities
            </Link>
            <Link href="/search" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:bg-ink-2 sm:px-4">
              <Search className="size-4" aria-hidden />
              Browse
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
