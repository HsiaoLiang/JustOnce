import { expect, test } from "@playwright/test";

test("fashion categories are on the home page and lead to their listings", async ({ page }) => {
  await page.goto("/");
  const browse = page.locator('section[aria-labelledby="categories"]');
  await expect(browse.getByRole("heading", { name: "Fashion" })).toBeVisible();
  await expect(browse.getByRole("heading", { name: "Kit and occasions" })).toBeVisible();
  for (const label of ["Clothing", "Shoes", "Bags", "Jewellery", "Watches", "Accessories", "Costumes"]) {
    await expect(browse.locator(`a[href="/search?category=${label.toLowerCase()}"]`)).toContainText(label);
  }

  await browse.locator('a[href="/search?category=jewellery"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jewellery in London");
  await expect(page.getByRole("link", { name: /Freshwater pearl necklace/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Gold bridal necklace and earring set/ })).toBeVisible();
});

test("keyword search finds items by their fashion category", async ({ page }) => {
  // None of these titles says "handbag", so they're found through the Bags category.
  await page.goto("/search?q=handbag");
  const results = page.locator('main a[href^="/items/"]');
  await expect(results.filter({ hasText: "Valentino Rockstud shoulder bag" })).toHaveCount(1);
  await expect(results.filter({ hasText: "Gucci GG Marmont quilted crossbody bag" })).toHaveCount(1);
  await expect(results.filter({ hasText: "tent" })).toHaveCount(0);

  await page.goto("/search?category=costumes");
  await expect(page.getByRole("link", { name: /Creepy clown mask and costume/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /1950s greaser costume/ })).toBeVisible();
});
