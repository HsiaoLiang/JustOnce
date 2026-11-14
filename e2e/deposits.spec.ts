import { expect, test, type Browser, type Page } from "@playwright/test";
import { day, expectToast, loginWithPassword, pickDay, PHOTO } from "./helpers";

// Damage claims against the deposit: the owner reports a problem at the return,
// claims part of the deposit, and the renter accepts or contests it.

async function rentAndReturnDamaged(browser: Browser, label: string) {
  const stamp = `${label}-${Date.now().toString(36)}`;
  const owner = await (await browser.newContext()).newPage();
  const renter = await (await browser.newContext()).newPage();

  await owner.goto("/signup?next=/listings/new");
  await owner.getByLabel("Your name").fill("Test Owner");
  await owner.getByLabel("Email").fill(`owner-${stamp}@example.com`);
  await owner.getByLabel("Password").fill("justonce123");
  await owner.getByRole("button", { name: "Create account" }).click();
  await owner.waitForURL("**/listings/new");
  await owner.locator('input[type="file"]').first().setInputFiles(PHOTO);
  await expect(owner.getByText("Cover", { exact: true })).toBeVisible();
  await owner.getByLabel(/^Title/).fill(`Claim test camera ${stamp}`);
  const form = owner.locator("main form").first();
  await form.getByText("Cameras", { exact: true }).click();
  await form.getByText("Good", { exact: true }).click();
  await owner.getByLabel(/^Description/).fill("Used by the end-to-end tests for deposit claims. Comes with a lens cap.");
  await owner.getByLabel("Price per day").fill("20");
  await owner.getByLabel("Refundable deposit").fill("200");
  await owner.getByLabel("Pickup area").selectOption("hackney");
  await owner.getByRole("button", { name: "Publish listing" }).click();
  await owner.waitForURL("**/items/**");
  const itemUrl = new URL(owner.url()).pathname;

  // Sophie has an unsettled claim in the seed data, so she pays the full deposit.
  await loginWithPassword(renter, "sophie@example.com", itemUrl);
  await pickDay(renter, day(3));
  await pickDay(renter, day(4));
  await renter.getByRole("complementary", { name: "Booking" }).getByRole("button", { name: "Request to book" }).click();
  await renter.waitForURL("**/bookings/**");
  const bookingUrl = new URL(renter.url()).pathname;

  await owner.goto(bookingUrl);
  await owner.getByRole("button", { name: "Accept request" }).click();
  await expect(owner.getByRole("heading", { name: "Pickup check" })).toBeVisible();
  await owner.getByRole("button", { name: /Use the listing photo/ }).click();
  await owner.getByRole("button", { name: "Confirm pickup" }).click();
  await renter.goto(bookingUrl);
  await renter.getByRole("button", { name: /Use the listing photo/ }).click();
  await renter.getByRole("button", { name: "Confirm pickup" }).click();
  await expect(renter.getByRole("heading", { name: "Return check" })).toBeVisible();

  await renter.getByRole("button", { name: /Use the listing photo/ }).click();
  await renter.getByRole("button", { name: "Confirm return" }).click();
  await expect(renter.getByText(/You've confirmed\. Waiting for Test/)).toBeVisible();

  // The owner reports a problem: the deposit stays held instead of being released.
  await owner.goto(bookingUrl);
  await owner.getByRole("button", { name: /Use the listing photo/ }).click();
  await owner.getByText("Something's changed").click();
  await owner.locator("#notes-RETURN").fill("Lens cap missing and a scratch on the top plate.");
  await owner.getByRole("button", { name: "Confirm return" }).click();
  await expect(owner.getByRole("heading", { name: "It's back. The deposit is on hold." })).toBeVisible();
  await expect(owner.getByText("£200 deposit held until the problem is sorted")).toBeVisible();

  // Claiming more than the deposit is refused by the server.
  await owner.getByLabel(/Amount to claim/).fill("250");
  await owner.getByRole("button", { name: "Claim from the deposit" }).click();
  await expect(owner.getByText("You can claim up to the £200 deposit.")).toBeVisible();

  await owner.getByLabel(/Amount to claim/).fill("50");
  await owner.getByLabel("Reason").selectOption("MISSING_PARTS");
  await owner.getByRole("button", { name: "Claim from the deposit" }).click();
  await expectToast(owner, "Claim sent");
  await expect(owner.getByText("£50 of £200 under review")).toBeVisible();

  await renter.goto(bookingUrl);
  await expect(renter.getByText("Test claimed £50 of the £200 deposit")).toBeVisible();
  const nextStep = renter.getByRole("region", { name: "Next step" });
  await expect(nextStep.getByText("At pickup", { exact: true })).toBeVisible();
  await expect(nextStep.getByText("At return", { exact: true })).toBeVisible();
  return { owner, renter, bookingUrl };
}

test("claim → accept keeps the claimed amount and returns the rest", async ({ browser }) => {
  const { owner, renter, bookingUrl } = await rentAndReturnDamaged(browser, "accept");
  await renter.getByRole("button", { name: "Accept: Test keeps £50" }).click();
  await expectToast(renter, "Claim accepted. £150 of your deposit is on its way back.");
  await expect(renter.getByText("£150 returned to you · £50 kept by Test")).toBeVisible();
  await expect(renter.getByText("£150 returned · £50 kept")).toBeVisible();

  await owner.goto(bookingUrl);
  await expect(owner.getByText("£50 kept by Test · £150 returned to Sophie")).toBeVisible(); // timeline
  await expect(owner.getByRole("button", { name: "Claim from the deposit" })).toHaveCount(0); // no second claim
});

test("claim → contest → resolve (demo) settles on the reviewed amount", async ({ browser }) => {
  const { owner, renter } = await rentAndReturnDamaged(browser, "contest");
  await renter.getByRole("button", { name: "Contest the claim" }).click();
  await renter.getByLabel("Why don't you agree?").fill("The scratch was already there at pickup, you can see it in the first photo.");
  await renter.getByRole("button", { name: "Contest the claim" }).click();
  await expectToast(renter, "Claim contested");
  await expect(renter.getByText(/Just Once is reviewing the photos from both sides/)).toBeVisible();

  await owner.reload();
  await expect(owner.getByText("Sophie contested it")).toBeVisible();
  await owner.getByRole("button", { name: "Uphold half" }).click();
  await expectToast(owner, "Claim resolved: £25 kept, the rest returned.");
  await expect(owner.getByText("£175 returned to Sophie · £25 kept by you")).toBeVisible();
});

test("trusted renters are quoted and charged half the deposit, others the full amount", async ({ browser }) => {
  // Leo is verified with three good reviews from owners.
  const leo = await (await browser.newContext()).newPage();
  await loginWithPassword(leo, "leo@example.com", "/items/osprey-60l-rucksack");
  const ticket = leo.getByRole("complementary", { name: "Booking" });
  await expect(ticket.getByText("Your deposit: £25")).toBeVisible();
  await expect(ticket.getByText("Half the usual £50 because you're verified with 3 good reviews.")).toBeVisible();
  await pickDay(leo, day(40));
  await pickDay(leo, day(41));
  await ticket.getByRole("button", { name: "Request to book" }).click();
  await leo.waitForURL("**/bookings/**");
  await expect(leo.getByText("Deposit (half, trusted renter)")).toBeVisible();

  // The owner of this bag always takes the full deposit.
  await leo.goto("/items/quilted-leather-crossbody-bag");
  await expect(leo.getByRole("complementary", { name: "Booking" }).getByText("£300 refundable deposit")).toBeVisible();

  // Sam isn't ID-verified yet.
  const sam = await (await browser.newContext()).newPage();
  await loginWithPassword(sam, "sam@example.com", "/items/osprey-60l-rucksack");
  const samTicket = sam.getByRole("complementary", { name: "Booking" });
  await expect(samTicket.getByText("£50 refundable deposit")).toBeVisible();
  await expect(samTicket.getByRole("link", { name: "Verify your ID to halve deposits" })).toBeVisible();
});
