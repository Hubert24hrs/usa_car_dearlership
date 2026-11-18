import { expect, test } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ quiet: true });

async function findLead(email: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT type, first_name, vehicle_id, sms_consent FROM leads WHERE email = $1 ORDER BY created_at DESC LIMIT 1", [email]);
    return rows[0] as { type: string; first_name: string; vehicle_id: string | null; sms_consent: boolean } | undefined;
  } finally {
    await client.end();
  }
}

test.describe("lead submission", () => {
  test("check-availability form validates, submits and stores the lead", async ({ page }) => {
    await page.goto("/inventory");
    await page.locator("article h3 a").first().click();
    await expect(page).toHaveURL(/\/inventory\/[a-z0-9-]+-[a-hj-npr-z0-9]{17}$/);

    await page.getByRole("complementary", { name: "Price and actions" }).getByRole("button", { name: "Check availability" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const form = dialog.getByRole("form", { name: "Check availability" });

    // Client-side validation
    await form.getByRole("button", { name: "Check availability" }).click();
    await expect(form.getByText("First name is required")).toBeVisible();
    await expect(form.getByText("Enter a valid email address")).toBeVisible();

    const email = `e2e+${Date.now()}@example.com`;
    await form.getByLabel("First name").fill("Playwright");
    await form.getByLabel("Last name").fill("Tester");
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("Phone").fill("(512) 555-0199");
    await form.getByRole("checkbox").first().check();
    // Humans take a few seconds; the anti-bot timer ignores sub-2.5s submissions.
    await page.waitForTimeout(3000);
    await form.getByRole("button", { name: "Check availability" }).click();

    await expect(dialog.getByRole("status")).toContainText("You're all set");

    const lead = await findLead(email);
    expect(lead).toBeDefined();
    expect(lead!.type).toBe("CHECK_AVAILABILITY");
    expect(lead!.first_name).toBe("Playwright");
    expect(lead!.vehicle_id).not.toBeNull();
    expect(lead!.sms_consent).toBe(true);
  });

  test("honeypot submissions are silently dropped", async ({ page }) => {
    await page.goto("/contact");
    const form = page.getByRole("form", { name: "Contact us" });
    const email = `bot+${Date.now()}@example.com`;
    await form.getByLabel("First name").fill("Bot");
    await form.getByLabel("Last name").fill("Spam");
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("How can we help?").fill("Buy cheap followers now!!!");
    await page.locator('input[name="website"]').first().evaluate((el: HTMLInputElement) => {
      el.value = "http://spam.example";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForTimeout(3000);
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks for reaching out");
    expect(await findLead(email)).toBeUndefined();
  });
});
