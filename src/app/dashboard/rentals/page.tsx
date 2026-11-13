import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BookingListItem } from "@/components/booking-bits";
import { Container, EmptyState, LinkButton } from "@/components/ui";
import { nextStep } from "@/lib/booking-flow";
import { todayInLondon, toISO } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { getRenterBookings, toFlow, type BookingRow } from "@/server/queries";

export const metadata: Metadata = { title: "My rentals" };

export default async function RentalsPage() {
  const user = await requireUser("/dashboard/rentals");
  const bookings = await getRenterBookings(user.id);
  const today = todayInLondon();
  const withStep = bookings.map((b) => ({ b, step: nextStep(toFlow(b), "RENTER", b.owner.name, today) }));

  const needsYou = withStep.filter((x) => x.step.needsYou);
  const rest = withStep.filter((x) => !x.step.needsYou);
  const isExpired = (b: BookingRow) => b.status === "REQUESTED" && toISO(b.startDate) < today;
  const upcoming = rest.filter((x) => x.b.status === "ACCEPTED" || (x.b.status === "REQUESTED" && !isExpired(x.b)));
  const active = rest.filter((x) => x.b.status === "ACTIVE");
  const past = rest
    .filter((x) => ["COMPLETED", "DECLINED", "CANCELLED"].includes(x.b.status) || isExpired(x.b))
    .sort((a, b) => b.b.startDate.getTime() - a.b.startDate.getTime());

  return (
    <Container className="py-8 md:py-12">
      <AutoRefresh intervalMs={8000} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">My rentals</h1>
          <p className="mt-1 text-muted">Things you&apos;re borrowing, from request to return.</p>
        </div>
        <LinkButton href="/search" variant="secondary">
          Find something to rent
        </LinkButton>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-8" />}
          title="No rentals yet"
          body="When you request something, it shows up here with every step from pickup to getting your deposit back."
          action={<LinkButton href="/search">Browse items</LinkButton>}
        />
      ) : (
        <div className="space-y-12">
          <Group title="Needs you" items={needsYou} accent />
          <Group title="On rent now" items={active} />
          <Group title="Upcoming" items={upcoming} />
          <Group title="Past" items={past} />
        </div>
      )}
    </Container>
  );
}

function Group({ title, items, accent }: { title: string; items: { b: BookingRow; step: { label: string; needsYou: boolean } }[]; accent?: boolean }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        {title}
        <span className={accent ? "rounded-full bg-accent px-2 text-sm text-ink" : "rounded-full bg-surface px-2 text-sm text-muted"}>{items.length}</span>
      </h2>
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map(({ b, step }) => (
          <BookingListItem key={b.id} booking={b} viewer="RENTER" step={step} />
        ))}
      </ul>
    </section>
  );
}
