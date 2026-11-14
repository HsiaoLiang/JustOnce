// Unit tests for the pure rules behind pricing, dates and double-booking.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, formatRange, isISODate, rangesOverlap, rentalDays } from "../dates";
import { depositFor, formatGBP, parsePounds, quote, suggestedDeposit } from "../money";
import { checkRange, dayState, type Availability } from "../booking-rules";
import { nextStep, type FlowBooking } from "../booking-flow";
import { isAllowedPhotoUrl } from "../photos";
import { parseSearch } from "../search-params";
import { median, modelDraftSchema, suggestPricing } from "../listing-draft";

const today = "2026-11-13";
const availability: Availability = {
  today,
  availableFrom: "2026-11-01",
  availableTo: "2027-01-31",
  blockedDates: ["2026-11-25"],
  bookedRanges: [{ start: "2026-11-20", end: "2026-11-22" }],
};

test("rental days are inclusive", () => {
  assert.equal(rentalDays("2026-11-20", "2026-11-22"), 3);
  assert.equal(rentalDays("2026-11-20", "2026-11-20"), 1);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("ISO dates are validated strictly", () => {
  assert.ok(isISODate("2026-02-28"));
  assert.ok(!isISODate("2026-02-30"));
  assert.ok(!isISODate("13/11/2026"));
});

test("ranges that share a day overlap", () => {
  assert.ok(rangesOverlap("2026-11-20", "2026-11-22", "2026-11-22", "2026-11-24"));
  assert.ok(!rangesOverlap("2026-11-20", "2026-11-22", "2026-11-23", "2026-11-24"));
});

test("dates are formatted the British way", () => {
  assert.equal(formatRange("2026-11-20", "2026-11-22"), "20–22 Nov");
  assert.equal(formatRange("2026-11-30", "2026-12-02"), "30 Nov – 2 Dec");
  assert.equal(formatGBP(6600), "£66");
  assert.equal(formatGBP(11550), "£115.50");
});

test("quotes add a 10% service fee and keep the deposit separate", () => {
  assert.deepEqual(quote(3500, 40000, 3), { days: 3, pricePerDay: 3500, subtotal: 10500, serviceFee: 1050, total: 11550, deposit: 40000 });
});

test("pounds are parsed into pence", () => {
  assert.equal(parsePounds("12"), 1200);
  assert.equal(parsePounds("£12.5"), 1250);
  assert.equal(parsePounds("12.345"), null);
  assert.equal(parsePounds("abc"), null);
});

test("booked, blocked and past days can't be picked", () => {
  const blocked = new Set(availability.blockedDates);
  assert.equal(dayState("2026-11-12", availability, blocked), "past");
  assert.equal(dayState("2026-11-21", availability, blocked), "booked");
  assert.equal(dayState("2026-11-25", availability, blocked), "blocked");
  assert.equal(dayState("2027-02-01", availability, blocked), "outside");
  assert.equal(dayState("2026-11-18", availability, blocked), "free");
});

test("a range that touches a booking is rejected", () => {
  assert.equal(checkRange("2026-11-17", "2026-11-19", availability), null);
  assert.match(checkRange("2026-11-19", "2026-11-20", availability) ?? "", /already booked/);
  assert.match(checkRange("2026-11-24", "2026-11-26", availability) ?? "", /isn't available/);
  assert.match(checkRange("2026-11-10", "2026-11-14", availability) ?? "", /from today/);
  assert.match(checkRange("2026-12-01", "2027-01-15", availability) ?? "", /up to 30 days/);
});

test("the next step depends on who's looking", () => {
  const base: FlowBooking = { status: "ACCEPTED", startDate: today, endDate: "2026-11-15", checks: [], reviews: [] };
  assert.deepEqual(nextStep({ ...base, status: "REQUESTED", startDate: "2026-11-20" }, "OWNER", "Sophie Clarke", today), { label: "Accept or decline this request", needsYou: true });
  assert.equal(nextStep(base, "RENTER", "Priya Shah", today).label, "Pickup check due today");
  const ownerDone = { ...base, checks: [{ stage: "PICKUP" as const, party: "OWNER" as const }] };
  assert.equal(nextStep(ownerDone, "OWNER", "Sophie Clarke", today).label, "Waiting for Sophie to confirm pickup");
  assert.equal(nextStep({ ...base, status: "COMPLETED", returnedAt: new Date() }, "RENTER", "Priya Shah", today).label, "Rate Priya");
});

test("photos must be our own uploads or bundled seed images", () => {
  assert.ok(isAllowedPhotoUrl("/api/images/cmwfiydra00057d7plrnck38s"));
  assert.ok(isAllowedPhotoUrl("/seed/listings/tuxedo-1.jpg"));
  assert.ok(!isAllowedPhotoUrl("https://evil.example.com/x.jpg"));
  assert.ok(!isAllowedPhotoUrl("/seed/../../etc/passwd"));
});

test("search params are cleaned up", () => {
  const parsed = parseSearch({ category: "cameras", area: "east", from: "2099-01-05", to: "2099-01-03", max: "999", sort: "nope" });
  assert.equal(parsed.category, "CAMERAS");
  assert.equal(parsed.area, "east");
  assert.equal(parsed.from, "2099-01-03");
  assert.equal(parsed.to, "2099-01-05");
  assert.equal(parsed.max, undefined);
  assert.equal(parsed.sort, "recommended");
});

test("AI draft: only catalogue categories and conditions are accepted", () => {
  const draft = modelDraftSchema.parse({ title: "  Sony A7 III body  ", category: "CAMERAS", condition: "MINT", brand: null, size: "", description: "A camera.", questions: [] });
  assert.equal(draft.title, "Sony A7 III body");
  assert.equal(draft.category, "CAMERAS");
  assert.equal(draft.condition, null);
  assert.equal(draft.brand, "");
  assert.equal(modelDraftSchema.parse({ category: "BOATS" }).category, null);
});

test("AI draft: questions for unknown fields are dropped, bad estimates ignored", () => {
  const draft = modelDraftSchema.parse({ questions: [{ field: "password", question: "?" }], secondHandValuePounds: -5, pricePerDayPounds: "lots" });
  assert.deepEqual(draft.questions, []);
  assert.equal(draft.secondHandValuePounds, null);
  assert.equal(draft.pricePerDayPounds, null);
});

test("AI draft: price and deposit come from comparable listings when there are enough", () => {
  assert.equal(median([3000, 4500, 3800]), 3800);
  assert.equal(median([1000, 2000]), 1500);
  assert.equal(median([]), null);
  const comparables = [
    { pricePerDay: 3000, deposit: 40000 },
    { pricePerDay: 3800, deposit: 45000 },
    { pricePerDay: 4500, deposit: 50000 },
  ];
  const s = suggestPricing(comparables, "cameras listings", { secondHandValuePounds: 5, pricePerDayPounds: 999 });
  assert.equal(s.fromComparables, true);
  assert.equal(s.price.amount, 3800);
  assert.equal(s.deposit.amount, 45000);
  assert.match(s.price.reason, /3 similar cameras listings on Just Once rent for £30 to £45/);
});

test("AI draft: with few comparables it says so and falls back to the estimate", () => {
  const s = suggestPricing([{ pricePerDay: 3000, deposit: 40000 }], "cameras listings", { secondHandValuePounds: 900, pricePerDayPounds: 38 });
  assert.equal(s.fromComparables, false);
  assert.equal(s.price.amount, 3800);
  assert.equal(s.deposit.amount, 45000);
  assert.match(s.price.reason, /Few similar items/);
  const none = suggestPricing([], "listings", { secondHandValuePounds: null, pricePerDayPounds: null });
  assert.equal(none.price.amount, null);
  assert.equal(none.deposit.amount, null);
});

test("trusted renters pay half the deposit, everyone else pays it in full", () => {
  const trusted = { verified: true, completedRentals: 5, avgRating: 4.8, fullDepositOnly: false };
  assert.deepEqual(depositFor(50000, trusted), { amount: 25000, listed: 50000, reduced: true, reason: "trusted" });
  assert.equal(depositFor(50000, { ...trusted, verified: false }).reason, "unverified");
  assert.equal(depositFor(50000, { ...trusted, completedRentals: 2 }).reason, "building-history");
  assert.equal(depositFor(50000, { ...trusted, avgRating: 4.4 }).reason, "building-history");
  assert.equal(depositFor(50000, { ...trusted, avgRating: null }).amount, 50000);
  assert.equal(depositFor(50000, { ...trusted, openClaims: 1 }).reason, "open-claim");
  assert.deepEqual(depositFor(50000, { ...trusted, fullDepositOnly: true }), { amount: 50000, listed: 50000, reduced: false, reason: "full-only" });
});

test("suggested deposits are 25% of replacement value, at least £20", () => {
  assert.equal(suggestedDeposit(160000), 40000);
  assert.equal(suggestedDeposit(4000), 2000);
  assert.equal(suggestedDeposit(12345), 3100);
});

test("deposit claims come before reviews in the next step", () => {
  const done: FlowBooking = {
    status: "COMPLETED",
    startDate: "2026-11-01",
    endDate: "2026-11-03",
    returnedAt: new Date(),
    checks: [
      { stage: "RETURN", party: "RENTER", conditionOk: true },
      { stage: "RETURN", party: "OWNER", conditionOk: false },
    ],
    reviews: [],
    depositStatus: "HELD",
  };
  assert.deepEqual(nextStep(done, "OWNER", "Sophie Clarke", today), { label: "Claim from the deposit or release it", needsYou: true });
  assert.equal(nextStep(done, "RENTER", "Priya Shah", today).label, "Waiting for Priya to decide on the deposit");
  const open = { ...done, depositStatus: "IN_REVIEW" as const, claim: { status: "OPEN" as const } };
  assert.deepEqual(nextStep(open, "RENTER", "Priya Shah", today), { label: "Respond to Priya's deposit claim", needsYou: true });
  assert.equal(nextStep(open, "OWNER", "Sophie Clarke", today).label, "Waiting for Sophie to respond to your claim");
  assert.equal(nextStep({ ...open, claim: { status: "CONTESTED" } }, "OWNER", "Sophie Clarke", today).label, "Claim under review");
  const settled = { ...open, depositStatus: "PART_RELEASED" as const, claim: { status: "ACCEPTED" as const } };
  assert.equal(nextStep(settled, "RENTER", "Priya Shah", today).label, "Rate Priya");
  // A clean return goes straight to reviews, as before.
  const clean = { ...done, checks: [{ stage: "RETURN" as const, party: "OWNER" as const, conditionOk: true }], depositStatus: "RELEASED" as const };
  assert.equal(nextStep(clean, "OWNER", "Sophie Clarke", today).label, "Rate Sophie");
});
