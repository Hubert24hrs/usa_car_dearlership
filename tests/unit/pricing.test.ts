import { describe, expect, it } from "vitest";
import {
  applyPricingMultipliers,
  computePricing,
  deriveBasePricing,
  pricingForDownPercent,
  resolveMultipliers,
  roundToNearest,
  validateMultipliers,
} from "@/lib/pricing";
import { DEFAULT_MULTIPLIERS, PRICING_CONFIG } from "@/lib/pricing.config";
import { amortizedMonthlyPayment } from "@/lib/finance";

describe("pricing.config", () => {
  it("defines the client's business multipliers: +20% price, +20% down, +10% monthly", () => {
    expect(PRICING_CONFIG.multipliers).toEqual({ vehiclePrice: 1.2, downPayment: 1.2, monthlyPayment: 1.1 });
    expect(DEFAULT_MULTIPLIERS).toBe(PRICING_CONFIG.multipliers);
  });

  it("defines the rounding rules: price $100, down payment $50, monthly $1", () => {
    expect(PRICING_CONFIG.rounding).toEqual({ price: 100, downPayment: 50, monthlyPayment: 1 });
  });
});

describe("roundToNearest", () => {
  it.each([
    [30_049, 100, 30_000],
    [30_050, 100, 30_100],
    [30_549.996, 100, 30_500],
    [3_024, 50, 3_000],
    [3_025, 50, 3_050],
    [3_036, 50, 3_050],
    [439.49, 1, 439],
    [439.5, 1, 440],
    [0, 100, 0],
  ])("roundToNearest(%d, %d) = %d", (value, step, expected) => {
    expect(roundToNearest(value, step)).toBe(expected);
  });

  it("removes floating point noise before rounding half-up", () => {
    // 455 × 1.1 = 500.50000000000006 in IEEE-754 — must still round to 501, not jitter.
    expect(roundToNearest(455 * 1.1, 1)).toBe(501);
    // 25_458.33 × 1.2 = 30_549.996 → $30,500
    expect(roundToNearest(25_458.33 * 1.2, 100)).toBe(30_500);
  });

  it("rejects invalid input", () => {
    expect(() => roundToNearest(Number.NaN, 100)).toThrow(RangeError);
    expect(() => roundToNearest(100, 0)).toThrow(RangeError);
  });
});

describe("applyPricingMultipliers — proves +20% / +20% / +10%", () => {
  it("applies +20% to price, +20% to down payment and +10% to monthly payment", () => {
    const display = applyPricingMultipliers({ basePrice: 25_000, baseDownPayment: 2_500, baseMonthlyPayment: 400 });
    expect(display).toEqual({ displayPrice: 30_000, displayDownPayment: 3_000, displayMonthlyPayment: 440 });
  });

  it("rounds price to the nearest $100", () => {
    // 27_541 × 1.2 = 33_049.2 → 33,000 ; 27_542 × 1.2 = 33_050.4 → 33,100
    expect(applyPricingMultipliers({ basePrice: 27_541, baseDownPayment: 0, baseMonthlyPayment: 0 }).displayPrice).toBe(33_000);
    expect(applyPricingMultipliers({ basePrice: 27_542, baseDownPayment: 0, baseMonthlyPayment: 0 }).displayPrice).toBe(33_100);
  });

  it("rounds down payment to the nearest $50", () => {
    // 2_520 × 1.2 = 3_024 → 3,000 ; 2_530 × 1.2 = 3_036 → 3,050
    expect(applyPricingMultipliers({ basePrice: 1, baseDownPayment: 2_520, baseMonthlyPayment: 0 }).displayDownPayment).toBe(3_000);
    expect(applyPricingMultipliers({ basePrice: 1, baseDownPayment: 2_530, baseMonthlyPayment: 0 }).displayDownPayment).toBe(3_050);
  });

  it("rounds monthly payment to the nearest $1", () => {
    // 399.60 × 1.1 = 439.56 → 440 ; 399.50 × 1.1 = 439.45 → 439
    expect(applyPricingMultipliers({ basePrice: 1, baseDownPayment: 0, baseMonthlyPayment: 399.6 }).displayMonthlyPayment).toBe(440);
    expect(applyPricingMultipliers({ basePrice: 1, baseDownPayment: 0, baseMonthlyPayment: 399.5 }).displayMonthlyPayment).toBe(439);
  });

  it("matches the formula for a spread of realistic feed values", () => {
    const samples = [
      { basePrice: 18_995, baseDownPayment: 1_899.5, baseMonthlyPayment: 289.12 },
      { basePrice: 42_310.55, baseDownPayment: 4_231.06, baseMonthlyPayment: 655.4 },
      { basePrice: 97_450, baseDownPayment: 15_000, baseMonthlyPayment: 1_288.99 },
    ];
    for (const base of samples) {
      const display = applyPricingMultipliers(base);
      expect(display.displayPrice).toBe(Math.round((base.basePrice * 1.2) / 100) * 100);
      expect(display.displayDownPayment).toBe(Math.round((base.baseDownPayment * 1.2) / 50) * 50);
      expect(display.displayMonthlyPayment).toBe(Math.round(base.baseMonthlyPayment * 1.1));
      expect(display.displayPrice % 100).toBe(0);
      expect(display.displayDownPayment % 50).toBe(0);
      expect(Number.isInteger(display.displayMonthlyPayment)).toBe(true);
    }
  });

  it("honors admin-supplied multipliers (runtime override)", () => {
    const display = applyPricingMultipliers(
      { basePrice: 20_000, baseDownPayment: 2_000, baseMonthlyPayment: 300 },
      { vehiclePrice: 1.15, downPayment: 1.0, monthlyPayment: 1.05 },
    );
    expect(display).toEqual({ displayPrice: 23_000, displayDownPayment: 2_000, displayMonthlyPayment: 315 });
  });

  it("rejects out-of-bounds multipliers and negative base values", () => {
    expect(() =>
      applyPricingMultipliers({ basePrice: 1, baseDownPayment: 1, baseMonthlyPayment: 1 }, { vehiclePrice: 12, downPayment: 1.2, monthlyPayment: 1.1 }),
    ).toThrow(RangeError);
    expect(() => applyPricingMultipliers({ basePrice: -1, baseDownPayment: 0, baseMonthlyPayment: 0 })).toThrow(RangeError);
  });
});

describe("validateMultipliers / resolveMultipliers", () => {
  it("validates bounds", () => {
    expect(validateMultipliers(DEFAULT_MULTIPLIERS)).toEqual([]);
    expect(validateMultipliers({ vehiclePrice: 0.1, downPayment: 1.2, monthlyPayment: 1.1 })).toHaveLength(1);
  });

  it("falls back to config defaults for missing or invalid overrides", () => {
    expect(resolveMultipliers(null)).toEqual(DEFAULT_MULTIPLIERS);
    expect(resolveMultipliers({ vehiclePrice: 1.3 })).toEqual({ ...DEFAULT_MULTIPLIERS, vehiclePrice: 1.3 });
    expect(resolveMultipliers({ vehiclePrice: 99 })).toEqual(DEFAULT_MULTIPLIERS);
    expect(resolveMultipliers({ vehiclePrice: "1.5" })).toEqual(DEFAULT_MULTIPLIERS);
  });
});

describe("deriveBasePricing / computePricing", () => {
  it("derives a 30% down payment and amortized monthly payment when the feed omits them", () => {
    expect(PRICING_CONFIG.finance.defaultDownPaymentPercent).toBe(30);
    const base = deriveBasePricing({ basePrice: 30_000 });
    expect(base.baseDownPayment).toBe(9_000);
    expect(base.baseMonthlyPayment).toBeCloseTo(amortizedMonthlyPayment(21_000, 7.49, 72), 2);
  });

  it("keeps feed-provided values", () => {
    expect(deriveBasePricing({ basePrice: 30_000, baseDownPayment: 5_000, baseMonthlyPayment: 450 })).toEqual({
      basePrice: 30_000,
      baseDownPayment: 5_000,
      baseMonthlyPayment: 450,
    });
  });

  it("returns base and display values together", () => {
    const priced = computePricing({ basePrice: 25_000, baseDownPayment: 2_500, baseMonthlyPayment: 400 });
    expect(priced).toMatchObject({
      basePrice: 25_000,
      baseDownPayment: 2_500,
      baseMonthlyPayment: 400,
      displayPrice: 30_000,
      displayDownPayment: 3_000,
      displayMonthlyPayment: 440,
    });
  });
});

describe("pricingForDownPercent", () => {
  it("sets 30% down (nearest $50) and the amortized monthly payment on the rest", () => {
    const p = pricingForDownPercent(40_000);
    expect(p.displayDownPayment).toBe(12_000);
    expect(p.displayMonthlyPayment).toBe(Math.round(amortizedMonthlyPayment(28_000, 7.49, 72)));
    expect(pricingForDownPercent(31_200).displayDownPayment).toBe(9_350); // 9,360 → nearest $50
  });

  it("back-solves base values that the multipliers turn back into the same display values", () => {
    for (let price = 4_900; price <= 150_000; price += 1_300) {
      const p = pricingForDownPercent(price, 30);
      const display = applyPricingMultipliers({
        basePrice: Number((price / DEFAULT_MULTIPLIERS.vehiclePrice).toFixed(2)),
        baseDownPayment: p.baseDownPayment,
        baseMonthlyPayment: p.baseMonthlyPayment,
      });
      expect(display).toEqual({ displayPrice: price, displayDownPayment: p.displayDownPayment, displayMonthlyPayment: p.displayMonthlyPayment });
      expect(Math.abs(p.displayDownPayment / price - 0.3)).toBeLessThanOrEqual(25 / price);
    }
  });

  it("supports other percentages and rejects invalid ones", () => {
    expect(pricingForDownPercent(30_000, 0).displayDownPayment).toBe(0);
    expect(pricingForDownPercent(30_000, 100)).toMatchObject({ displayDownPayment: 30_000, displayMonthlyPayment: 0 });
    expect(() => pricingForDownPercent(30_000, 101)).toThrow(RangeError);
    expect(() => pricingForDownPercent(-1)).toThrow(RangeError);
  });
});
