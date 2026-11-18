import { ArrowRight, BadgeCheck, ClipboardCheck, FileSearch, RotateCcw, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/home/section";
import { VehicleRail } from "@/components/inventory/vehicle-rail";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { cachedDealerProfile, cachedInventoryStats } from "@/lib/inventory/cached";
import { formatNumber } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Used & certified pre-owned cars for sale",
  description: "Inspected used and certified pre-owned vehicles with vehicle history reports, transparent pricing and a return window.",
  alternates: { canonical: "/used" },
};

export default async function UsedVehiclesPage() {
  const [stats, dealer] = await Promise.all([cachedInventoryStats(), cachedDealerProfile()]);
  const used = (stats.byCondition.USED ?? 0) + (stats.byCondition.CPO ?? 0);
  const standards = [
    { icon: ClipboardCheck, title: `${dealer.inspectionPoints}-point inspection`, text: "Brakes, tires, suspension, electrical, fluids, battery health (EVs) and a road test." },
    { icon: FileSearch, title: "Vehicle history report", text: "Title, accident and ownership history reviewed before any vehicle is listed." },
    { icon: Wrench, title: "Reconditioned", text: "Wear items replaced to our standards and every vehicle professionally detailed." },
    { icon: RotateCcw, title: `${dealer.returnWindowDays}-day return window`, text: `Return within ${dealer.returnWindowDays} days or ${formatNumber(dealer.returnWindowMiles)} miles (terms apply).` },
  ];
  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="Used & certified"
        title="Pre-owned vehicles you can trust"
        crumbs={[{ name: "Used vehicles", href: "/used" }]}
        description={`${formatNumber(used)} inspected used and certified pre-owned vehicles — every one with a history report and an estimated payment.`}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta-hover">
            <Link href="/inventory?condition=certified,used">
              Shop used & CPO <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            <Link href="/inventory/certified">Certified pre-owned only</Link>
          </Button>
        </div>
      </PageHeader>

      <Section id="standards" eyebrow="Our inspection standards" title="What every pre-owned vehicle gets">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {standards.map((s) => (
            <div key={s.title} className="rounded-2xl border bg-card p-6">
              <s.icon className="mb-3 size-7 text-cta" aria-hidden="true" />
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border bg-card p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="size-5 text-ev-strong" aria-hidden="true" /> Certified Pre-Owned (CPO)
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Manufacturer CPO vehicles meet the brand&apos;s age and mileage limits, pass the factory inspection and include
            extended warranty coverage. Coverage varies by manufacturer — see each listing or ask us for details.
          </p>
        </div>
      </Section>

      <Section id="cpo" eyebrow="Certified pre-owned" title="Featured CPO vehicles" action={{ label: "All CPO", href: "/inventory/certified" }} className="pt-0 md:pt-0">
        <VehicleRail where={{ condition: "CPO" }} />
      </Section>
      <Section id="used-value" eyebrow="Great value" title="Used vehicles under $25,000" action={{ label: "See more", href: "/inventory/used?price_max=25000" }} className="pt-0 md:pt-0">
        <VehicleRail where={{ condition: "USED", displayPrice: { lte: 25_000 } }} orderBy={[{ displayPrice: "asc" }]} />
      </Section>
    </>
  );
}
