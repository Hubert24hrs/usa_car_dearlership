"use client";

import { Calculator } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { calculatePayment } from "@/lib/finance";
import { formatCurrency, formatPrice } from "@/lib/format";
import { PRICING_CONFIG } from "@/lib/pricing.config";
import { cn } from "@/lib/utils";

const { calculator } = PRICING_CONFIG.finance;

function MoneyInput({ id, value, onChange, max, label }: { id: string; value: number; onChange: (v: number) => void; max: number; label: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        id={id}
        inputMode="numeric"
        aria-label={label}
        value={value ? value.toLocaleString("en-US") : ""}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^0-9]/g, ""));
          onChange(Math.min(max, Number.isFinite(n) ? n : 0));
        }}
        className="pl-6 tabular-nums"
      />
    </div>
  );
}

/**
 * Interactive payment calculator (VDP + /finance). Estimates only — taxes and
 * fees excluded unless a sales-tax rate is entered.
 */
export function FinanceCalculator({
  price: initialPrice,
  defaultDown,
  defaultApr,
  defaultTerm,
  editablePrice = false,
  className,
}: {
  price: number;
  defaultDown: number;
  defaultApr: number;
  defaultTerm: number;
  editablePrice?: boolean;
  className?: string;
}) {
  const id = useId();
  const [price, setPrice] = useState(initialPrice);
  const [down, setDown] = useState(defaultDown);
  const [tradeIn, setTradeIn] = useState(0);
  const [payoff, setPayoff] = useState(0);
  const [apr, setApr] = useState(defaultApr);
  const [term, setTerm] = useState(defaultTerm);
  const [tax, setTax] = useState(0);

  const result = useMemo(
    () => calculatePayment({ price, downPayment: down, tradeInValue: tradeIn, tradeInPayoff: payoff, aprPercent: apr, termMonths: term, salesTaxPercent: tax }),
    [price, down, tradeIn, payoff, apr, term, tax],
  );

  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-soft md:p-6", className)} aria-labelledby={`${id}-title`}>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
          <Calculator className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            Payment calculator
          </h2>
          <p className="text-sm text-muted-foreground">Adjust the numbers to estimate your monthly payment.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {editablePrice && (
            <div className="space-y-2">
              <Label htmlFor={`${id}-price`}>Vehicle price</Label>
              <MoneyInput id={`${id}-price`} label="Vehicle price" value={price} onChange={setPrice} max={1_000_000} />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-down`}>Down payment</Label>
              <span className="text-sm text-muted-foreground">{price ? Math.round((down / price) * 100) : 0}%</span>
            </div>
            <MoneyInput id={`${id}-down`} label="Down payment" value={down} onChange={setDown} max={price} />
            <Slider
              min={0}
              max={Math.max(1000, Math.round(price * 0.5))}
              step={250}
              value={[Math.min(down, Math.round(price * 0.5))]}
              onValueChange={(v) => setDown(v[0]!)}
              aria-label="Down payment amount"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-trade`}>Trade-in value</Label>
              <MoneyInput id={`${id}-trade`} label="Trade-in value" value={tradeIn} onChange={setTradeIn} max={500_000} />
              <Link href="/sell-or-trade" className="text-xs font-medium text-primary hover:underline">
                Get a trade-in estimate
              </Link>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-payoff`}>Amount owed on trade</Label>
              <MoneyInput id={`${id}-payoff`} label="Amount owed on trade-in" value={payoff} onChange={setPayoff} max={500_000} />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Loan term</legend>
            <div className="grid grid-cols-5 gap-2">
              {calculator.terms.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={term === t}
                  onClick={() => setTerm(t)}
                  className={cn(
                    "rounded-lg border py-2 text-sm font-medium tabular-nums transition-colors",
                    term === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {t}
                  <span className="sr-only"> months</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-apr`}>APR (%)</Label>
              <Input
                id={`${id}-apr`}
                type="number"
                inputMode="decimal"
                min={calculator.minApr}
                max={calculator.maxApr}
                step={calculator.aprStep}
                value={apr}
                onChange={(e) => setApr(Math.min(calculator.maxApr, Math.max(calculator.minApr, Number(e.target.value) || 0)))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-tax`}>Sales tax % (optional)</Label>
              <Input
                id={`${id}-tax`}
                type="number"
                inputMode="decimal"
                min={0}
                max={15}
                step={0.125}
                value={tax}
                onChange={(e) => setTax(Math.min(15, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-brand p-5 text-brand-foreground" aria-live="polite">
          <div>
            <p className="text-sm text-white/75">Estimated monthly payment</p>
            <p className="font-heading text-4xl font-bold tabular-nums">
              {formatPrice(result.monthlyPayment)}
              <span className="text-lg font-medium text-white/75">/mo</span>
            </p>
            <p className="mt-1 text-xs text-white/75">
              {term} months at {apr}% APR
            </p>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/75">Vehicle price</dt>
              <dd className="tabular-nums">{formatPrice(price)}</dd>
            </div>
            {result.salesTax > 0 && (
              <div className="flex justify-between">
                <dt className="text-white/75">Est. sales tax</dt>
                <dd className="tabular-nums">{formatPrice(result.salesTax)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-white/75">Amount financed</dt>
              <dd className="tabular-nums">{formatPrice(result.amountFinanced)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/75">Total interest</dt>
              <dd className="tabular-nums">{formatCurrency(result.totalInterest)}</dd>
            </div>
          </dl>
          <Link
            href="/finance#prequalify"
            className="inline-flex items-center justify-center rounded-xl bg-cta px-4 py-2.5 text-sm font-semibold text-cta-foreground hover:bg-cta-hover"
          >
            Get pre-qualified with no credit impact
          </Link>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{PRICING_CONFIG.disclaimers.calculator}</p>
    </section>
  );
}
