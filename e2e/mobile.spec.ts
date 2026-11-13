import { expect, test } from "@playwright/test";

// Quick phone-sized smoke test: judges may open the demo on a phone.
test("home, search and an item page work on a phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Why buy it for");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Search" }).click();
  await page.waitForURL("**/search");
  await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Camping", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Camping");
  await page.locator('main a[href^="/items/"]').first().click();
  await expect(page.getByRole("link", { name: "Choose dates" })).toBeVisible();
});
