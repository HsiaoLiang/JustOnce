import { expect, test } from "@playwright/test";
import { day, expectToast, loginWithPassword, pickDay, PHOTO } from "./helpers";

test("a renter books with a courier; the fee is quoted, stored and recalculated by the server", async ({ browser }) => {
  const stamp = Date.now().toString(36);
  const owner = await (await browser.newContext()).newPage();
  await owner.goto("/signup?next=/listings/new");
  await owner.getByLabel("Your name").fill("Test Owner");
  await owner.getByLabel("Email").fill(`owner-courier-${stamp}@example.com`);
  await owner.getByLabel("Password").fill("justonce123");
  await owner.getByRole("button", { name: "Create account" }).click();
  await owner.waitForURL("**/listings/new");
  await owner.locator('input[type="file"]').first().setInputFiles(PHOTO);
  await expect(owner.getByText("Cover", { exact: true })).toBeVisible();
  await owner.getByLabel(/^Title/).fill(`Courier test camera ${stamp}`);
  const form = owner.locator("main form").first();
  await form.getByText("Cameras", { exact: true }).click();
  await form.getByText("Good", { exact: true }).click();
  await owner.getByLabel(/^Description/).fill("Used by the end-to-end tests for courier delivery.");
  await owner.getByLabel("Price per day").fill("20");
  await owner.getByLabel("Refundable deposit").fill("100");
  await owner.getByLabel("Pickup area").selectOption("hackney");
  await form.getByText("Courier", { exact: true }).click();
  await owner.getByRole("button", { name: "Publish listing" }).click();
  await owner.waitForURL("**/items/**");
  const itemUrl = new URL(owner.url()).pathname;

  const renter = await (await browser.newContext()).newPage();
  await loginWithPassword(renter, "sophie@example.com", itemUrl);
  await pickDay(renter, day(5));
  await pickDay(renter, day(6));
  const ticket = renter.getByRole("complementary", { name: "Booking" });
  await ticket.getByText("Courier", { exact: true }).click();
  await ticket.getByLabel("Delivery area").selectOption("islington"); // Hackney (east) → Islington (north): £9 each way
  await ticket.getByLabel("Address").fill("Flat 4, 27 Upper Street, N1");
  await expect(ticket.getByText("Delivery (courier, both ways)")).toBeVisible();
  await expect(ticket.getByText("£18.00")).toBeVisible();
  await expect(ticket.getByText("£62.00")).toBeVisible(); // £40 + £4 fee + £18 delivery
  await ticket.getByRole("button", { name: "Request to book" }).click();
  await renter.waitForURL("**/bookings/**");
  const bookingUrl = new URL(renter.url()).pathname;
  // What's shown now comes from the stored booking, not the browser's estimate.
  await expect(renter.getByText("Delivery (courier, both ways)")).toBeVisible();
  await expect(renter.getByText("£62.00")).toBeVisible();

  await owner.goto(bookingUrl);
  await expect(owner.getByText("Flat 4, 27 Upper Street")).toHaveCount(0); // address hidden until accepted
  await owner.getByRole("button", { name: "Accept request" }).click();
  await expectToast(owner, /Booking confirmed\. Sophie paid £62/);
  await expect(owner.getByText("Courier booked")).toBeVisible();
  await expect(owner.getByText(/Delivered to Flat 4, 27 Upper Street, N1, Islington/)).toBeVisible();

  // Owner sends it (photo), renter receives it (photo): no meeting needed.
  await owner.getByRole("button", { name: /Use the listing photo/ }).click();
  await owner.getByRole("button", { name: "Confirm pickup" }).click();
  await expect(owner.getByText("Out for delivery")).toBeVisible();
  await renter.goto(bookingUrl);
  await renter.getByRole("button", { name: /Use the listing photo/ }).click();
  await renter.getByRole("button", { name: "Confirm pickup" }).click();
  await expect(renter.getByRole("heading", { name: "Return check" })).toBeVisible();
  await expect(renter.getByText("Delivered", { exact: true })).toBeVisible();
});

test("the server rejects a handover method the listing doesn't offer", async ({ browser }) => {
  // The Canon 80D is meet-in-person only. Tamper with the form to ask for a courier.
  const renter = await (await browser.newContext()).newPage();
  await loginWithPassword(renter, "sophie@example.com", "/items/canon-eos-80d-18-135mm");
  await pickDay(renter, day(44));
  await pickDay(renter, day(45));
  await renter.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#booking-form input[name="handoverMethod"]')!;
    input.value = "COURIER";
  });
  await renter.getByRole("complementary", { name: "Booking" }).getByRole("button", { name: "Request to book" }).click();
  await expect(renter.getByText("This item can't be handed over by courier.")).toBeVisible();
  expect(new URL(renter.url()).pathname).toBe("/items/canon-eos-80d-18-135mm");
});
