import { expect, test } from "@playwright/test";

test.describe("search", () => {
  test("homepage quick search shows a live count and lands on matching inventory", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("search", { name: "Quick vehicle search" });
    await expect(search).toBeVisible();

    const submit = search.getByRole("button", { name: /search .* vehicles/i });
    await expect(submit).toContainText(/\d/);

    // Pick the first make that has inventory.
    const make = search.getByLabel("Make");
    const firstMake = await make.locator("option").nth(1).getAttribute("value");
    expect(firstMake).toBeTruthy();
    await make.selectOption(firstMake!);
    await expect(search.getByLabel("Model")).toBeEnabled();

    await submit.click();
    await expect(page).toHaveURL(new RegExp(`/inventory/${firstMake}`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("keyword search filters results and offers relevance sorting", async ({ page }) => {
    await page.goto("/inventory");
    const box = page.getByRole("searchbox", { name: "Search inventory" }).or(page.getByLabel("Search inventory")).first();
    await box.fill("hybrid");
    await box.press("Enter");
    await expect(page).toHaveURL(/q=hybrid/);
    await expect(page.getByLabel("Sort vehicles")).toHaveValue("relevance");
    const titles = page.locator("article h3");
    await expect(titles.first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Remove filter “hybrid”/ })).toBeVisible();
  });

  test("unknown SEO make returns 404", async ({ page }) => {
    const response = await page.goto("/inventory/not-a-real-make");
    expect(response?.status()).toBe(404);
  });
});

test.describe("smart search", () => {
  test("goes straight to an in-stock car and shows similar cars when one isn't in stock", async ({ page }) => {
    await page.goto("/inventory");
    const href = await page.locator("article h3 a").first().getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(`/search?q=${href!.slice(-17).toUpperCase()}`);
    await expect(page).toHaveURL(new RegExp(`${href}$`));

    await page.goto("/search?q=Lamborghini+Aventador");
    await expect(page.getByRole("heading", { name: /in stock right now/ })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("header search shows live in-stock matches", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Search cars" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Search cars").fill("toyota");
    await expect(dialog.getByText(/in stock/i).first()).toBeVisible();
    await expect(dialog.locator('a[href^="/inventory/"]').first()).toBeVisible();
  });
});
