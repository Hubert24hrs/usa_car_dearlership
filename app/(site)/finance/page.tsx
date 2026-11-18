import { BadgeCheck, Building2, Clock, Lock } from "lucide-react";
import type { Metadata } from "next";
import { PrequalForm } from "@/components/forms/prequal-form";
import { Section } from "@/components/home/section";
import { PageHeader } from "@/components/layout/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FinanceCalculator } from "@/components/vehicle/finance-calculator";
import { prisma } from "@/lib/db";
import { cachedFinanceAssumptions } from "@/lib/inventory/cached";
import { vehicleTitle } from "@/lib/format";
import { shouldShowDemoInventory } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Auto financing & pre-qualification",
  description: "Get pre-qualified for an auto loan in minutes with no impact to your credit score, and estimate payments with our calculator.",
  alternates: { canonical: "/finance" },
};

type Props = { searchParams: Promise<{ vehicle?: string }> };

export default async function FinancePage({ searchParams }: Props) {
  const { vehicle: vehicleId } = await searchParams;
  const [finance, vehicle] = await Promise.all([
    cachedFinanceAssumptions(),
    vehicleId && /^[0-9a-f-]{36}$/i.test(vehicleId)
      ? prisma.vehicle.findFirst({
          where: { id: vehicleId, ...(shouldShowDemoInventory() ? {} : { isDemo: false }) },
          select: { id: true, vin: true, year: true, make: true, model: true, trim: true, displayPrice: true, displayDownPayment: true },
        })
      : null,
  ]);
  const price = vehicle ? Number(vehicle.displayPrice) : 35_000;
  const down = vehicle ? Number(vehicle.displayDownPayment) : 3_500;

  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="Financing"
        title="Get pre-qualified with no impact to your credit"
        crumbs={[{ name: "Finance", href: "/finance" }]}
        description="Answer a few questions and our finance team will match you with lenders — then shop knowing your real budget."
      />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
        <section id="prequalify" aria-labelledby="prequal-heading" className="scroll-mt-28 rounded-2xl border bg-card p-6 shadow-soft md:p-8">
          <h2 id="prequal-heading" className="text-2xl font-bold">
            Pre-qualification
          </h2>
          {vehicle && (
            <p className="mt-1 text-sm text-muted-foreground">
              For: <span className="font-medium text-foreground">{vehicleTitle(vehicle)}</span>
            </p>
          )}
          <div className="mt-6">
            <PrequalForm
              vehicle={vehicle ? { vehicleId: vehicle.id, vin: vehicle.vin, title: vehicleTitle(vehicle), price } : undefined}
            />
          </div>
        </section>
        <aside className="space-y-4">
          {[
            { icon: Clock, title: "Answers in minutes", text: "Most applicants hear back within one business hour." },
            { icon: Lock, title: "No SSN to pre-qualify", text: "Pre-qualification won't affect your credit score." },
            { icon: BadgeCheck, title: "All credit welcome", text: "From first-time buyers to credit rebuilders." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 rounded-2xl border bg-card p-5">
              <item.icon className="size-6 shrink-0 text-cta" aria-hidden="true" />
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>

      <section className="container-page pb-6" id="calculator" aria-label="Payment calculator">
        <FinanceCalculator price={price} defaultDown={down} defaultApr={finance.aprPercent} defaultTerm={finance.termMonths} editablePrice />
      </section>

      <Section id="lenders" eyebrow="Lending partners" title="We work with national banks, credit unions and captive lenders">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Lender logos placeholder">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex h-20 items-center justify-center gap-2 rounded-2xl border border-dashed bg-card text-sm text-muted-foreground">
              <Building2 className="size-5" aria-hidden="true" /> Lender {i + 1}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Placeholder tiles — add logos only for lenders you have agreements with and permission to display.</p>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Financing questions" className="pt-0 md:pt-0">
        <Accordion type="single" collapsible className="max-w-3xl">
          {[
            ["Does pre-qualifying hurt my credit?", "No. Pre-qualification uses the information you provide (and, if a lending partner performs one, a soft inquiry), which doesn't affect your score. A full application for final approval may require a hard inquiry — we'll always ask first."],
            ["What do I need to finalize a loan?", "Typically a valid driver's license, proof of income, proof of residence and proof of insurance."],
            ["Can I use my own bank or credit union?", "Absolutely. Bring your pre-approval and we'll work with your lender."],
            ["How is the estimated payment on listings calculated?", "Each listing shows an estimated payment with the term, APR and down payment used. Your actual terms depend on credit approval and lender programs; taxes and fees are extra."],
          ].map(([q, a]) => (
            <AccordionItem key={q} value={q!}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </>
  );
}
