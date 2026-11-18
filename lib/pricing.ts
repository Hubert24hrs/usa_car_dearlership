/**
 * Pricing engine: applies the business multipliers from lib/pricing.config.ts
 * to base_* feed values and produces rounded display_* values.
 *
 * Pure functions only (no database access) so they are trivially unit-tested
 * and can be reused by the importer, the admin re-price job and the seed.
 */
import { amortizedMonthlyPayment, roundCents } from "./finance";
import {
  DEFAULT_FINANCE_ASSUMPTIONS,
  DEFAULT_MULTIPLIERS,
  PRICING_CONFIG,
  type FinanceAssumptions,
  type PricingMultipliers,
} from "./pricing.config";

export type BasePricing = {
  basePrice: number;
  baseDownPayment: number;
  baseMonthlyPayment: number;
};

export type DisplayPricing = {
  displayPrice: number;
  displayDownPayment: number;
  displayMonthlyPayment: number;
};

/**
 * Round half-up to the nearest `step` (e.g. 100 → nearest $100).
 * Binary floating-point noise (30549.999999998) is removed first so values
 * that are mathematically exact halves round consistently.
 */
export function roundToNearest(value: number, step: number): number {
  if (!Number.isFinite(value)) throw new RangeError("value must be a finite number");
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("step must be a positive number");
  const cleaned = Number(value.toFixed(6));
  const rounded = Math.round(cleaned / step) * step;
  // Avoid "-0" and float artifacts such as 30600.000000000004
  return Number(rounded.toFixed(2)) + 0;
}

/** Returns a list of human-readable problems; empty array means valid. */
export function validateMultipliers(multipliers: PricingMultipliers): string[] {
  const { min, max } = PRICING_CONFIG.multiplierBounds;
  const problems: string[] = [];
  const labels: Record<keyof PricingMultipliers, string> = {
    vehiclePrice: "Vehicle price multiplier",
    downPayment: "Down payment multiplier",
    monthlyPayment: "Monthly payment multiplier",
  };
  for (const key of Object.keys(labels) as (keyof PricingMultipliers)[]) {
    const value = multipliers[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      problems.push(`${labels[key]} must be a number`);
    } else if (value < min || value > max) {
      problems.push(`${labels[key]} must be between ${min} and ${max}`);
    }
  }
  return problems;
}

/**
 * Apply multipliers + rounding rules:
 *   display_price           = round(base_price × vehiclePrice, $100)
 *   display_down_payment    = round(base_down_payment × downPayment, $50)
 *   display_monthly_payment = round(base_monthly_payment × monthlyPayment, $1)
 */
export function applyPricingMultipliers(
  base: BasePricing,
  multipliers: PricingMultipliers = DEFAULT_MULTIPLIERS,
): DisplayPricing {
  const problems = validateMultipliers(multipliers);
  if (problems.length > 0) throw new RangeError(problems.join("; "));
  for (const [key, value] of Object.entries(base)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${key} must be a non-negative number`);
    }
  }
  const { rounding } = PRICING_CONFIG;
  return {
    displayPrice: roundToNearest(base.basePrice * multipliers.vehiclePrice, rounding.price),
    displayDownPayment: roundToNearest(base.baseDownPayment * multipliers.downPayment, rounding.downPayment),
    displayMonthlyPayment: roundToNearest(
      base.baseMonthlyPayment * multipliers.monthlyPayment,
      rounding.monthlyPayment,
    ),
  };
}

/**
 * Fill in base_down_payment / base_monthly_payment when a feed record only
 * supplies a price. Uses the finance assumptions from the pricing config.
 */
export function deriveBasePricing(
  input: { basePrice: number; baseDownPayment?: number | null; baseMonthlyPayment?: number | null },
  assumptions: FinanceAssumptions = DEFAULT_FINANCE_ASSUMPTIONS,
): BasePricing {
  const basePrice = roundCents(input.basePrice);
  const baseDownPayment =
    input.baseDownPayment ?? roundCents((basePrice * PRICING_CONFIG.finance.defaultDownPaymentPercent) / 100);
  const baseMonthlyPayment =
    input.baseMonthlyPayment ??
    roundCents(amortizedMonthlyPayment(basePrice - baseDownPayment, assumptions.aprPercent, assumptions.termMonths));
  return { basePrice, baseDownPayment: roundCents(baseDownPayment), baseMonthlyPayment: roundCents(baseMonthlyPayment) };
}

/**
 * Down payment and monthly payment for a vehicle at `downPercent`% down of its
 * displayed price. The monthly payment is the true amortized payment on the
 * remaining balance at the disclosed APR and term, so the advertised payment
 * matches the advertised price, down payment, APR and term. Base (feed) values
 * are back-solved so applyPricingMultipliers reproduces these display values.
 */
export function pricingForDownPercent(
  displayPrice: number,
  downPercent: number = PRICING_CONFIG.finance.defaultDownPaymentPercent,
  multipliers: PricingMultipliers = DEFAULT_MULTIPLIERS,
  assumptions: FinanceAssumptions = DEFAULT_FINANCE_ASSUMPTIONS,
): Pick<BasePricing, "baseDownPayment" | "baseMonthlyPayment"> & Pick<DisplayPricing, "displayDownPayment" | "displayMonthlyPayment"> {
  if (!Number.isFinite(displayPrice) || displayPrice < 0) throw new RangeError("displayPrice must be a non-negative number");
  if (!Number.isFinite(downPercent) || downPercent < 0 || downPercent > 100) throw new RangeError("downPercent must be between 0 and 100");
  const { rounding } = PRICING_CONFIG;
  const displayDownPayment = Math.min(displayPrice, roundToNearest((displayPrice * downPercent) / 100, rounding.downPayment));
  const displayMonthlyPayment = roundToNearest(
    amortizedMonthlyPayment(displayPrice - displayDownPayment, assumptions.aprPercent, assumptions.termMonths),
    rounding.monthlyPayment,
  );
  return {
    displayDownPayment,
    displayMonthlyPayment,
    baseDownPayment: roundCents(displayDownPayment / multipliers.downPayment),
    baseMonthlyPayment: roundCents(displayMonthlyPayment / multipliers.monthlyPayment),
  };
}

/** Convenience: derive missing base values, then apply multipliers. */
export function computePricing(
  input: { basePrice: number; baseDownPayment?: number | null; baseMonthlyPayment?: number | null },
  multipliers: PricingMultipliers = DEFAULT_MULTIPLIERS,
  assumptions: FinanceAssumptions = DEFAULT_FINANCE_ASSUMPTIONS,
): BasePricing & DisplayPricing {
  const base = deriveBasePricing(input, assumptions);
  return { ...base, ...applyPricingMultipliers(base, multipliers) };
}

/** Merge a (possibly partial / untrusted) override with the defaults. */
export function resolveMultipliers(override: unknown): PricingMultipliers {
  const merged: PricingMultipliers = { ...DEFAULT_MULTIPLIERS };
  if (override && typeof override === "object") {
    for (const key of Object.keys(merged) as (keyof PricingMultipliers)[]) {
      const value = (override as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) merged[key] = value;
    }
  }
  return validateMultipliers(merged).length === 0 ? merged : { ...DEFAULT_MULTIPLIERS };
}

/** Merge a (possibly partial / untrusted) finance override with defaults. */
export function resolveFinanceAssumptions(override: unknown): FinanceAssumptions {
  const merged: FinanceAssumptions = { ...DEFAULT_FINANCE_ASSUMPTIONS };
  if (override && typeof override === "object") {
    const o = override as Record<string, unknown>;
    if (typeof o.termMonths === "number" && o.termMonths >= 12 && o.termMonths <= 96) merged.termMonths = o.termMonths;
    if (typeof o.aprPercent === "number" && o.aprPercent >= 0 && o.aprPercent < 40) merged.aprPercent = o.aprPercent;
  }
  return merged;
}
