// Unit tests for the rent-versus-buy rules. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buyPriceFor, marketPriceIsStale, marketQuery, plausibleMarketPrice, savingVsBuying, typicalPrice } from "../market-price";

test("the marketplace search is the brand and title, tidied", () => {
  assert.equal(marketQuery({ title: "EOS R6 with 24-105mm lens", brand: "Canon" }), "Canon EOS R6 with 24-105mm lens");
  assert.equal(marketQuery({ title: "Canon EOS R6 (body only)", brand: "canon" }), "Canon EOS R6");
  assert.equal(marketQuery({ title: "4-person tent, barely used!", brand: null }), "4-person tent barely used");
  assert.ok(marketQuery({ title: "x".repeat(200) }).length <= 90);
});

test("the typical price ignores the cheapest and dearest quarter", () => {
  // A £5 lens cap and a £9,000 collector's listing don't move it.
  assert.deepEqual(typicalPrice([500, 110_000, 115_000, 118_000, 120_000, 125_000, 130_000, 900_000]), { price: 119_000, count: 8 });
  assert.deepEqual(typicalPrice([30_000, 10_000, 20_000]), { price: 20_000, count: 3 });
  assert.equal(typicalPrice([10_000, 20_000]), null);
  assert.equal(typicalPrice([NaN, 0, -5, 10_000, 20_000]), null);
});

test("a marketplace price far from the owner's estimate is a bad match", () => {
  assert.equal(plausibleMarketPrice(120_000, 115_000), true);
  assert.equal(plausibleMarketPrice(2_000, 115_000), false);
  assert.equal(plausibleMarketPrice(900_000, 115_000), false);
  assert.equal(plausibleMarketPrice(2_000, null), true);
  assert.equal(plausibleMarketPrice(0, null), false);
});

test("a found price is kept for a week, a miss for a few hours", () => {
  const now = new Date("2026-11-14T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  assert.equal(marketPriceIsStale(null, false, now), true);
  assert.equal(marketPriceIsStale(hoursAgo(24), true, now), false);
  assert.equal(marketPriceIsStale(hoursAgo(24 * 8), true, now), true);
  assert.equal(marketPriceIsStale(hoursAgo(2), false, now), false);
  assert.equal(marketPriceIsStale(hoursAgo(7), false, now), true);
});

test("the buy price is eBay's when there is one, else the owner's estimate", () => {
  assert.deepEqual(buyPriceFor({ marketPrice: 119_000, marketPriceCount: 8, marketPriceUrl: "https://www.ebay.co.uk/sch/i.html?_nkw=x", replacementValue: 115_000 }), {
    amount: 119_000,
    source: "ebay",
    count: 8,
    url: "https://www.ebay.co.uk/sch/i.html?_nkw=x",
  });
  assert.deepEqual(buyPriceFor({ marketPrice: null, replacementValue: 115_000 }), { amount: 115_000, source: "owner" });
  assert.equal(buyPriceFor({ marketPrice: null, replacementValue: null }), null);
});

test("the saving is in whole pounds and never shown as a loss", () => {
  assert.deepEqual(savingVsBuying(115_000, 8_800), { saving: 106_200, percent: 92 });
  assert.deepEqual(savingVsBuying(10_000, 6_650), { saving: 3_300, percent: 33 });
  assert.equal(savingVsBuying(5_000, 6_600), null);
  assert.equal(savingVsBuying(5_000, 4_950), null);
  assert.equal(savingVsBuying(0, 1_000), null);
});
