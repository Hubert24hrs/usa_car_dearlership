/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  PRICING RULES — SINGLE SOURCE OF TRUTH                               ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * Business rules supplied by the client. These are the ONLY place pricing
 * multipliers are defined — never hardcode them anywhere else.
 *
 * How it works
 * ────────────
 * • Inventory feeds/imports provide base_price, base_down_payment and
 *   base_monthly_payment (stored, ADMIN ONLY).
 * • At import time the multipliers below are applied and the results are
 *   rounded and stored as display_price, display_down_payment and
 *   display_monthly_payment. Public pages render display_* only.
 * • Admins can override the multipliers at runtime (Admin → Settings →
 *   Pricing) without a redeploy. The override is stored in the `settings`
 *   table, must fall within `multiplierBounds`, and triggers a re-price of all
 *   vehicles. These values remain the defaults/fallback.
 */

export type PricingMultipliers = {
  /** base_price → display_price */
  vehiclePrice: number;
  /** base_down_payment → display_down_payment */
  downPayment: number;
  /** base_monthly_payment → display_monthly_payment */
  monthlyPayment: number;
};

export type FinanceAssumptions = {
  /** Loan term (months) disclosed next to "Est. $X/mo" */
  termMonths: number;
  /** APR (%) disclosed next to "Est. $X/mo" */
  aprPercent: number;
};

export const PRICING_CONFIG = {
  /** Default multipliers: +20% price, +20% down payment, +10% monthly payment. */
  multipliers: {
    vehiclePrice: 1.2,
    downPayment: 1.2,
    monthlyPayment: 1.1,
  },

  /** Guardrails for admin overrides (prevents fat-finger values like 12). */
  multiplierBounds: { min: 0.5, max: 3 },

  /** Rounding increments (USD). */
  rounding: {
    price: 100, // nearest $100
    downPayment: 50, // nearest $50
    monthlyPayment: 1, // nearest $1
  },

  finance: {
    /** Assumptions disclosed with every estimated payment. */
    termMonths: 72,
    aprPercent: 7.49,
    /**
     * When a feed record omits base_down_payment / base_monthly_payment they
     * are derived from base_price with these assumptions before multipliers.
     */
    defaultDownPaymentPercent: 10,
    /** Payment calculator controls on the VDP and /finance page. */
    calculator: {
      terms: [36, 48, 60, 72, 84],
      minApr: 0,
      maxApr: 29.99,
      aprStep: 0.25,
    },
  },

  /** Consumer-facing legal copy. Have counsel review before launch. */
  disclaimers: {
    priceExcludes:
      "Prices exclude tax, title, license, registration and dealer fees. All vehicles are subject to prior sale. Prices and availability may change without notice; see dealer for complete details.",
    paymentEstimate:
      "Estimated payment for illustration only. Not an offer of credit. Based on the disclosed term, APR and down payment with approved credit. Actual rate, term and payment depend on credit approval, lender programs, down payment and trade-in. Taxes, title, license, registration and dealer fees are extra.",
    calculator:
      "Payment calculator results are estimates for planning purposes only and exclude taxes and fees. Not an offer of credit; all financing is subject to credit approval.",
  },
} as const;

export type PricingConfig = typeof PRICING_CONFIG;

// Compile-time guarantees that the defaults match the public types.
export const DEFAULT_MULTIPLIERS: PricingMultipliers = PRICING_CONFIG.multipliers;
export const DEFAULT_FINANCE_ASSUMPTIONS: FinanceAssumptions = {
  termMonths: PRICING_CONFIG.finance.termMonths,
  aprPercent: PRICING_CONFIG.finance.aprPercent,
};
