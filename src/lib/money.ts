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
