"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PREQUAL_CONSENT_TEXT } from "@/lib/legal";
import { preApprovalSchema } from "@/lib/leads/schema";
import { cn } from "@/lib/utils";
import { ContactFields } from "./contact-fields";
import { Field, Honeypot, Input, NativeSelect, SmsConsentField } from "./fields";
import { SuccessMessage } from "./success-message";
import { useLeadSubmit } from "./use-lead-submit";

const schema = preApprovalSchema.omit({ type: true });
type Input_ = z.input<typeof schema>;

const STEPS: { title: string; fields: FieldPath<Input_>[] }[] = [
  { title: "About you", fields: ["firstName", "lastName", "email", "phone"] },
  { title: "Address & housing", fields: ["details.address", "details.city", "details.state", "details.zip", "details.housingStatus", "details.monthlyHousingPayment"] },
  { title: "Income & credit", fields: ["details.employmentStatus", "details.annualIncome", "details.creditScoreRange", "details.downPayment", "details.desiredMonthlyPayment", "details.consent"] },
];

/**
 * Soft-pull style pre-qualification. Collects only what a pre-qualification
 * needs — never SSN or date of birth. Submissions go to the finance team (and
 * a credit-provider adapter when one is configured).
 */
export function PrequalForm({ vehicle }: { vehicle?: { vehicleId: string; vin: string; title: string; price: number } }) {
  const [step, setStep] = useState(0);
  const form = useForm<Input_, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "phone",
      smsConsent: false,
      website: "",
      details: {
        address: "",
        city: "",
        state: "",
        zip: "",
        employmentStatus: "employed",
        annualIncome: undefined,
        housingStatus: "rent",
        monthlyHousingPayment: undefined,
        creditScoreRange: "good",
        downPayment: undefined,
        desiredMonthlyPayment: undefined,
        consent: false as unknown as true,
      },
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("PRE_APPROVAL", form.setError, vehicle);
  const { errors, isSubmitting } = form.formState;
  const d = errors.details;

  if (submittedId) {
    return (
      <SuccessMessage title="Application received" onReset={() => { reset(); form.reset(); setStep(0); }}>
        Our finance team is reviewing your information and will contact you with options, usually within one business
        hour. This request does not affect your credit score.
      </SuccessMessage>
    );
  }

  const next = async () => {
    const valid = await form.trigger(STEPS[step]!.fields);
    if (valid) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-6" aria-label="Finance pre-qualification">
      <ol className="grid grid-cols-3 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} aria-current={i === step ? "step" : undefined} className="space-y-1.5">
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-cta" : "bg-muted")} />
            <p className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
              {i + 1}. {s.title}
            </p>
          </li>
        ))}
      </ol>

      <div hidden={step !== 0} className="space-y-4">
        <ContactFields register={form.register} errors={errors} phoneRequired />
        <SmsConsentField control={form.control} name="smsConsent" />
      </div>

      <div hidden={step !== 1} className="space-y-4">
        <Field label="Street address" required error={d?.address?.message}>
          {(p) => <Input autoComplete="street-address" {...p} {...form.register("details.address")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_90px_120px]">
          <Field label="City" required error={d?.city?.message}>
            {(p) => <Input autoComplete="address-level2" {...p} {...form.register("details.city")} />}
          </Field>
          <Field label="State" required error={d?.state?.message}>
            {(p) => <Input autoComplete="address-level1" maxLength={2} placeholder="TX" {...p} {...form.register("details.state")} />}
          </Field>
          <Field label="ZIP" required error={d?.zip?.message}>
            {(p) => <Input autoComplete="postal-code" inputMode="numeric" maxLength={5} {...p} {...form.register("details.zip")} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Housing" required error={d?.housingStatus?.message}>
            {(p) => (
              <NativeSelect {...p} {...form.register("details.housingStatus")}>
                <option value="rent">Rent</option>
                <option value="own">Own</option>
                <option value="family">Live with family</option>
                <option value="other">Other</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="Monthly rent / mortgage" required error={d?.monthlyHousingPayment?.message}>
            {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.monthlyHousingPayment", { valueAsNumber: true })} />}
          </Field>
        </div>
      </div>

      <div hidden={step !== 2} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employment" required error={d?.employmentStatus?.message}>
            {(p) => (
              <NativeSelect {...p} {...form.register("details.employmentStatus")}>
                <option value="employed">Employed</option>
                <option value="self-employed">Self-employed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="other">Other</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="Annual income (before taxes)" required error={d?.annualIncome?.message}>
            {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.annualIncome", { valueAsNumber: true })} />}
          </Field>
          <Field label="Estimated credit score" required error={d?.creditScoreRange?.message}>
            {(p) => (
              <NativeSelect {...p} {...form.register("details.creditScoreRange")}>
                <option value="excellent">Excellent (720+)</option>
                <option value="good">Good (660 to 719)</option>
                <option value="fair">Fair (600 to 659)</option>
                <option value="poor">Rebuilding (under 600)</option>
                <option value="unsure">Not sure</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="Planned down payment" error={d?.downPayment?.message} hint="Optional">
            {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.downPayment", { valueAsNumber: true })} />}
          </Field>
          <Field label="Target monthly payment" error={d?.desiredMonthlyPayment?.message} hint="Optional">
            {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.desiredMonthlyPayment", { valueAsNumber: true })} />}
          </Field>
        </div>
        <Controller
          control={form.control}
          name="details.consent"
          render={({ field }) => (
            <div className="space-y-1">
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                <Checkbox id="prequal-consent" checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                <label htmlFor="prequal-consent" className="text-xs leading-relaxed text-muted-foreground">
                  {PREQUAL_CONSENT_TEXT}
                </label>
              </div>
              {d?.consent?.message && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {d.consent.message}
                </p>
              )}
            </div>
          )}
        />
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" /> Encrypted in transit. We never ask for your SSN to pre-qualify.
        </p>
      </div>

      <Honeypot {...form.register("website")} />

      <div className="flex gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft /> Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover" onClick={next}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover">
            {isSubmitting && <Loader2 className="animate-spin" />} See my options
          </Button>
        )}
      </div>
    </form>
  );
}
