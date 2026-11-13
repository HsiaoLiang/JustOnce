import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Avatar } from "@/components/ui";
import { getCurrentUser, safeNext } from "@/server/auth";
import { demoLogin } from "@/server/actions/auth";
import { DEMO_ACCOUNTS, DEMO_MODE, DEMO_PASSWORD_HINT } from "@/lib/demo";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next, "/");
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 mb-7 text-muted">Log in to book, lend and check on your rentals.</p>
        <LoginForm next={next} />
      </div>

      {DEMO_MODE && (
        <section aria-labelledby="demo-heading" className="ticket mx-auto w-full max-w-sm self-start p-5 [--notch-bg:var(--color-paper)]">
          <p className="font-mono text-[0.7rem] tracking-[0.14em] text-muted uppercase">Demo accounts</p>
          <h2 id="demo-heading" className="mt-1 text-xl font-semibold">Skip the typing</h2>
          <p className="mt-1 text-sm text-muted">
            Tap to log in as one of the seeded Londoners. Every demo password is <span className="font-mono text-ink">{DEMO_PASSWORD_HINT}</span>.
          </p>
          <ul className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <form action={demoLogin}>
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="next" value={next === "/" ? (a.role === "Owner" ? "/dashboard/listings" : "/dashboard/rentals") : next} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-ink hover:bg-surface"
                  >
                    <Avatar name={a.name} src={a.avatar} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {a.name}
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[0.7rem] font-semibold text-ink-2">{a.role}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">{a.note}</span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
