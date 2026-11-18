"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ScanLine, Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format";
import { tradeInSchema } from "@/lib/leads/schema";
import { decodeVin, getTradeInEstimate, lookupPlate } from "@/lib/trade-in/actions";
import { cn } from "@/lib/utils";
import { ContactFields } from "./contact-fields";
import { Field, Honeypot, Input, NativeSelect, SmsConsentField, Textarea } from "./fields";
import { SuccessMessage } from "./success-message";
import { useLeadSubmit } from "./use-lead-submit";

const schema = tradeInSchema.omit({ type: true });
type Values = z.input<typeof schema>;

const CONDITIONS = [
  { value: "excellent", label: "Excellent", hint: "Like new, no issues" },
  { value: "good", label: "Good", hint: "Minor wear, no mechanical issues" },
  { value: "fair", label: "Fair", hint: "Visible wear, may need repairs" },
  { value: "poor", label: "Poor", hint: "Significant damage or issues" },
] as const;

export function TradeInForm({ vehicleId }: { vehicleId?: string }) {
  const [lookupMode, setLookupMode] = useState<"vin" | "plate">("vin");
  const [lookupPending, setLookupPending] = useState(false);
  const [estimate, setEstimate] = useState<{ low: number; high: number; comps: number } | null>(null);
  const [estimatePending, setEstimatePending] = useState(false);
  const [plate, setPlate] = useState({ plate: "", state: "" });

  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "email",
      message: "",
      smsConsent: false,
      website: "",
      details: { vin: "", year: undefined, make: "", model: "", trim: "", mileage: undefined, condition: "good", hasLoan: false, payoffAmount: undefined },
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("TRADE_IN", form.setError, { vehicleId });
  const { errors, isSubmitting } = form.formState;
  const d = errors.details;
  const hasLoan = form.watch("details.hasLoan");

  async function runLookup() {
    setLookupPending(true);
    const result =
      lookupMode === "vin" ? await decodeVin(String(form.getValues("details.vin") ?? "")) : await lookupPlate(plate.plate, plate.state);
    setLookupPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const v = result.vehicle;
    if (v.year) form.setValue("details.year", v.year, { shouldValidate: true });
    if (v.make) form.setValue("details.make", v.make, { shouldValidate: true });
    if (v.model) form.setValue("details.model", v.model, { shouldValidate: true });
    if (v.trim) form.setValue("details.trim", v.trim);
    toast.success("Vehicle found", { description: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") });
  }

  async function runEstimate() {
    const valid = await form.trigger(["details.year", "details.make", "details.model", "details.mileage", "details.condition"]);
    if (!valid) return;
    setEstimatePending(true);
    const values = form.getValues("details");
    const result = await getTradeInEstimate({
      year: Number(values.year),
      make: values.make,
      model: values.model,
      mileage: Number(values.mileage),
      condition: values.condition,
    });
    setEstimatePending(false);
    if (!result.ok) {
      setEstimate(null);
      toast.message(result.error);
      return;
    }
    setEstimate(result);
    form.setValue("details.estimateLow", result.low);
    form.setValue("details.estimateHigh", result.high);
  }

  if (submittedId) {
    return (
      <SuccessMessage title="Appraisal request received" onReset={() => { reset(); form.reset(); setEstimate(null); }}>
        An appraiser will confirm your offer shortly. Final offers are subject to a quick in-person or video inspection.
      </SuccessMessage>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-6" aria-label="Trade-in appraisal">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold">1. Your vehicle</legend>
        <div className="inline-flex rounded-full bg-muted p-1" role="group" aria-label="Lookup method">
          {(["vin", "plate"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={lookupMode === m}
              onClick={() => setLookupMode(m)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-medium", lookupMode === m ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {m === "vin" ? "VIN" : "License plate"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {lookupMode === "vin" ? (
            <Field label="VIN (17 characters)" error={d?.vin?.message} className="flex-1" hint="Found on your registration, insurance card or driver-side dashboard.">
              {(p) => <Input maxLength={17} className="uppercase" autoCapitalize="characters" {...p} {...form.register("details.vin")} />}
            </Field>
          ) : (
            <div className="grid flex-1 grid-cols-[1fr_90px] gap-2">
              <Field label="Plate number">{(p) => <Input {...p} value={plate.plate} onChange={(e) => setPlate((s) => ({ ...s, plate: e.target.value }))} />}</Field>
              <Field label="State">{(p) => <Input maxLength={2} {...p} value={plate.state} onChange={(e) => setPlate((s) => ({ ...s, state: e.target.value }))} />}</Field>
            </div>
          )}
          <Button type="button" variant="outline" onClick={runLookup} disabled={lookupPending} className="sm:mb-[22px]">
            {lookupPending ? <Loader2 className="animate-spin" /> : <ScanLine />} Look up
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Year" required error={d?.year?.message}>
            {(p) => <Input type="number" inputMode="numeric" {...p} {...form.register("details.year", { valueAsNumber: true })} />}
          </Field>
          <Field label="Make" required error={d?.make?.message}>
            {(p) => <Input {...p} {...form.register("details.make")} />}
          </Field>
          <Field label="Model" required error={d?.model?.message}>
            {(p) => <Input {...p} {...form.register("details.model")} />}
          </Field>
          <Field label="Trim" error={d?.trim?.message}>
            {(p) => <Input {...p} {...form.register("details.trim")} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mileage" required error={d?.mileage?.message}>
            {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.mileage", { valueAsNumber: true })} />}
          </Field>
          <Field label="Condition" required error={d?.condition?.message}>
            {(p) => (
              <NativeSelect {...p} {...form.register("details.condition")}>
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} — {c.hint}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
          <label htmlFor="has-loan" className="text-sm">
            I still owe money on this vehicle
          </label>
          <Controller
            control={form.control}
            name="details.hasLoan"
            render={({ field }) => <Switch id="has-loan" checked={field.value === true} onCheckedChange={field.onChange} />}
          />
        </div>
        {hasLoan && (
          <Field label="Approximate payoff amount" error={d?.payoffAmount?.message}>
            {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.payoffAmount", { valueAsNumber: true })} />}
          </Field>
        )}
        <Button type="button" variant="secondary" onClick={runEstimate} disabled={estimatePending}>
          {estimatePending ? <Loader2 className="animate-spin" /> : <Sparkles />} Get instant estimate
        </Button>
        {estimate && (
          <div role="status" className="rounded-2xl border border-ev/30 bg-ev-soft p-4">
            <p className="text-sm text-muted-foreground">Preliminary trade-in estimate</p>
            <p className="font-heading text-3xl font-bold">
              {formatPrice(estimate.low)} – {formatPrice(estimate.high)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on {estimate.comps} comparable vehicles in our inventory. Not a guaranteed offer — final value depends on
              inspection, history and market conditions.
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold">2. Where should we send your offer?</legend>
        <ContactFields register={form.register} errors={errors} />
        <Field label="Anything else? (accidents, modifications, two keys…)" error={errors.message?.message}>
          {(p) => <Textarea rows={3} {...p} {...form.register("message")} />}
        </Field>
        <SmsConsentField control={form.control} name="smsConsent" />
      </fieldset>
      <Honeypot {...form.register("website")} />
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full bg-cta text-cta-foreground hover:bg-cta-hover">
        {isSubmitting && <Loader2 className="animate-spin" />} Get my offer
      </Button>
    </form>
  );
}
