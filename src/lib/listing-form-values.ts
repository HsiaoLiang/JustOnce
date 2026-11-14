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
  area: string;
  pickupNotes: string;
  pickupPoint: { lat: number; lng: number } | null;
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
    area: area ?? "",
    pickupNotes: "",
    pickupPoint: null,
    photos: [],
    availableFrom: today,
    availableTo: addDays(today, 90),
    blockedDates: [],
  };
}
