/**
 * Runtime settings stored in the `settings` table, with code defaults.
 * Framework-agnostic (usable from scripts); see settings-cache.ts for the
 * cached versions used by pages.
 */
import { prisma } from "@/lib/db";
import { resolveFinanceAssumptions, resolveMultipliers } from "@/lib/pricing";
import type { FinanceAssumptions, PricingMultipliers } from "@/lib/pricing.config";
import { DEFAULT_DEALER_PROFILE, type DealerProfile } from "@/lib/site.config";
import type { Prisma } from "@/lib/generated/prisma/client";

export const SETTING_KEYS = {
  pricingMultipliers: "pricing.multipliers",
  financeAssumptions: "pricing.finance",
  dealerProfile: "dealer.profile",
} as const;

export async function readSetting(key: string): Promise<unknown> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function writeSetting(key: string, value: Prisma.InputJsonValue, updatedBy?: string) {
  return prisma.setting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
}

export async function getPricingMultipliers(): Promise<PricingMultipliers> {
  return resolveMultipliers(await readSetting(SETTING_KEYS.pricingMultipliers));
}

export async function getFinanceAssumptions(): Promise<FinanceAssumptions> {
  return resolveFinanceAssumptions(await readSetting(SETTING_KEYS.financeAssumptions));
}

export function resolveDealerProfile(value: unknown): DealerProfile {
  const profile: DealerProfile = { ...DEFAULT_DEALER_PROFILE };
  if (value && typeof value === "object") {
    for (const key of Object.keys(profile) as (keyof DealerProfile)[]) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === typeof profile[key] && v !== "") {
        (profile as Record<string, unknown>)[key] = v;
      }
    }
  }
  return profile;
}

export async function getDealerProfile(): Promise<DealerProfile> {
  return resolveDealerProfile(await readSetting(SETTING_KEYS.dealerProfile));
}

/** Demo inventory is visible in development, or anywhere SHOW_DEMO_INVENTORY=true. */
export function shouldShowDemoInventory(): boolean {
  const flag = process.env.SHOW_DEMO_INVENTORY;
  if (flag !== undefined && flag !== "") return flag === "true";
  return process.env.NODE_ENV !== "production";
}
