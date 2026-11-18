/**
 * Pure loan math shared by the importer (deriving base payments), the VDP
 * payment calculator and the /finance page. No I/O, safe for client bundles.
 */

/** Round to cents. */
export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Standard amortized monthly payment: M = P·r / (1 − (1 + r)^−n)
 * @param principal  amount financed (USD)
 * @param aprPercent annual percentage rate, e.g. 7.49
 * @param termMonths number of monthly payments
 */
export function amortizedMonthlyPayment(principal: number, aprPercent: number, termMonths: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(termMonths) || termMonths <= 0) {
    throw new RangeError("termMonths must be a positive number");
  }
  if (!Number.isFinite(aprPercent) || aprPercent < 0) {
    throw new RangeError("aprPercent must be zero or positive");
  }
  const monthlyRate = aprPercent / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

export type PaymentInput = {
  price: number;
  downPayment: number;
  tradeInValue?: number;
  tradeInPayoff?: number;
  aprPercent: number;
  termMonths: number;
  /** Optional sales tax applied to (price − trade-in), as most US states do. */
  salesTaxPercent?: number;
};

export type PaymentResult = {
  amountFinanced: number;
  monthlyPayment: number;
  totalInterest: number;
  totalOfPayments: number;
  salesTax: number;
};

/** Full payment breakdown used by the interactive calculator. */
export function calculatePayment(input: PaymentInput): PaymentResult {
  const tradeIn = Math.max(0, input.tradeInValue ?? 0);
  const payoff = Math.max(0, input.tradeInPayoff ?? 0);
  const taxableAmount = Math.max(0, input.price - tradeIn);
  const salesTax = roundCents(taxableAmount * Math.max(0, input.salesTaxPercent ?? 0) / 100);
  const amountFinanced = Math.max(
    0,
    roundCents(input.price + salesTax - Math.max(0, input.downPayment) - tradeIn + payoff),
  );
  const monthly = amortizedMonthlyPayment(amountFinanced, input.aprPercent, input.termMonths);
  const totalOfPayments = roundCents(monthly * input.termMonths);
  return {
    amountFinanced,
    monthlyPayment: roundCents(monthly),
    totalInterest: roundCents(Math.max(0, totalOfPayments - amountFinanced)),
    totalOfPayments,
    salesTax,
  };
}

/**
 * Inverse of the payment formula: the loan amount a shopper can afford for a
 * target monthly payment. Used by "Shop by budget".
 */
export function affordablePrincipal(monthlyPayment: number, aprPercent: number, termMonths: number): number {
  if (monthlyPayment <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return roundCents(monthlyPayment * termMonths);
  return roundCents((monthlyPayment * (1 - Math.pow(1 + r, -termMonths))) / r);
}
