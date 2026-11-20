import Link from "next/link";
import { CATEGORIES } from "@/lib/catalogue";
import { LogoMark } from "@/components/logo";
import { REPO_URL } from "@demo/lib/site";

export function DemoFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark className="h-6" />
            <span className="font-display text-lg font-bold tracking-[-0.04em]">just once</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Peer-to-peer rentals for the things you only need once, starting with the people you share a campus or office with. Built for AI Cup.
          </p>
          <p className="mt-4 max-w-sm text-xs text-muted">
            This is a static demo with sample data. The full app (accounts, bookings, deposits, community verification) is in the{" "}
            <a href={REPO_URL} className="font-semibold underline underline-offset-2 hover:text-ink">
              GitHub repo
            </a>
            .
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Rent</p>
          <ul className="mt-3 columns-2 gap-6 text-sm text-muted [&>li]:mb-2">
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
          <p className="text-sm font-semibold">About</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/#story" className="hover:text-ink">Why we built it</Link></li>
            <li><Link href="/communities" className="hover:text-ink">Communities</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-ink">How it works</Link></li>
            <li><Link href="/policies" className="hover:text-ink">Policies</Link></li>
            <li><a href={REPO_URL} className="hover:text-ink">Source code</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">Just Once · AI Cup project. Photos from Unsplash.</p>
      </div>
    </footer>
  );
}
