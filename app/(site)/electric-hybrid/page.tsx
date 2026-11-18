import { BatteryCharging, Gauge, Home, Info, Leaf, MapPinned, PlugZap, ThermometerSnowflake, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/home/section";
import { VehicleRail } from "@/components/inventory/vehicle-rail";
import { PageHeader } from "@/components/layout/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cachedInventoryStats } from "@/lib/inventory/cached";
import { formatNumber } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Electric & hybrid vehicle hub — range, charging & incentives",
  description: "Shop EVs, plug-in hybrids and hybrids. Learn about range, home and public charging, and incentives before you buy.",
  alternates: { canonical: "/electric-hybrid" },
};

const CHARGING = [
  { icon: Home, title: "Level 1 (120V outlet)", speed: "~3–5 miles of range per hour", text: "Uses a standard household outlet. Fine for plug-in hybrids and short daily commutes." },
  { icon: PlugZap, title: "Level 2 (240V home / public)", speed: "~20–40 miles of range per hour", text: "The most common home setup — most EVs charge fully overnight. Installation typically requires an electrician." },
  { icon: Zap, title: "DC fast charging", speed: "~10–80% in 18–45 minutes", text: "For road trips. Speeds vary by vehicle, battery temperature and charger. NACS (J3400) and CCS connectors." },
];

const RANGE_BANDS = [
  { label: "200+ miles", value: 200 },
  { label: "250+ miles", value: 250 },
  { label: "300+ miles", value: 300 },
  { label: "350+ miles", value: 350 },
];

export default async function ElectricHybridPage() {
  const stats = await cachedInventoryStats();
  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="EV & hybrid hub"
        title="Go electric — or go further on every gallon"
        crumbs={[{ name: "Electric & hybrid", href: "/electric-hybrid" }]}
        description={`${formatNumber(stats.byFuel.ELECTRIC ?? 0)} EVs, ${formatNumber(stats.byFuel.PLUG_IN_HYBRID ?? 0)} plug-in hybrids and ${formatNumber(stats.byFuel.HYBRID ?? 0)} hybrids in stock. Learn how range and charging fit your life.`}
      />

      <Section id="shop" eyebrow="Shop electrified" title="Find your electrified vehicle">
        <Tabs defaultValue="ev">
          <TabsList className="mb-6">
            <TabsTrigger value="ev">
              <BatteryCharging className="size-4" /> Electric
            </TabsTrigger>
            <TabsTrigger value="phev">
              <PlugZap className="size-4" /> Plug-in hybrid
            </TabsTrigger>
            <TabsTrigger value="hybrid">
              <Leaf className="size-4" /> Hybrid
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ev" className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Filter by range:</span>
              {RANGE_BANDS.map((band) => (
                <Link key={band.value} href={`/inventory/electric?range_min=${band.value}&sort=range_desc`} className="rounded-full border bg-card px-3 py-1.5 text-sm hover:border-primary">
                  {band.label}
                </Link>
              ))}
              <Link href="/inventory/electric" className="text-sm font-semibold text-primary hover:underline">
                All EVs →
              </Link>
            </div>
            <VehicleRail where={{ fuelType: "ELECTRIC" }} orderBy={[{ isFeatured: "desc" }, { evRangeMiles: { sort: "desc", nulls: "last" } }]} />
          </TabsContent>
          <TabsContent value="phev" className="space-y-5">
            <Link href="/inventory/plug-in-hybrid" className="text-sm font-semibold text-primary hover:underline">
              All plug-in hybrids →
            </Link>
            <VehicleRail where={{ fuelType: "PLUG_IN_HYBRID" }} />
          </TabsContent>
          <TabsContent value="hybrid" className="space-y-5">
            <Link href="/inventory/hybrid" className="text-sm font-semibold text-primary hover:underline">
              All hybrids →
            </Link>
            <VehicleRail where={{ fuelType: "HYBRID" }} orderBy={[{ mpgCombined: { sort: "desc", nulls: "last" } }]} />
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="range" eyebrow="Range guide" title="How much range do you really need?" className="pt-0 md:pt-0">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Gauge, title: "Daily driving", text: "The average American drives about 35–40 miles a day. Nearly every EV covers a week of commuting on one charge." },
            { icon: ThermometerSnowflake, title: "Weather matters", text: "Cold weather and heavy climate use can reduce range by 20–30%. Heat pumps and preconditioning help." },
            { icon: MapPinned, title: "Road trips", text: "Plan on charging every 2–4 hours on the highway. Built-in trip planners route you through fast chargers." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-6">
              <item.icon className="mb-3 size-7 text-ev-strong" aria-hidden="true" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="charging" eyebrow="Charging guide" title="Charging, explained" className="pt-0 md:pt-0">
        <div className="grid gap-5 md:grid-cols-3">
          {CHARGING.map((c) => (
            <div key={c.title} className="rounded-2xl border border-ev/30 bg-ev-soft p-6">
              <c.icon className="mb-3 size-7 text-ev-strong" aria-hidden="true" />
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm font-medium text-ev-strong">{c.speed}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="incentives" eyebrow="Incentives" title="Tax credits & rebates" className="pt-0 md:pt-0">
        <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-6 text-sm text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
          <p className="flex items-center gap-2 font-semibold">
            <Info className="size-4" aria-hidden="true" /> Placeholder — verify current federal & state rules before publishing
          </p>
          <p className="mt-2">
            Federal clean-vehicle tax credits for new and used EVs (IRC §30D / §25E) were ended for vehicles acquired after
            September 30, 2025 under federal legislation enacted in July 2025. Some states, utilities and local programs still
            offer rebates for EVs and home chargers. Confirm eligibility, amounts and deadlines with official sources (e.g.
            IRS, your state energy office, your utility) and update this section — do not advertise a credit unless it
            applies to the specific vehicle and buyer.
          </p>
        </div>
      </Section>

      <Section id="faq" eyebrow="FAQ" title="Common questions" className="pt-0 md:pt-0">
        <Accordion type="single" collapsible className="max-w-3xl">
          {[
            ["Hybrid vs. plug-in hybrid vs. EV?", "A hybrid charges itself and never plugs in. A plug-in hybrid has a larger battery for 20–50 electric miles before the gas engine starts. An EV runs only on electricity."],
            ["How long do EV batteries last?", "Most EV batteries are covered by a federal-minimum 8-year / 100,000-mile warranty and commonly outlast it. We include a battery health report with pre-owned EVs where available."],
            ["Can I install a home charger?", "Usually yes — a Level 2 charger needs a 240V circuit. We can recommend licensed installers and check for utility rebates."],
            ["What is NACS?", "The North American Charging Standard (SAE J3400) is the connector used by Tesla and now adopted by most automakers. Adapters let NACS and CCS vehicles use either network."],
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
