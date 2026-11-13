import Link from "next/link";
import { cn } from "@/lib/cn";

/** A ticket with a tear-off stub: the rental goes out, the deposit comes back. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 26" className={cn("h-6 w-auto", className)} aria-hidden>
      <path
        d="M5 1.5h26A3.5 3.5 0 0 1 34.5 5v4.6a3.4 3.4 0 0 0 0 6.8V21a3.5 3.5 0 0 1-3.5 3.5H5A3.5 3.5 0 0 1 1.5 21v-4.6a3.4 3.4 0 0 0 0-6.8V5A3.5 3.5 0 0 1 5 1.5Z"
        fill="var(--color-accent)"
      />
      <path d="M25 5.5v15" stroke="var(--color-ink)" strokeWidth="1.6" strokeDasharray="2.2 2.2" strokeLinecap="round" />
      <path d="M11.2 9.4 14.6 7v12" stroke="var(--color-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-lg", className)} aria-label="Just Once home">
      <LogoMark className="h-7" />
      <span className="font-display text-[1.35rem] leading-none font-bold tracking-[-0.04em]">just once</span>
    </Link>
  );
}
