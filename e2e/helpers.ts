import { expect, type Page } from "@playwright/test";
import { addDays, formatLongDay, todayInLondon } from "../src/lib/dates";

export const PHOTO = "public/seed/listings/canon-80d-1.jpg";
export const day = (offset: number) => addDays(todayInLondon(), offset);

export async function loginWithPassword(page: Page, email: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("justonce");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Click a day in the availability calendar, paging forward a month if needed. */
export async function pickDay(page: Page, iso: string) {
  // Wait for the calendar itself first: during navigation the loading skeleton shows instead.
  await page.getByRole("button", { name: "Next month" }).first().waitFor();
  const button = page.locator(`button[aria-label^="${formatLongDay(iso)}"]`).first();
  for (let i = 0; i < 3 && !(await button.isVisible()); i++) {
    await page.getByRole("button", { name: "Next month" }).first().click();
  }
  await button.click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}
