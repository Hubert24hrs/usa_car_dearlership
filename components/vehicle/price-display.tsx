import { formatPrice } from "@/lib/format";
import type { FinanceAssumptions } from "@/lib/pricing.config";
import { cn } from "@/lib/utils";

/**
 * Public price block — renders display_* values only.
 * "Est. $X/mo" always discloses the term, APR and down payment used.
 */
export function PriceDisplay({
  price,
  monthly,
  down,
  finance,
  size = "md",
  className,
}: {
  price: number;
  monthly: number;
  down: number;
  finance: FinanceAssumptions;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("font-heading font-bold tracking-tight", size === "lg" ? "text-4xl" : "text-2xl")}>
        {formatPrice(price)}
      </p>
      <p className={cn("text-muted-foreground", size === "lg" ? "text-base" : "text-sm")}>
        <span className="font-semibold text-foreground">Est. {formatPrice(monthly)}/mo</span>
        <sup>*</sup> · {formatPrice(down)} down
      </p>
      <p className="text-[11px] leading-4 text-muted-foreground">
        *{finance.termMonths} mo at {finance.aprPercent}% APR with {formatPrice(down)} down, with approved credit. Taxes &
        fees extra.
      </p>
    </div>
  );
}
