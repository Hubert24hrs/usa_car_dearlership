/**
 * Set every vehicle's down payment to a percentage of its price and recompute
 * its monthly payment (true amortized payment at the configured APR and term).
 * Prices are unchanged; base (feed) values are back-solved so the pricing
 * multipliers reproduce the new display values exactly.
 *
 *   npm run inventory:down-payment                  # default from lib/pricing.config.ts (30%)
 *   npm run inventory:down-payment -- --percent=25  # any other percentage
 *
 * Public pages pick up the change within the inventory cache window (5 minutes).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ quiet: true });

import { prisma } from "../lib/db";
import { applyDownPaymentPercent } from "../lib/inventory/importer/pipeline";
import { PRICING_CONFIG } from "../lib/pricing.config";

const arg = process.argv.slice(2).find((a) => a.startsWith("--percent="))?.split("=")[1];
const percent = arg === undefined ? PRICING_CONFIG.finance.defaultDownPaymentPercent : Number(arg);

async function main() {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error(`--percent must be between 0 and 100 (got ${arg})`);
  }
  const count = await applyDownPaymentPercent(percent);
  await prisma.auditLog.create({
    data: { actor: "script:set-down-payment", action: "inventory.down_payment", entity: "Vehicle", data: { percent, count } },
  });
  console.log(`[down-payment] set ${percent}% down and recalculated monthly payments on ${count} vehicles`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
