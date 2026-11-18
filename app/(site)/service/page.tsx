import { BatteryCharging, Clock, Disc3, Droplets, Tag } from "lucide-react";
import type { Metadata } from "next";
import { ServiceForm } from "@/components/forms/lead-forms";
import { Section } from "@/components/home/section";
import { PageHeader } from "@/components/layout/page-header";
import { cachedLocations } from "@/lib/inventory/cached";
import { formatHour } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Schedule service & maintenance",
  description: "Book oil changes, tires, brakes, EV and hybrid service online. Certified technicians, loaners and pickup available.",
  alternates: { canonical: "/service" },
};

const SPECIALS = [
  { icon: Droplets, title: "Oil & filter change", offer: "$10 off", text: "Synthetic oil service with multi-point inspection." },
  { icon: Disc3, title: "Brake inspection", offer: "Free", text: "Pads, rotors and fluid check with any service visit." },
  { icon: BatteryCharging, title: "EV battery health check", offer: "$49", text: "State-of-health report and charging system inspection." },
  { icon: Tag, title: "Tire rotation & balance", offer: "$29.95", text: "Extends tire life and smooths your ride." },
];

export default async function ServicePage() {
  const locations = await cachedLocations();
  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="Service center"
        title="Service that fits your schedule"
        crumbs={[{ name: "Service", href: "/service" }]}
        description="Certified technicians for gas, diesel, hybrid and electric vehicles, with loaners, a shuttle and pickup & delivery."
      />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="service-form" className="rounded-2xl border bg-card p-6 shadow-soft md:p-8">
          <h2 id="service-form" className="mb-6 text-2xl font-bold">
            Request an appointment
          </h2>
          <ServiceForm />
        </section>
        <aside className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-5" aria-hidden="true" /> Service hours
          </h2>
          {locations.map((l) => (
            <div key={l.id} className="rounded-2xl border bg-card p-5">
              <p className="font-semibold">{l.name}</p>
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {l.serviceHours.map((h) => (
                  <li key={h.day} className="flex justify-between">
                    <span>{h.day}</span>
                    <span>{h.open ? `${formatHour(h.open)} to ${formatHour(h.close)}` : "Closed"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
      </div>
      <Section id="specials" eyebrow="Service specials" title="Current service offers" className="pt-0 md:pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SPECIALS.map((s) => (
            <div key={s.title} className="rounded-2xl border bg-card p-6">
              <s.icon className="mb-3 size-7 text-cta" aria-hidden="true" />
              <p className="font-heading text-2xl font-bold text-cta">{s.offer}</p>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Placeholder offers. Set real pricing, eligible vehicles and expiration dates before publishing. Cannot be combined
          with other offers. Present at write-up.
        </p>
      </Section>
    </>
  );
}
