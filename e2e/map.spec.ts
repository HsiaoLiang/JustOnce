import { expect, test } from "@playwright/test";
import { loginWithPassword } from "./helpers";

// Map tiles come from OpenStreetMap; pins and circles render without them, so these tests don't need tiles.

test("map view shows a pin for every result, and the list agrees", async ({ page }) => {
  await page.goto("/search?category=cameras&view=map");
  const results = page.getByRole("list", { name: "Results" }).getByRole("listitem");
  await expect(results.first()).toBeVisible();
  const count = await results.count();
  await expect(page.locator(".jo-pin")).toHaveCount(count);
  await page.locator(".leaflet-marker-icon").first().click();
  await expect(page.locator(".jo-popup")).toBeVisible();
});

test.describe("near me", () => {
  test.use({ geolocation: { latitude: 51.5465, longitude: -0.0555 }, permissions: ["geolocation"] }); // Hackney

  test("sorts by distance when location is allowed", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: "Near me" }).click();
    await expect(page.getByRole("button", { name: "Sorted by distance" })).toBeVisible();
    const first = page.getByRole("list", { name: "Results" }).getByRole("listitem").first();
    await expect(first).toContainText("Hackney");
    await expect(first).toContainText("miles away");
  });
});

test("near me falls back to the normal order when location is refused", async ({ browser }) => {
  const context = await browser.newContext({ permissions: [] });
  const page = await context.newPage();
  await page.goto("/search");
  const before = await page.getByRole("list", { name: "Results" }).getByRole("listitem").first().textContent();
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByText("Location not shared, so results are in the usual order.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Results" }).getByRole("listitem").first()).toHaveText(before!);
});

test("exact pickup point and notes stay private until a booking is accepted", async ({ browser }) => {
  const notes = "Amhurst Road exit"; // Priya's private pickup notes
  const exact = "51.5471"; // Priya's exact pickup latitude

  // Public item page: neither the notes nor the exact point are anywhere in the response.
  const anon = await (await browser.newContext()).newPage();
  const itemHtml = await (await anon.request.get("/items/polaroid-onestep-2")).text();
  expect(itemHtml).not.toContain(notes);
  expect(itemHtml).not.toContain(exact);

  // Leo's request for the Sony hasn't been accepted yet.
  const leo = await (await browser.newContext()).newPage();
  await loginWithPassword(leo, "leo@example.com", "/dashboard/rentals");
  await leo.getByRole("link", { name: "Sony A7 III with 28–70mm lens" }).first().click();
  await leo.waitForURL("**/bookings/**");
  const requestedHtml = await (await leo.request.get(leo.url())).text();
  expect(requestedHtml).not.toContain(notes);
  expect(requestedHtml).not.toContain(exact);

  // Daniel's Polaroid booking is accepted: now he sees both, with directions.
  const daniel = await (await browser.newContext()).newPage();
  await loginWithPassword(daniel, "daniel@example.com", "/dashboard/rentals");
  await daniel.getByRole("link", { name: "Polaroid OneStep 2 instant camera" }).first().click();
  await daniel.waitForURL("**/bookings/**");
  await expect(daniel.getByText(notes, { exact: false })).toBeVisible();
  await expect(daniel.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /51\.5471/);
});
