import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { Avatar } from "@/components/ui";
import { getCurrentUser, safeNext } from "@/server/auth";
import { demoLogin } from "@/server/actions/auth";
import { DEMO_ACCOUNTS, DEMO_COMMUNITY_ORDER, DEMO_MODE, DEMO_PASSWORD_HINT } from "@/lib/demo";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next, "/");
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 mb-7 text-muted">Log in to book, lend and check on your rentals.</p>
        <LoginForm next={next} />
      </div>

      {DEMO_MODE && (
        <section aria-labelledby="demo-heading" className="ticket mx-auto w-full max-w-2xl self-start p-5 [--notch-bg:var(--color-paper)]">
          <p className="font-mono text-[0.7rem] tracking-[0.14em] text-muted uppercase">Demo accounts</p>
          <h2 id="demo-heading" className="mt-1 text-xl font-semibold">Skip the typing</h2>
          <p className="mt-1 text-sm text-muted">
            Tap to log in as a seeded member of each school or company. Every demo password is <span className="font-mono text-ink">{DEMO_PASSWORD_HINT}</span>.
          </p>
          <div className="mt-4 space-y-5">
            {DEMO_COMMUNITY_ORDER.map((community) => (
              <div key={community}>
                <p className="mb-2 font-mono text-[0.7rem] tracking-[0.14em] text-muted uppercase">{community}</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.filter((a) => a.community === community).map((a) => (
                    <li key={a.email}>
                      <form action={demoLogin}>
                        <input type="hidden" name="email" value={a.email} />
                        <input type="hidden" name="next" value={next === "/" ? (a.role === "Owner" ? "/dashboard/listings" : "/dashboard/rentals") : next} />
                        <button
                          type="submit"
                          className="flex h-full w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:border-ink hover:bg-surface"
                        >
                          <Avatar name={a.name} src={a.avatar} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
