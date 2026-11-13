import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Banknote, RotateCcw } from "lucide-react";
import { SignupForm } from "@/components/auth-forms";
import { getCurrentUser, safeNext } from "@/server/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNext(params.next, "/");
  if (await getCurrentUser()) redirect(next);
  const listing = next.startsWith("/listings/new");

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-semibold">{listing ? "Start lending in two minutes" : "Join Just Once"}</h1>
        <p className="mt-2 mb-7 text-muted">
          {listing ? "Create an account, then list your first item." : "Rent the things you only need once, from people nearby."}
        </p>
        <SignupForm next={next} />
      </div>
      <aside className="mx-auto hidden w-full max-w-sm self-center md:block">
        <ul className="space-y-6">
          <Benefit icon={<Banknote className="size-5" />} title="Owners keep 100% of their price">
            Renters pay a small service fee on top. You set the daily price and the deposit.
          </Benefit>
          <Benefit icon={<RotateCcw className="size-5" />} title="Deposits that come back">
            Both sides photograph the item at pickup and return, so everyone knows what condition it was in.
          </Benefit>
          <Benefit icon={<BadgeCheck className="size-5" />} title="Verified neighbours">
            Verify your identity to earn the badge that tells others you're for real.
          </Benefit>
        </ul>
      </aside>
    </div>
  );
}

function Benefit({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{children}</p>
      </div>
    </li>
  );
}
