import { BatteryCharging, Leaf, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import type { FuelType, VehicleCondition, VehicleStatus } from "@/lib/inventory/constants";
import { cn } from "@/lib/utils";

const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap";

export function ConditionBadge({ condition, className }: { condition: VehicleCondition; className?: string }) {
  if (condition === "NEW") return <span className={cn(base, "bg-brand text-brand-foreground", className)}>New</span>;
  if (condition === "CPO")
    return (
      <span className={cn(base, "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200", className)}>
        <ShieldCheck className="size-3" aria-hidden="true" /> Certified
      </span>
    );
  return <span className={cn(base, "bg-secondary text-secondary-foreground", className)}>Used</span>;
}

export function FuelBadge({ fuel, className }: { fuel: FuelType; className?: string }) {
  if (fuel === "ELECTRIC")
    return (
      <span className={cn(base, "bg-ev-soft text-ev-strong", className)}>
        <BatteryCharging className="size-3" aria-hidden="true" /> EV
      </span>
    );
  if (fuel === "PLUG_IN_HYBRID")
    return (
      <span className={cn(base, "bg-ev-soft text-ev-strong", className)}>
        <PlugZap className="size-3" aria-hidden="true" /> Plug-in Hybrid
      </span>
    );
  if (fuel === "HYBRID")
    return (
      <span className={cn(base, "bg-ev-soft text-ev-strong", className)}>
        <Leaf className="size-3" aria-hidden="true" /> Hybrid
      </span>
    );
  if (fuel === "DIESEL") return <span className={cn(base, "bg-secondary text-secondary-foreground", className)}>Diesel</span>;
  return null;
}

export function StatusBadge({ status, className }: { status: VehicleStatus; className?: string }) {
  if (status === "AVAILABLE") return null;
  return (
    <span
      className={cn(
        base,
        status === "PENDING" ? "bg-amber-500 text-black" : "bg-destructive text-white",
        className,
      )}
    >
      {status === "PENDING" ? "Sale pending" : "Sold"}
    </span>
  );
}

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <span className={cn(base, "bg-cta text-cta-foreground", className)}>
      <Sparkles className="size-3" aria-hidden="true" /> Featured
    </span>
  );
}
