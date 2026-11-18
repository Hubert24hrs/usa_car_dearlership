import { BadgeDollarSign, CalendarClock, FileCheck2, Handshake } from "lucide-react";
import type { Metadata } from "next";
import { TradeInForm } from "@/components/forms/trade-in-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Sell or trade in your car — instant estimate",
  description: "Get an instant trade-in estimate with your VIN or year, make and model. Sell your car outright or apply the value to your next vehicle.",
  alternates: { canonical: "/sell-or-trade" },
};

type Props = { searchParams: Promise<{ vehicle?: string }> };

export default async function SellOrTradePage({ searchParams }: Props) {
  const { vehicle } = await searchParams;
  const vehicleId = vehicle && /^[0-9a-f-]{36}$/i.test(vehicle) ? vehicle : undefined;
  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="Sell or trade"
        title="Get a real offer for your car"
        crumbs={[{ name: "Sell or trade", href: "/sell-or-trade" }]}
        description="Look up your vehicle by VIN or plate, get an instant estimate, and we'll confirm a firm offer — even if you don't buy from us."
      />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <section aria-label="Trade-in appraisal form" className="rounded-2xl border bg-card p-6 shadow-soft md:p-8">
          <TradeInForm vehicleId={vehicleId} />
        </section>
        <aside className="space-y-4" aria-label="How it works">
          <h2 className="text-lg font-semibold">How it works</h2>
          {[
            { icon: BadgeDollarSign, title: "Instant estimate", text: "A preliminary range based on comparable vehicles in our inventory." },
            { icon: CalendarClock, title: "Quick inspection", text: "15-minute in-person or video walkaround to confirm condition." },
            { icon: FileCheck2, title: "We handle the paperwork", text: "Including paying off your loan if you still owe on it." },
            { icon: Handshake, title: "Get paid or trade", text: "Take payment or apply your equity to your next vehicle." },
          ].map((step, i) => (
            <div key={step.title} className="flex gap-4 rounded-2xl border bg-card p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-heading font-bold">{i + 1}</span>
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <step.icon className="size-4 text-cta" aria-hidden="true" /> {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
