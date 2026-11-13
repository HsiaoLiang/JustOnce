import { expect, test, type Browser, type Page } from "@playwright/test";
import { day, expectToast, loginWithPassword, pickDay, PHOTO } from "./helpers";

// The whole core journey, with the owner and renter in separate browsers like a live demo.
test.describe.serial("core rental journey", () => {
  const stamp = Date.now().toString(36);
  const title = `E2E test camera ${stamp}`;
  let owner: Page;
  let renter: Page;
  let itemUrl = "";
  let bookingUrl = "";

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    owner = await (await browser.newContext()).newPage();
    renter = await (await browser.newContext()).newPage();
  });

  test("an owner signs up and lists an item with photos", async () => {
    await owner.goto("/signup?next=/listings/new");
    await owner.getByLabel("Your name").fill("Test Owner");
    await owner.getByLabel("Email").fill(`owner-${stamp}@example.com`);
    await owner.getByLabel("Password").fill("justonce123");
    await owner.getByRole("button", { name: "Create account" }).click();
    await owner.waitForURL("**/listings/new");

    await owner.locator('input[type="file"]').first().setInputFiles(PHOTO);
    await expect(owner.getByText("Cover", { exact: true })).toBeVisible();
    await owner.getByLabel(/^Title/).fill(title);
    const form = owner.locator("main form").first();
    await form.getByText("Cameras", { exact: true }).click();
    await form.getByText("Like new", { exact: true }).click();
    await owner.getByLabel(/^Description/).fill("A test camera listed by the end-to-end suite. Comes with a battery and a strap.");
    await owner.getByLabel("Price per day").fill("20");
    await owner.getByLabel("Refundable deposit").fill("150");
    await owner.getByLabel("Pickup area").selectOption("hackney");
    await owner.getByLabel(/^Pickup details/).fill("Meet at Hackney Central.");
    await owner.getByRole("button", { name: "Publish listing" }).click();

    await owner.waitForURL("**/items/**");
    await expect(owner.getByRole("heading", { level: 1 })).toHaveText(title);
    await expectToast(owner, "Your listing is live");
    itemUrl = new URL(owner.url()).pathname;
  });

  test("a renter finds it, picks dates and sends a request", async () => {
    await loginWithPassword(renter, "sophie@example.com", `/search?q=${encodeURIComponent(stamp)}`);
    await renter.getByRole("link", { name: new RegExp(title) }).first().click();
    await renter.waitForURL(`**${itemUrl}`);

    await pickDay(renter, day(2));
    await pickDay(renter, day(4));
    const ticket = renter.getByRole("complementary", { name: "Booking" });
    await expect(ticket.getByText("£20 × 3 days")).toBeVisible();
    await expect(ticket.getByText("£66.00")).toBeVisible(); // £60 + 10% service fee
    await ticket.getByRole("button", { name: "Request to book" }).click();

    await renter.waitForURL("**/bookings/**");
    await expect(renter.getByRole("heading", { name: /Waiting for Test to respond/ })).toBeVisible();
    bookingUrl = new URL(renter.url()).pathname;
  });

  test("the owner accepts, which takes the (simulated) payment", async () => {
    await owner.goto("/dashboard/listings");
    const card = owner.getByRole("listitem").filter({ hasText: title });
    await card.getByRole("button", { name: "Accept request" }).click();
    await expectToast(owner, /Booking confirmed\. Sophie paid £66 and the £150 deposit is held/);

    await owner.goto(bookingUrl);
    await expect(owner.getByRole("heading", { name: "Pickup check" })).toBeVisible();
    await expect(owner.getByText("Held safely until you both confirm the return.")).toBeVisible();
  });

  test("both sides confirm pickup with photos", async () => {
    await owner.locator('input[type="file"]').first().setInputFiles(PHOTO);
    await owner.getByRole("button", { name: "Confirm pickup" }).click();
    await expect(owner.getByText(/You've confirmed\. Waiting for Sophie/)).toBeVisible();

    await renter.goto(bookingUrl);
    await renter.getByRole("button", { name: /Use the listing photo/ }).click();
    await renter.getByRole("button", { name: "Confirm pickup" }).click();
    await expect(renter.getByRole("heading", { name: "Return check" })).toBeVisible();
  });

  test("both sides confirm the return, the deposit is released and they rate each other", async () => {
    await renter.getByRole("button", { name: /Use the listing photo/ }).click();
    await renter.getByRole("button", { name: "Confirm return" }).click();
    await expect(renter.getByText(/You've confirmed\. Waiting for Test/)).toBeVisible();

    await owner.goto(bookingUrl);
    await owner.locator('input[type="file"]').first().setInputFiles(PHOTO);
    await owner.getByRole("button", { name: "Confirm return" }).click();
    await expect(owner.getByRole("heading", { name: "All done. It's back home." })).toBeVisible();
    await expect(owner.getByText("£150 deposit released to Sophie", { exact: true })).toBeVisible();

    await owner.getByRole("radio", { name: "5 stars" }).click();
    await owner.getByPlaceholder(/careful, on time/).fill("Lovely renter, returned on time.");
    await owner.getByRole("button", { name: "Post review" }).click();
    await expect(owner.getByText("Thanks for your review.")).toBeVisible();

    await renter.goto(bookingUrl);
    await renter.getByRole("radio", { name: "4 stars" }).click();
    await renter.getByPlaceholder(/What was the item like/).fill("Worked perfectly, easy pickup.");
    await renter.getByRole("button", { name: "Post review" }).click();
    await expect(renter.getByText("You've both left reviews.")).toBeVisible();
  });

  test("booked dates can't be booked again, and overlapping requests are declined on accept", async ({ browser }) => {
    // The completed rental's days are now locked on the calendar.
    await renter.goto(itemUrl);
    await expect(renter.locator(`button[aria-label$=", booked"]`).first()).toBeVisible();

    // Two renters ask for overlapping dates; accepting one declines the other automatically.
    await renter.goto(itemUrl);
    await pickDay(renter, day(8));
    await pickDay(renter, day(9));
    await renter.getByRole("complementary", { name: "Booking" }).getByRole("button", { name: "Request to book" }).click();
    await renter.waitForURL("**/bookings/**");
    const sophieBooking = new URL(renter.url()).pathname;

    const leo = await (await browser.newContext()).newPage();
    await loginWithPassword(leo, "leo@example.com", itemUrl);
    await pickDay(leo, day(9));
    await pickDay(leo, day(10));
    await leo.getByRole("complementary", { name: "Booking" }).getByRole("button", { name: "Request to book" }).click();
    await leo.waitForURL("**/bookings/**");
    const leoBooking = new URL(leo.url()).pathname;

    await owner.goto(sophieBooking);
    await expect(owner.getByText("1 other request for overlapping dates will be declined automatically")).toBeVisible();
    await owner.getByRole("button", { name: "Accept request" }).click();
    await expectToast(owner, "1 overlapping request was declined automatically");

    await leo.goto(leoBooking);
    await expect(leo.getByRole("heading", { name: "Those dates were booked by someone else" })).toBeVisible();
    await leo.goto(itemUrl);
    await expect(leo.locator(`button[aria-label$=", booked"]`).first()).toBeVisible();
  });
});
