import { expect, test } from "@playwright/test";

test.describe("mobile", () => {
  test("bottom-sheet filters and sticky CTA bar", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByRole("link", { name: "Shop inventory" })).toBeVisible();
    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Filter vehicles" })).toBeVisible();
    await sheet.getByRole("checkbox", { name: /Hybrid/ }).first().click();
    await expect(page).toHaveURL(/hybrid/);
    await sheet.getByRole("button", { name: /Show .* results/ }).click();
    await expect(sheet).toBeHidden();
  });
});
