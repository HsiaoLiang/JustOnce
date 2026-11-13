import Link from "next/link";
import { CATEGORIES } from "@/lib/catalogue";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark className="h-6" />
            <span className="font-display text-lg font-bold tracking-[-0.04em]">just once</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Peer-to-peer rentals for the things you only need once. Made in London for small flats and big weekends.
          </p>
          <p className="mt-4 max-w-sm text-xs text-muted">
            Demo build: payments, deposits and ID checks are simulated. No real money moves.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Rent</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link href={`/search?category=${c.slug}`} className="hover:text-ink">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Lend</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/listings/new" className="hover:text-ink">List an item</Link></li>
            <li><Link href="/dashboard/listings" className="hover:text-ink">My listings</Link></li>
            <li><Link href="/dashboard/rentals" className="hover:text-ink">My rentals</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-ink">How it works</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Just Once. Photos from Unsplash.
        </p>
      </div>
    </footer>
  );
}
