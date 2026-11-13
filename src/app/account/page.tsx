import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, IdCard, LogOut } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { Button, Card, Container } from "@/components/ui";
import { formatFullDate, toISO } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { logout } from "@/server/actions/auth";
import { verifyIdentity } from "@/server/actions/profile";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <Container className="max-w-3xl py-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Account</h1>
          <p className="mt-1 text-muted">{user.email}</p>
        </div>
        <Link href={`/users/${user.id}`} className="text-sm font-semibold underline underline-offset-4">
          View public profile
        </Link>
      </div>

      <div className="space-y-6">
        <Card className="p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-semibold">Your profile</h2>
          <ProfileForm initial={{ name: user.name, bio: user.bio ?? "", area: user.area ?? "", avatarUrl: user.avatarUrl }} />
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              {user.verifiedAt ? <BadgeCheck className="size-5" /> : <IdCard className="size-5" />}
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Identity check</h2>
              {user.verifiedAt ? (
                <p className="mt-1 text-ink-2">Verified on {formatFullDate(toISO(user.verifiedAt))}. Your profile and listings show the verified badge.</p>
              ) : (
                <>
                  <p className="mt-1 text-ink-2">
                    Verified members get more bookings. Normally you&apos;d photograph your ID and take a selfie; in this demo the check is simulated and completes straight away.
                  </p>
                  <form action={verifyIdentity} className="mt-4">
                    <Button type="submit">Verify my identity (simulated)</Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-semibold">Log out</h2>
            <p className="mt-1 text-sm text-muted">You can log back in any time.</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="secondary">
              <LogOut className="size-4" aria-hidden /> Log out
            </Button>
          </form>
        </Card>
      </div>
    </Container>
  );
}
