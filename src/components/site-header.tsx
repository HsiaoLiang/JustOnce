import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getAttentionCounts } from "@/server/queries";
import { Logo } from "./logo";
import { LinkButton } from "./ui";
import { UserMenu } from "./user-menu";
import { MobileTabBar } from "./mobile-tab-bar";
import { HeaderSearch } from "./header-search";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const counts = user ? await getAttentionCounts(user.id) : { rentals: 0, listings: 0 };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-18 lg:px-8">
          <Logo />
          <Suspense fallback={<div className="hidden flex-1 md:block" />}>
            <HeaderSearch />
          </Suspense>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2" aria-label="Main">
            <Link
              href="/search"
              className="inline-flex size-10 items-center justify-center rounded-full hover:bg-surface md:hidden"
              aria-label="Search"
            >
              <Search className="size-5" />
            </Link>
            {user ? (
              <>
                <Link href="/listings/new" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface lg:inline-flex">
                  List an item
                </Link>
                <NavLink href="/dashboard/rentals" label="My rentals" count={counts.rentals} />
                <NavLink href="/dashboard/listings" label="My listings" count={counts.listings} />
                <UserMenu user={{ id: user.id, name: user.name, avatarUrl: user.avatarUrl, email: user.email }} />
              </>
            ) : (
              <>
                <Link href="/signup?next=/listings/new" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface lg:inline-flex">
                  List an item
                </Link>
                <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-surface sm:px-4">
                  Log in
                </Link>
                <LinkButton href="/signup" variant="dark" size="sm" className="hidden sm:inline-flex">
                  Sign up
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>
      <MobileTabBar signedIn={Boolean(user)} counts={counts} userId={user?.id} />
    </>
  );
}

function NavLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className="relative hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface md:inline-flex">
      {label}
      {count > 0 && (
        <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-ink">
          {count}
          <span className="sr-only"> need your attention</span>
        </span>
      )}
    </Link>
  );
}
