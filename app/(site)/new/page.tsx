import { ArrowRight, BadgePercent, Gift, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/home/section";
import { VehicleRail } from "@/components/inventory/vehicle-rail";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { cachedInventoryStats } from "@/lib/inventory/cached";
import { BODY_STYLES } from "@/lib/inventory/constants";
import { formatNumber } from "@/lib/format";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "New cars, trucks & SUVs for sale",
  description: "Shop new electric, hybrid, gas and diesel vehicles with transparent pricing, current incentives and estimated payments.",
  alternates: { canonical: "/new" },
};

const INCENTIVES = [
  { icon: BadgePercent, title: "Special APR financing", text: "Select new models may qualify for promotional financing for well-qualified buyers." },
  { icon: Gift, title: "Customer cash", text: "Manufacturer rebates can lower your price on eligible models and trims." },
  { icon: ShieldCheck, title: "Lease specials", text: "Low monthly lease offers on popular SUVs, sedans and EVs." },
];

export default async function NewVehiclesPage() {
  const stats = await cachedInventoryStats();
  return (
    <>
      <PageHeader
        tone="brand"
        eyebrow="New inventory"
        title="Brand-new vehicles, priced up front"
        crumbs={[{ name: "New vehicles", href: "/new" }]}
        description={`${formatNumber(stats.byCondition.NEW ?? 0)} new vehicles in stock with full factory warranty and an estimated payment on every listing.`}
      >
        <Button asChild size="lg" className="mt-6 bg-cta text-cta-foreground hover:bg-cta-hover">
          <Link href="/inventory/new">
            Browse all new inventory <ArrowRight />
          </Link>
        </Button>
      </PageHeader>

      <Section id="incentives" eyebrow="Manufacturer incentives" title="Current offers">
        <div className="grid gap-5 md:grid-cols-3">
          {INCENTIVES.map((offer) => (
            <div key={offer.title} className="rounded-2xl border bg-card p-6">
              <offer.icon className="mb-3 size-7 text-cta" aria-hidden="true" />
              <h3 className="text-lg font-semibold">{offer.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{offer.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Placeholder: manufacturer incentives change monthly and vary by region, model, trim and credit tier. Connect your
          OEM incentive feed or update this section before publishing. Not all buyers will qualify.
        </p>
      </Section>

      <Section id="new-featured" eyebrow="In stock now" title="Featured new vehicles" action={{ label: "See all new", href: "/inventory/new" }} className="pt-0 md:pt-0">
        <VehicleRail where={{ condition: "NEW" }} />
      </Section>

      <Section id="new-body" title="Shop new by body style" className="pt-0 md:pt-0">
        <ul className="flex flex-wrap gap-2">
          {BODY_STYLES.map((b) => (
            <li key={b.value}>
              <Link href={`/inventory/new/${b.slug}`} className="inline-flex rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary">
                New {b.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
