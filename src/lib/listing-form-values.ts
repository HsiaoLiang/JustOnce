// Shape of the listing form, shared by the server pages that prefill it and the client form.
import type { CategoryId, ConditionId } from "./catalogue";
import { addDays, type ISODate } from "./dates";

export interface ListingFormValues {
  id?: string;
  title: string;
  description: string;
  category: CategoryId | "";
  condition: ConditionId | "";
  brand: string;
  size: string;
  price: string;
  deposit: string;
  replacementValue: string;
  fullDepositOnly: boolean;
  /** Community the item is listed with ("" for none). */
  communityId: string;
  /** Only verified members of that community can see and book it. */
  communityOnly: boolean;
  area: string;
  pickupNotes: string;
  pickupPoint: { lat: number; lng: number } | null;
  handoverMethods: ("MEET" | "COURIER" | "LOCKER")[];
  photos: string[];
  availableFrom: ISODate;
  availableTo: ISODate;
  blockedDates: ISODate[];
}

export function emptyListingValues(today: ISODate, area: string | null): ListingFormValues {
  return {
    title: "",
    description: "",
    category: "",
    condition: "",
    brand: "",
    size: "",
    price: "",
    deposit: "",
    replacementValue: "",
    fullDepositOnly: false,
    communityId: "",
    communityOnly: false,
    area: area ?? "",
    pickupNotes: "",
    pickupPoint: null,
    handoverMethods: ["MEET"],
    photos: [],
    availableFrom: today,
    availableTo: addDays(today, 90),
    blockedDates: [],
  };
}
