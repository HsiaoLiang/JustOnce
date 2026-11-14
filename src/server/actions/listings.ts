"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../db";
import { requireUser } from "../auth";
import { setFlash } from "../flash";
import { isAreaSlug } from "@/lib/areas";
import { CATEGORIES, CONDITIONS } from "@/lib/catalogue";
import { diffDays, isISODate, todayInLondon, toDate } from "@/lib/dates";
import { parsePounds } from "@/lib/money";
import { isAllowedPhotoUrl, MAX_LISTING_PHOTOS } from "@/lib/photos";

export type ListingFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const jsonArray = (value: FormDataEntryValue | null): unknown[] => {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const listingSchema = z.object({
  title: z.string().trim().min(4, "Give it a title of at least 4 characters.").max(80, "Keep the title under 80 characters."),
  description: z.string().trim().min(20, "Describe it in a sentence or two (20 characters or more).").max(2000, "Keep the description under 2,000 characters."),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], { error: "Choose a category." }),
  condition: z.enum(CONDITIONS.map((c) => c.id) as [string, ...string[]], { error: "Choose the condition." }),
  brand: z.string().trim().max(60, "Keep the brand under 60 characters."),
  size: z.string().trim().max(60, "Keep the size under 60 characters."),
  area: z.string().refine(isAreaSlug, "Choose where renters pick it up."),
  pickupNotes: z.string().trim().max(300, "Keep pickup notes under 300 characters."),
});

export async function saveListing(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "") || null;
  const user = await requireUser(id ? `/listings/${id}/edit` : "/listings/new");
  const fieldErrors: Record<string, string> = {};

  const parsed = listingSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    size: String(formData.get("size") ?? ""),
    area: String(formData.get("area") ?? ""),
    pickupNotes: String(formData.get("pickupNotes") ?? ""),
  });
  if (!parsed.success) for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;

  const price = parsePounds(String(formData.get("price") ?? ""));
  if (price === null || price < 100) fieldErrors.price = "Set a daily price of at least £1.";
  else if (price > 50_000) fieldErrors.price = "The daily price can be up to £500.";
  const deposit = parsePounds(String(formData.get("deposit") ?? "0") || "0");
  if (deposit === null) fieldErrors.deposit = "Enter the deposit in pounds, e.g. 50.";
  else if (deposit > 200_000) fieldErrors.deposit = "Deposits can be up to £2,000.";

  const replacementRaw = String(formData.get("replacementValue") ?? "").trim();
  const replacementValue = replacementRaw ? parsePounds(replacementRaw) : null;
  if (replacementRaw && (replacementValue === null || replacementValue < 100 || replacementValue > 2_000_000)) {
    fieldErrors.replacementValue = "Enter a replacement value between £1 and £20,000, or leave it blank.";
  }
  const fullDepositOnly = formData.get("fullDepositOnly") === "on";
  const handoverMethods = [...new Set(formData.getAll("handoverMethods").map(String))].filter((m): m is "MEET" | "COURIER" | "LOCKER" => m === "MEET" || m === "COURIER" || m === "LOCKER");
  if (handoverMethods.length === 0) fieldErrors.handoverMethods = "Choose at least one way to hand it over.";

  const latRaw = String(formData.get("pickupLat") ?? "").trim();
  const lngRaw = String(formData.get("pickupLng") ?? "").trim();
  let pickupLat: number | null = null;
  let pickupLng: number | null = null;
  if (latRaw || lngRaw) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 51.25 || lat > 51.72 || lng < -0.6 || lng > 0.35) {
      fieldErrors.pickupPoint = "Put the pickup pin somewhere in London, or remove it.";
    } else {
      pickupLat = Math.round(lat * 1e5) / 1e5;
      pickupLng = Math.round(lng * 1e5) / 1e5;
    }
  }

  const today = todayInLondon();
  const from = String(formData.get("availableFrom") ?? "");
  const to = String(formData.get("availableTo") ?? "");
  if (!isISODate(from) || !isISODate(to)) fieldErrors.availability = "Choose when the item is available.";
  else if (to < from) fieldErrors.availability = "The end date must be after the start date.";
  else if (to < today) fieldErrors.availability = "The availability window has already ended.";
  else if (diffDays(from, to) > 400) fieldErrors.availability = "Set availability up to about a year ahead.";

  const blocked = jsonArray(formData.get("blockedDates")).filter((d): d is string => isISODate(d) && d >= from && d <= to);

  const existing = id
    ? await db.listing.findFirst({ where: { id, ownerId: user.id, status: { not: "ARCHIVED" } }, select: { id: true, photos: true, status: true } })
    : null;
  if (id && !existing) return { error: "You can only edit your own listings." };

  const photos = [...new Set(jsonArray(formData.get("photos")))];
  if (photos.length === 0) fieldErrors.photos = "Add at least one photo. Listings with photos get far more requests.";
  else if (photos.length > MAX_LISTING_PHOTOS || !photos.every(isAllowedPhotoUrl)) fieldErrors.photos = `Add up to ${MAX_LISTING_PHOTOS} photos using the uploader.`;
  else {
    // New photos must be your own uploads; photos already on the listing can stay.
    const added = (photos as string[]).filter((p) => !existing?.photos.includes(p));
    const uploadIds = added.filter((p) => p.startsWith("/api/images/")).map((p) => p.slice("/api/images/".length));
    const owned = uploadIds.length ? await db.imageBlob.count({ where: { id: { in: uploadIds }, ownerId: user.id } }) : 0;
    if (uploadIds.length !== added.length || owned !== uploadIds.length) {
      fieldErrors.photos = "Some photos couldn't be used. Remove them and upload them again.";
    }
  }

  if (Object.keys(fieldErrors).length || !parsed.success) {
    return { error: "Check the highlighted fields and try again.", fieldErrors };
  }

  const v = parsed.data;
  const data = {
    title: v.title,
    description: v.description,
    category: v.category as (typeof CATEGORIES)[number]["id"],
    condition: v.condition as (typeof CONDITIONS)[number]["id"],
    brand: v.brand || null,
    size: v.size || null,
    area: v.area,
    pickupNotes: v.pickupNotes || null,
    pricePerDay: price!,
    deposit: deposit!,
    replacementValue,
    // The title or brand may have changed, so the cached eBay price is looked up again on the next item page view.
    marketPrice: null,
    marketPriceCount: null,
    marketPriceUrl: null,
    marketPriceCheckedAt: null,
    fullDepositOnly,
    pickupLat,
    pickupLng,
    handoverMethods,
    photos: photos as string[],
    availableFrom: toDate(from),
    availableTo: toDate(to),
  };

  let listingId: string;
  if (existing) {
    listingId = existing.id;
    await db.$transaction([
      db.listing.update({ where: { id: listingId }, data }),
      db.blockedDate.deleteMany({ where: { listingId, date: { gte: toDate(today) } } }),
      db.blockedDate.createMany({ data: blocked.filter((d) => d >= today).map((d) => ({ listingId, date: toDate(d) })), skipDuplicates: true }),
    ]);
    await setFlash("Changes saved.");
  } else {
    const created = await db.listing.create({
      data: { ...data, ownerId: user.id, blockedDates: { create: blocked.map((d) => ({ date: toDate(d) })) } },
      select: { id: true },
    });
    listingId = created.id;
    await setFlash("Your listing is live. Renters can find it in search now.");
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/dashboard/listings");
  revalidatePath(`/items/${listingId}`);
  redirect(`/items/${listingId}`);
}

export async function setListingStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const user = await requireUser("/dashboard/listings");
  if (status !== "ACTIVE" && status !== "PAUSED") return;
  const updated = await db.listing.updateMany({ where: { id, ownerId: user.id, status: { not: "ARCHIVED" } }, data: { status } });
  if (updated.count) await setFlash(status === "PAUSED" ? "Listing paused. It's hidden from search until you resume it." : "Listing is live again.", "info");
  revalidatePath("/dashboard/listings");
  revalidatePath(`/items/${id}`);
  revalidatePath("/search");
  revalidatePath("/");
}

export async function archiveListing(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const user = await requireUser("/dashboard/listings");
  const listing = await db.listing.findFirst({ where: { id, ownerId: user.id }, select: { id: true } });
  if (!listing) return void (await setFlash("You can only remove your own listings.", "error"));
  const open = await db.booking.count({ where: { listingId: id, status: { in: ["ACCEPTED", "ACTIVE"] } } });
  if (open) return void (await setFlash("This item has confirmed bookings. Finish or cancel them before removing it.", "error"));
  const pending = await db.booking.findMany({ where: { listingId: id, status: "REQUESTED" }, select: { id: true } });
  await db.$transaction([
    db.listing.update({ where: { id }, data: { status: "ARCHIVED" } }),
    db.booking.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: "DECLINED", declineReason: "The owner removed this listing.", respondedAt: new Date() } }),
    db.bookingEvent.createMany({ data: pending.map((p) => ({ bookingId: p.id, type: "declined", note: "The owner removed this listing." })) }),
  ]);
  await setFlash("Listing removed.", "info");
  revalidatePath("/");
  revalidatePath("/search");
  redirect("/dashboard/listings");
}
