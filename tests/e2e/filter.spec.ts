import { expect, test, type Page } from "@playwright/test";

async function resultCount(page: Page): Promise<number> {
  const text = await page.getByText(/of [\d,]+ vehicles|^0 vehicles$/).first().textContent();
  const match = text?.match(/of ([\d,]+) vehicles/);
  return match ? Number(match[1]!.replace(/,/g, "")) : 0;
}

test.describe("filters", () => {
  test("selecting a fuel type uses an SEO URL, updates counts and can be cleared", async ({ page }) => {
    await page.goto("/inventory");
    const total = await resultCount(page);
    expect(total).toBeGreaterThan(0);

    const filters = page.getByRole("complementary", { name: "Filters" });
    await filters.getByRole("checkbox", { name: /Electric/ }).first().click();
    await expect(page).toHaveURL(/\/inventory\/electric(\?|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Electric/);

    const electric = await resultCount(page);
    expect(electric).toBeGreaterThan(0);
    expect(electric).toBeLessThan(total);

    // Every card shows the EV badge.
    const cards = page.locator("article");
    const n = Math.min(await cards.count(), 6);
    for (let i = 0; i < n; i++) await expect(cards.nth(i).getByText("EV", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Remove filter Electric" }).click();
    await expect(page).toHaveURL(/\/inventory(\?|$)/);
    expect(await resultCount(page)).toBe(total);
  });

  test("combined SEO path /inventory/electric/suv renders the right heading", async ({ page }) => {
    await page.goto("/inventory/electric/suv");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Electric SUVs");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/inventory\/electric\/suv$/);
  });

  test("sorting by price low to high orders results", async ({ page }) => {
    await page.goto("/inventory?sort=price_asc");
    const prices = await page.locator("article").evaluateAll((cards) =>
      cards.slice(0, 6).map((card) => Number((card.querySelector("p.font-heading")?.textContent ?? "0").replace(/[^0-9]/g, ""))),
    );
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test("monthly budget chip applies a payment range", async ({ page }) => {
    await page.goto("/inventory");
    await page.getByRole("complementary", { name: "Filters" }).getByRole("button", { name: "$350 to $500" }).click();
    await expect(page).toHaveURL(/monthly_min=350&monthly_max=500/);
    await expect(page.getByRole("button", { name: /Remove filter \$350 to \$500\/mo/ })).toBeVisible();
  });
});
