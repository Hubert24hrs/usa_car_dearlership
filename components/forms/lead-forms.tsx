"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { CONTACT_CONSENT_TEXT } from "@/lib/legal";
import {
  availabilitySchema,
  contactSchema,
  serviceSchema,
  SERVICE_TYPES,
  testDriveSchema,
  textUsSchema,
  TIME_SLOTS,
} from "@/lib/leads/schema";
import { ContactFields } from "./contact-fields";
import { Field, Honeypot, Input, NativeSelect, SmsConsentField, Textarea } from "./fields";
import { SuccessMessage } from "./success-message";
import { useLeadSubmit } from "./use-lead-submit";

type VehicleContext = { vehicleId?: string; vin?: string; price?: number; title?: string; locationId?: string };

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full bg-cta text-cta-foreground hover:bg-cta-hover">
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
      {children}
    </Button>
  );
}

function ConsentNote() {
  return <p className="text-xs leading-relaxed text-muted-foreground">{CONTACT_CONSENT_TEXT}</p>;
}

const today = () => new Date().toISOString().slice(0, 10);

// ── Check availability ─────────────────────────────────────────────────────
const availabilityForm = availabilitySchema.omit({ type: true, vehicleId: true });

export function AvailabilityForm({ vehicle }: { vehicle: VehicleContext & { vehicleId: string } }) {
  const form = useForm<z.input<typeof availabilityForm>, unknown, z.output<typeof availabilityForm>>({
    resolver: zodResolver(availabilityForm),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "email",
      message: vehicle.title ? `Is the ${vehicle.title} still available?` : "Is this vehicle still available?",
      smsConsent: false,
      website: "",
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("CHECK_AVAILABILITY", form.setError, vehicle);
  const { errors, isSubmitting } = form.formState;

  if (submittedId) {
    return (
      <SuccessMessage title="You're all set" onReset={() => { reset(); form.reset(); }}>
        We&apos;re confirming availability{vehicle.title ? ` of the ${vehicle.title}` : ""} and will reply shortly.
      </SuccessMessage>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-4" aria-label="Check availability">
      <ContactFields register={form.register} errors={errors} />
      <Field label="Preferred contact method" error={errors.preferredContact?.message}>
        {(p) => (
          <NativeSelect {...p} {...form.register("preferredContact")}>
            <option value="email">Email</option>
            <option value="phone">Phone call</option>
            <option value="text">Text message</option>
          </NativeSelect>
        )}
      </Field>
      <Field label="Message" error={errors.message?.message}>
        {(p) => <Textarea rows={3} {...p} {...form.register("message")} />}
      </Field>
      <SmsConsentField control={form.control} name="smsConsent" error={errors.smsConsent?.message} />
      <Honeypot {...form.register("website")} />
      <SubmitButton pending={isSubmitting}>Check availability</SubmitButton>
      <ConsentNote />
    </form>
  );
}

// ── Test drive ──────────────────────────────────────────────────────────────
const testDriveForm = testDriveSchema.omit({ type: true });

export function TestDriveForm({ vehicle }: { vehicle?: VehicleContext }) {
  const form = useForm<z.input<typeof testDriveForm>, unknown, z.output<typeof testDriveForm>>({
    resolver: zodResolver(testDriveForm),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "phone",
      message: "",
      smsConsent: false,
      website: "",
      details: { preferredDate: today(), preferredTime: TIME_SLOTS[0] },
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("TEST_DRIVE", form.setError, vehicle);
  const { errors, isSubmitting } = form.formState;

  if (submittedId) {
    return (
      <SuccessMessage title="Test drive requested" onReset={() => { reset(); form.reset(); }}>
        We&apos;ll confirm your time by phone or text. The vehicle will be cleaned, charged/fueled and ready.
      </SuccessMessage>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-4" aria-label="Schedule a test drive">
      <ContactFields register={form.register} errors={errors} phoneRequired />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preferred date" required error={errors.details?.preferredDate?.message}>
          {(p) => <Input type="date" min={today()} {...p} {...form.register("details.preferredDate")} />}
        </Field>
        <Field label="Preferred time" required error={errors.details?.preferredTime?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("details.preferredTime")}>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>
      <Field label="Anything we should know?" error={errors.message?.message}>
        {(p) => <Textarea rows={2} {...p} {...form.register("message")} />}
      </Field>
      <SmsConsentField control={form.control} name="smsConsent" error={errors.smsConsent?.message} />
      <Honeypot {...form.register("website")} />
      <SubmitButton pending={isSubmitting}>Request test drive</SubmitButton>
      <ConsentNote />
    </form>
  );
}

// ── Text us ─────────────────────────────────────────────────────────────────
const textUsForm = textUsSchema.omit({ type: true });

export function TextUsForm({ vehicle }: { vehicle?: VehicleContext }) {
  const form = useForm<z.input<typeof textUsForm>, unknown, z.output<typeof textUsForm>>({
    resolver: zodResolver(textUsForm),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "text",
      message: vehicle?.title ? `Hi! I have a question about the ${vehicle.title}.` : "",
      smsConsent: false as unknown as true,
      website: "",
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("TEXT_US", form.setError, vehicle);
  const { errors, isSubmitting } = form.formState;

  if (submittedId) {
    return (
      <SuccessMessage title="Message sent" onReset={() => { reset(); form.reset(); }}>
        We&apos;ll text you back from our verified dealership number shortly.
      </SuccessMessage>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-4" aria-label="Text us">
      <ContactFields register={form.register} errors={errors} phoneRequired />
      <Field label="Message" required error={errors.message?.message}>
        {(p) => <Textarea rows={3} maxLength={500} {...p} {...form.register("message")} />}
      </Field>
      <SmsConsentField control={form.control} name="smsConsent" error={errors.smsConsent?.message} />
      <Honeypot {...form.register("website")} />
      <SubmitButton pending={isSubmitting}>Send text request</SubmitButton>
    </form>
  );
}

// ── General contact ─────────────────────────────────────────────────────────
const contactForm = contactSchema.omit({ type: true });

export function ContactForm() {
  const form = useForm<z.input<typeof contactForm>, unknown, z.output<typeof contactForm>>({
    resolver: zodResolver(contactForm),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "email",
      message: "",
      smsConsent: false,
      website: "",
      details: { subject: "" },
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("CONTACT", form.setError);
  const { errors, isSubmitting } = form.formState;

  if (submittedId) {
    return (
      <SuccessMessage title="Thanks for reaching out" onReset={() => { reset(); form.reset(); }}>
        A member of our team will reply within one business hour during open hours.
      </SuccessMessage>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-4" aria-label="Contact us">
      <ContactFields register={form.register} errors={errors} />
      <Field label="Subject" error={errors.details?.subject?.message}>
        {(p) => <Input {...p} {...form.register("details.subject")} />}
      </Field>
      <Field label="How can we help?" required error={errors.message?.message}>
        {(p) => <Textarea rows={5} {...p} {...form.register("message")} />}
      </Field>
      <SmsConsentField control={form.control} name="smsConsent" error={errors.smsConsent?.message} />
      <Honeypot {...form.register("website")} />
      <SubmitButton pending={isSubmitting}>Send message</SubmitButton>
      <ConsentNote />
    </form>
  );
}

// ── Service appointment ─────────────────────────────────────────────────────
const serviceForm = serviceSchema.omit({ type: true });

export function ServiceForm() {
  const form = useForm<z.input<typeof serviceForm>, unknown, z.output<typeof serviceForm>>({
    resolver: zodResolver(serviceForm),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "phone",
      message: "",
      smsConsent: false,
      website: "",
      details: {
        serviceType: SERVICE_TYPES[0],
        preferredDate: today(),
        preferredTime: TIME_SLOTS[0],
        vehicleYear: undefined,
        vehicleMake: "",
        vehicleModel: "",
        mileage: undefined,
        transport: "waiter",
      },
    },
  });
  const { onSubmit, submittedId, reset } = useLeadSubmit("SERVICE", form.setError);
  const { errors, isSubmitting } = form.formState;

  if (submittedId) {
    return (
      <SuccessMessage title="Service request received" onReset={() => { reset(); form.reset(); }}>
        Our service advisor will confirm your appointment time shortly.
      </SuccessMessage>
    );
  }

  const d = errors.details;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="relative space-y-4" aria-label="Schedule service">
      <ContactFields register={form.register} errors={errors} phoneRequired />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Year" required error={d?.vehicleYear?.message}>
          {(p) => <Input type="number" inputMode="numeric" min={1981} {...p} {...form.register("details.vehicleYear", { valueAsNumber: true })} />}
        </Field>
        <Field label="Make" required error={d?.vehicleMake?.message}>
          {(p) => <Input {...p} {...form.register("details.vehicleMake")} />}
        </Field>
        <Field label="Model" required error={d?.vehicleModel?.message}>
          {(p) => <Input {...p} {...form.register("details.vehicleModel")} />}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service needed" required error={d?.serviceType?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("details.serviceType")}>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Current mileage" error={d?.mileage?.message}>
          {(p) => <Input type="number" inputMode="numeric" min={0} {...p} {...form.register("details.mileage", { valueAsNumber: true })} />}
        </Field>
        <Field label="Preferred date" required error={d?.preferredDate?.message}>
          {(p) => <Input type="date" min={today()} {...p} {...form.register("details.preferredDate")} />}
        </Field>
        <Field label="Preferred time" required error={d?.preferredTime?.message}>
          {(p) => (
            <NativeSelect {...p} {...form.register("details.preferredTime")}>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>
      <Field label="Transportation" error={d?.transport?.message}>
        {(p) => (
          <NativeSelect {...p} {...form.register("details.transport")}>
            <option value="waiter">I&apos;ll wait</option>
            <option value="dropoff">Drop off</option>
            <option value="loaner">Need a loaner</option>
            <option value="pickup">Pickup & delivery</option>
          </NativeSelect>
        )}
      </Field>
      <Field label="Notes for the technician" error={errors.message?.message}>
        {(p) => <Textarea rows={3} {...p} {...form.register("message")} />}
      </Field>
      <SmsConsentField control={form.control} name="smsConsent" error={errors.smsConsent?.message} />
      <Honeypot {...form.register("website")} />
      <SubmitButton pending={isSubmitting}>Request appointment</SubmitButton>
      <ConsentNote />
    </form>
  );
}
