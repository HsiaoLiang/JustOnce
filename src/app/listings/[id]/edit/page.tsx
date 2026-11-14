import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listing-form";
import { Button, Container } from "@/components/ui";
import { BLOCKING_STATUSES } from "@/lib/booking-rules";
import { eachDay, todayInLondon, toDate, toISO } from "@/lib/dates";
import { penceToPoundsInput } from "@/lib/money";
import { requireUser } from "@/server/auth";
import { archiveListing, setListingStatus } from "@/server/actions/listings";
import { getListingForEdit } from "@/server/queries";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/edit`);
  const data = await getListingForEdit(id, user.id);
  if (!data) notFound();
  const { listing } = data;
  const today = todayInLondon();
  const booked = await db.booking.findMany({
    where: { listingId: id, status: { in: [...BLOCKING_STATUSES] }, endDate: { gte: toDate(today) } },
    select: { startDate: true, endDate: true },
  });
  const locked = booked.flatMap((b) => eachDay(toISO(b.startDate), toISO(b.endDate)));
  const paused = listing.status === "PAUSED";

  return (
    <Container className="py-8 md:py-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Link href={`/items/${listing.id}`} className="text-sm font-semibold text-muted hover:text-ink">
            ← View listing
          </Link>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Edit listing</h1>
          <p className="mt-2 text-muted">{paused ? "Paused: hidden from search until you resume it." : "Live: renters can find and book it."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={setListingStatus}>
            <input type="hidden" name="id" value={listing.id} />
            <input type="hidden" name="status" value={paused ? "ACTIVE" : "PAUSED"} />
            <Button type="submit" variant="secondary" size="sm">
              {paused ? "Resume listing" : "Pause listing"}
            </Button>
          </form>
          <form action={archiveListing}>
            <input type="hidden" name="id" value={listing.id} />
            <Button type="submit" variant="danger" size="sm" disabled={data.hasOpenBookings} title={data.hasOpenBookings ? "Finish or cancel confirmed bookings first" : undefined}>
              Remove listing
            </Button>
          </form>
        </div>
      </div>
      <ListingForm
        mode="edit"
        today={today}
        locked={locked}
        initial={{
          id: listing.id,
          title: listing.title,
          description: listing.description,
          category: listing.category,
          condition: listing.condition,
          brand: listing.brand ?? "",
          size: listing.size ?? "",
          price: penceToPoundsInput(listing.pricePerDay),
          deposit: penceToPoundsInput(listing.deposit),
          replacementValue: listing.replacementValue ? penceToPoundsInput(listing.replacementValue) : "",
          fullDepositOnly: listing.fullDepositOnly,
          area: listing.area,
          pickupNotes: listing.pickupNotes ?? "",
          photos: listing.photos,
          availableFrom: toISO(listing.availableFrom) < today ? today : toISO(listing.availableFrom),
          availableTo: toISO(listing.availableTo),
          blockedDates: data.blockedDates,
        }}
      />
    </Container>
  );
}
