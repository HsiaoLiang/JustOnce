import { expect, test } from "@playwright/test";
import { loginWithPassword } from "./helpers";

const MEMBERS_ONLY_TITLE = "Navy interview suit for recruiting season"; // Martin's LBS members-only item

test("members-only items stay hidden from people outside the community, profile pages included", async ({ page }) => {
  // Signed out: not on the owner's profile, and the item page shows the members-only gate instead.
  await page.goto("/users/martin-hsiao");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(MEMBERS_ONLY_TITLE)).toHaveCount(0);
  await page.goto("/items/lbs-interview-navy-suit");
  await expect(page.getByRole("heading", { name: "This item is for verified LBS members" })).toBeVisible();
  await expect(page.getByText(MEMBERS_ONLY_TITLE)).toHaveCount(0);

  // A verified LBS member sees it on the same profile.
  await loginWithPassword(page, "sophie@example.com", "/users/martin-hsiao");
  await expect(page.getByText(MEMBERS_ONLY_TITLE).first()).toBeVisible();
});

test("a work email is verified with a code: wrong codes are refused and new codes are rate-limited", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/signup?next=/communities/meta-uk/verify");
  await page.getByLabel("Your name").fill("Test Colleague");
  await page.getByLabel("Email").fill(`colleague-${stamp}@example.com`);
  await page.getByLabel("Password").fill("justonce123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/communities/meta-uk/verify");

  // A company community talks about work email, not school email.
  await expect(page.getByRole("tab", { name: "Work email" })).toBeVisible();
  await page.getByLabel("Your Meta email").fill(`colleague-${stamp}@meta.com`);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = (await page.locator("strong.font-mono").textContent())?.trim() ?? "";
  expect(code).toMatch(/^\d{6}$/);

  await page.getByLabel("Code").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("That code isn't right")).toBeVisible();

  // Asking again straight away is refused, and the demo code stays on screen.
  await page.getByRole("button", { name: "Send a new code" }).click();
  await expect(page.getByText(/You can ask for another in \d+ seconds/)).toBeVisible();
  await expect(page.locator("strong.font-mono")).toHaveText(code);

  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL("**/communities/meta-uk");
  await expect(page.getByText("You're a verified Meta member")).toBeVisible();
});
