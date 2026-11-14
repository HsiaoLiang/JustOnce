import type { Metadata } from "next";
import { ListingForm } from "@/components/listing-form";
import { Container } from "@/components/ui";
import { emptyListingValues } from "@/lib/listing-form-values";
import { todayInLondon } from "@/lib/dates";
import { aiEnabled } from "@/server/ai";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "List an item" };

export default async function NewListingPage() {
  const user = await requireUser("/listings/new");
  const today = todayInLondon();
  return (
    <Container className="py-8 md:py-12">
      <div className="mb-10 max-w-2xl">
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Lend something</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">List an item</h1>
        <p className="mt-2 text-muted">It takes about two minutes. You choose who rents it, and it&apos;s yours again after every rental.</p>
      </div>
      <ListingForm mode="create" today={today} aiEnabled={aiEnabled()} initial={emptyListingValues(today, user.area)} />
    </Container>
  );
}
