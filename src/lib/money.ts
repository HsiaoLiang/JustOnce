// All amounts are integer pence. Payments are simulated: nothing here talks to
// a payment provider, it only works out the numbers shown to people.

/** Renters pay a service fee on top of the rental; owners keep 100% of their price. */
export const SERVICE_FEE_RATE = 0.1;
export const MAX_RENTAL_DAYS = 30;

export function formatGBP(pence: number, options: { alwaysShowPence?: boolean } = {}): string {
  const whole = pence % 100 === 0;
  const digits = whole && !options.alwaysShowPence ? 0 : 2;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(pence / 100);
}

export interface Quote {
  days: number;
  pricePerDay: number;
  subtotal: number;
  serviceFee: number;
  /** What the renter is charged when the owner accepts. */
  total: number;
  /** Held separately and released after the return check. */
  deposit: number;
}

export function quote(pricePerDay: number, deposit: number, days: number): Quote {
  const subtotal = pricePerDay * days;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  return { days, pricePerDay, subtotal, serviceFee, total: subtotal + serviceFee, deposit };
}

/** Parses "12", "12.5" or "£12.50" into pence. Returns null for anything else. */
export function parsePounds(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function penceToPoundsInput(pence: number): string {
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

// ---------------------------------------------------------------- deposits

/** One sentence, used everywhere the deposit is explained. */
export const DEPOSIT_PROMISE = "Refundable deposit: held when the owner accepts, returned in full when the item comes back complete and undamaged.";

export const TRUSTED_RENTER = { minRentals: 3, minRating: 4.5 } as const;
/** How long an owner has to file a claim, and to confirm a return the renter has confirmed. */
export const CLAIM_WINDOW_HOURS = 48;

export interface DepositInput {
  verified: boolean;
  completedRentals: number;
  /** Average rating from owners, or null with no reviews. */
  avgRating: number | null;
  fullDepositOnly: boolean;
  /** Unsettled deposit claims against the renter put the reduction on hold. */
  openClaims?: number;
}

export type DepositReason = "trusted" | "full-only" | "unverified" | "building-history" | "open-claim";

export interface DepositDecision {
  amount: number;
  listed: number;
  reduced: boolean;
  reason: DepositReason;
}

/**
 * Trusted renters (ID-verified, 3+ completed rentals, 4.5+ average from owners,
 * nothing unsettled) pay half the listed deposit, unless the owner opted out.
 */
export function depositFor(listed: number, input: DepositInput): DepositDecision {
  const full = (reason: DepositReason): DepositDecision => ({ amount: listed, listed, reduced: false, reason });
  if (input.fullDepositOnly) return full("full-only");
  if (!input.verified) return full("unverified");
  if ((input.openClaims ?? 0) > 0) return full("open-claim");
  if (input.completedRentals < TRUSTED_RENTER.minRentals || (input.avgRating ?? 0) < TRUSTED_RENTER.minRating) return full("building-history");
  return { amount: Math.round(listed / 2), listed, reduced: true, reason: "trusted" };
}

/** 25% of the replacement value in whole pounds, never less than £20. */
export function suggestedDeposit(replacementValue: number): number {
  return Math.max(2000, Math.round((replacementValue * 0.25) / 100) * 100);
}

export const CLAIM_REASONS = [
  { id: "DAMAGED", label: "Damaged" },
  { id: "MISSING_PARTS", label: "Parts missing" },
  { id: "NOT_CLEANED", label: "Not cleaned" },
  { id: "RETURNED_LATE", label: "Returned late" },
] as const;

export type ClaimReasonId = (typeof CLAIM_REASONS)[number]["id"];

export function claimReasonLabel(id: string): string {
  return CLAIM_REASONS.find((r) => r.id === id)?.label ?? id;
}
