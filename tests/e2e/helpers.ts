import type { Page } from "@playwright/test";

/** Wait until the inventory filters have hydrated and respond to clicks. */
export async function inventoryReady(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.inventoryReady === "true");
}
