import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { CLAIM_REASONS, CLAIM_WINDOW_HOURS, DEPOSIT_PROMISE, MAX_RENTAL_DAYS, SERVICE_FEE_RATE, TRUSTED_RENTER } from "@/lib/money";

export const metadata: Metadata = {
  title: "Policies",
  description: "How bookings, payments, deposits, damage claims, cancellations and reviews work on Just Once.",
};

// Every number on this page comes from the same constants the app uses, so it can't drift.
const fee = `${Math.round(SERVICE_FEE_RATE * 100)}%`;
const reasons = CLAIM_REASONS.map((r) => r.label.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " or $1");

const SECTIONS = [
  { id: "booking", title: "Booking" },
  { id: "payments", title: "Payments and fees" },
  { id: "deposits", title: "Deposits" },
  { id: "trusted-renters", title: "Half deposits for trusted renters" },
  { id: "handovers", title: "Pickup and return checks" },
  { id: "damage-claims", title: "Damage claims" },
  { id: "cancellations", title: "Cancellations" },
  { id: "reviews", title: "Reviews and verification" },
  { id: "privacy", title: "Your details" },
];

export default function PoliciesPage() {
  return (
    <Container className="py-10 md:py-14">
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">The fine print, in plain English</p>
        <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">Policies</h1>
        <p className="mt-3 text-lg text-ink-2">How renting and lending work on Just Once: what you pay, when you get your deposit back, and what happens if something goes wrong.</p>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">On this page</p>
          <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:border-ink lg:rounded-lg lg:border-0 lg:px-2 lg:hover:bg-surface">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-2xl space-y-12">
          <Section id="booking" title="Booking">
            <Rule>You ask for dates and the owner accepts or declines. Nothing is booked, and nothing is charged, until they accept.</Rule>
            <Rule>You can rent an item for up to {MAX_RENTAL_DAYS} days at a time, from today onwards, inside the dates the owner has made it available.</Rule>
            <Rule>
              Pending requests don&apos;t hold dates. Once the owner accepts one, those dates are locked and any other requests for overlapping days are declined
              automatically, without charge. Two confirmed bookings can never share a day.
            </Rule>
            <Rule>If the pickup date passes before the owner answers, the request expires and nothing happens.</Rule>
          </Section>

          <Section id="payments" title="Payments and fees">
            <Rule>
              Renters pay the daily price for each day plus a {fee} service fee, which covers payments, deposit protection and support. You see the full breakdown
              before you send a request.
            </Rule>
            <Rule>You&apos;re charged when the owner accepts, not when you ask.</Rule>
            <Rule>Owners keep 100% of their daily price. The payout is released once the item has been returned.</Rule>
          </Section>

          <Section id="deposits" title="Deposits">
            <Rule>{DEPOSIT_PROMISE}</Rule>
            <Rule>Owners set the deposit for each item. If they enter what it would cost to replace, we suggest 25% of that (at least £20), and they can change it.</Rule>
            <Rule>Renters see the deposit, and the amount they&apos;ll personally pay, on the item page before they ask.</Rule>
          </Section>

          <Section id="trusted-renters" title="Half deposits for trusted renters">
            <Rule>
              You pay half the listed deposit when all of these are true:
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>your identity is verified</li>
                <li>you&apos;ve completed at least {TRUSTED_RENTER.minRentals} rentals</li>
                <li>owners have rated you {TRUSTED_RENTER.minRating} or higher on average</li>
                <li>there&apos;s no deposit claim against you still waiting to be settled</li>
              </ul>
            </Rule>
            <Rule>
              The item page tells you why, for example: &ldquo;Your deposit: £25. Half the usual £50 because you&apos;re verified with 3 good reviews.&rdquo; If you
              haven&apos;t verified your ID yet, you&apos;ll see a link to <Link href="/account" className="font-semibold underline underline-offset-4">verify it</Link>.
            </Rule>
            <Rule>
              Your deposit is worked out when you send the request, from your account at that moment, and that&apos;s the amount held if the owner accepts.
            </Rule>
            <Rule>Owners can tick &ldquo;Always take the full deposit&rdquo; on a listing. Everyone then pays the full amount for that item.</Rule>
          </Section>

          <Section id="handovers" title="Pickup and return checks">
            <Rule>
              When you meet, both of you photograph the item and confirm its condition in the app. The rental starts once you&apos;ve both confirmed pickup, and ends
              once you&apos;ve both confirmed the return.
            </Rule>
            <Rule>Picking up early or returning early is fine if you both agree. The booked dates and the price stay the same.</Rule>
            <Rule>These photos are the record if anyone has a question about the deposit later, so take clear ones.</Rule>
          </Section>

          <Section id="damage-claims" title="Damage claims">
            <Rule>
              If an item comes back {reasons}, the owner says so at the return check, with photos and a note. The deposit then stays held instead of being returned.
            </Rule>
            <Rule>
              The owner has {CLAIM_WINDOW_HOURS} hours to claim part or all of the deposit, never more than the deposit itself, and only one claim per rental. If they
              don&apos;t claim in time, the full deposit is returned automatically.
            </Rule>
            <Rule>
              The renter sees the pickup and return photos side by side and can accept the claim (the rest of the deposit comes straight back) or contest it with
              their own note and photos. Contested claims are reviewed by Just Once, who decide how much, if any, the owner keeps.
            </Rule>
            <Rule>
              If the renter has confirmed the return and the owner doesn&apos;t confirm within {CLAIM_WINDOW_HOURS} hours, the rental is completed and the deposit
              returned in full automatically.
            </Rule>
          </Section>

          <Section id="cancellations" title="Cancellations">
            <Rule>Renters can cancel a request at any time before it&apos;s accepted. Nothing has been charged.</Rule>
            <Rule>After acceptance, either side can cancel before pickup. The renter gets a full refund, service fee included, and the deposit is released.</Rule>
            <Rule>Once the item has been picked up, the booking can&apos;t be cancelled: return it and complete the return check instead.</Rule>
          </Section>

          <Section id="reviews" title="Reviews and verification">
            <Rule>Once an item is back, owner and renter can each rate the other. Reviews appear on public profiles and, for renters&apos; reviews, on the item page.</Rule>
            <Rule>
              A verified badge means the member has completed an identity check. Verification also counts towards{" "}
              <a href="#trusted-renters" className="font-semibold underline underline-offset-4">half deposits</a>.
            </Rule>
          </Section>

          <Section id="privacy" title="Your details">
            <Rule>Renters see an item&apos;s pickup area from the start. The owner&apos;s exact pickup details are only shown once a booking is accepted.</Rule>
            <Rule>Photos you upload are resized in your browser first, which also removes hidden location data from phone photos.</Rule>
          </Section>

          <p className="rounded-2xl bg-surface p-5 text-sm text-ink-2">
            This is a demo for AI Cup: payments, deposits, identity checks and claim reviews are simulated, and no real money moves.
          </p>
        </div>
      </div>
    </Container>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </section>
  );
}

function Rule({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed text-ink-2">
      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
      <div>{children}</div>
    </li>
  );
}
