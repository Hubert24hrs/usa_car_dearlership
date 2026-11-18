"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDealerProfile, savePricingSettings } from "@/lib/admin/actions";
import { applyPricingMultipliers } from "@/lib/pricing";
import { PRICING_CONFIG } from "@/lib/pricing.config";
import { formatPrice } from "@/lib/format";
import type { DealerProfile } from "@/lib/site.config";

function NumberField({ id, label, value, onChange, step = "0.01", hint }: { id: string; label: string; value: number; onChange: (n: number) => void; step?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PricingSettingsForm({
  initial,
}: {
  initial: { vehiclePrice: number; downPayment: number; monthlyPayment: number; termMonths: number; aprPercent: number };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { min, max } = PRICING_CONFIG.multiplierBounds;
  const defaults = PRICING_CONFIG.multipliers;
  let preview: ReturnType<typeof applyPricingMultipliers> | null = null;
  try {
    preview = applyPricingMultipliers({ basePrice: 25_000, baseDownPayment: 2_500, baseMonthlyPayment: 400 }, v);
  } catch {
    preview = null;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm("Save pricing settings and re-price every vehicle now?")) return;
        startTransition(async () => {
          const result = await savePricingSettings(v);
          if (result.ok) {
            toast.success(result.message ?? "Saved");
            router.refresh();
          } else toast.error(result.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField id="m-price" label="Vehicle price multiplier" value={v.vehiclePrice} onChange={(n) => setV({ ...v, vehiclePrice: n })} hint={`Default ×${defaults.vehiclePrice} · rounded to $${PRICING_CONFIG.rounding.price}`} />
        <NumberField id="m-down" label="Down payment multiplier" value={v.downPayment} onChange={(n) => setV({ ...v, downPayment: n })} hint={`Default ×${defaults.downPayment} · rounded to $${PRICING_CONFIG.rounding.downPayment}`} />
        <NumberField id="m-monthly" label="Monthly payment multiplier" value={v.monthlyPayment} onChange={(n) => setV({ ...v, monthlyPayment: n })} hint={`Default ×${defaults.monthlyPayment} · rounded to $${PRICING_CONFIG.rounding.monthlyPayment}`} />
        <NumberField id="f-term" label="Disclosed term (months)" step="1" value={v.termMonths} onChange={(n) => setV({ ...v, termMonths: n })} />
        <NumberField id="f-apr" label="Disclosed APR (%)" value={v.aprPercent} onChange={(n) => setV({ ...v, aprPercent: n })} />
      </div>
      <p className="text-xs text-muted-foreground">Allowed multiplier range: {min} – {max}.</p>
      <div className="rounded-xl bg-muted/60 p-4 text-sm">
        <p className="font-medium">Preview — feed values $25,000 / $2,500 down / $400 mo become:</p>
        {preview ? (
          <p className="mt-1 tabular-nums">
            {formatPrice(preview.displayPrice)} · {formatPrice(preview.displayDownPayment)} down · {formatPrice(preview.displayMonthlyPayment)}/mo
          </p>
        ) : (
          <p className="mt-1 text-destructive">Multipliers out of range.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !preview} className="bg-cta text-cta-foreground hover:bg-cta-hover">
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save & re-price inventory
        </Button>
        <Button type="button" variant="outline" onClick={() => setV({ ...v, ...defaults })}>
          Reset to config defaults
        </Button>
      </div>
    </form>
  );
}

export function DealerProfileForm({ initial }: { initial: DealerProfile }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const text = (key: keyof DealerProfile, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`d-${key}`}>{label}</Label>
      <Input id={`d-${key}`} value={String(v[key])} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  const num = (key: keyof DealerProfile, label: string) => (
    <NumberField id={`d-${key}`} label={label} step="1" value={Number(v[key])} onChange={(n) => setV({ ...v, [key]: n })} />
  );
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveDealerProfile(v);
          if (result.ok) {
            toast.success(result.message ?? "Saved");
            router.refresh();
          } else toast.error(result.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {text("name", "Dealership name")}
        {text("legalName", "Legal entity name")}
        {text("licenseNumber", "Dealer license number", "Displayed in the site footer and emails.")}
        {text("email", "Public email")}
        {text("phone", "Main phone")}
        {text("smsPhone", "Text / SMS number")}
        {text("address", "Headquarters address")}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {num("returnWindowDays", "Return window (days)")}
        {num("returnWindowMiles", "Return window (miles)")}
        {num("inspectionPoints", "Inspection points")}
        {num("deliveryRadiusMiles", "Delivery radius (miles)")}
      </div>
      <Button type="submit" disabled={pending} className="bg-cta text-cta-foreground hover:bg-cta-hover">
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Save dealer profile
      </Button>
    </form>
  );
}
