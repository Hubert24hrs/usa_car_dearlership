import { AlertTriangle, BadgeDollarSign, CalendarCheck, CarFront, Info, MapPin, MessageSquare, Phone, Repeat } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ConditionBadge, FuelBadge, StatusBadge } from "@/components/vehicle/badges";
import { FeaturesTabs } from "@/components/vehicle/features-tabs";
import { FinanceCalculator } from "@/components/vehicle/finance-calculator";
import { Gallery } from "@/components/vehicle/gallery";
import { LeadDialog } from "@/components/vehicle/lead-dialog";
import { PriceDisplay } from "@/components/vehicle/price-display";
import { SaveButton } from "@/components/vehicle/save-button";
import { EvBlock, KeySpecs, MpgBlock } from "@/components/vehicle/specs";
import { RecentlyViewed, ShareButtons, VdpMobileBar, ViewTracker } from "@/components/vehicle/vdp-client";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Button } from "@/components/ui/button";
import { cachedDealerProfile, cachedFinanceAssumptions, cachedSimilarVehicles, cachedVehicleBySlug } from "@/lib/inventory/cached";
import { bodyLabel, fuelLabel } from "@/lib/inventory/constants";
import { getFeaturedVehicles } from "@/lib/inventory/vehicles";
import { formatHour, formatMileage, formatPrice, vehicleTitle } from "@/lib/format";
import { DEMO_IMAGE_NOTICE } from "@/lib/legal";
import { PRICING_CONFIG } from "@/lib/pricing.config";
import { vehicleJsonLd } from "@/lib/seo";
import { absoluteUrl, smsHref, telHref } from "@/lib/site.config";

/** ISR: vehicle pages are static and refreshed every 10 minutes or on inventory changes. */
export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const featured = await getFeaturedVehicles(24);
    return featured.map((v) => ({ slug: v.slug }));
  } catch {
    return []; // build without a database: pages render on first request
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const v = await cachedVehicleBySlug(slug.toLowerCase());
  if (!v) return { title: "Vehicle not found", robots: { index: false } };
  const title = `${vehicleTitle(v)} for sale at ${formatPrice(v.displayPrice)}`;
  const description = `${vehicleTitle(v)} · ${formatMileage(v.mileage)} · ${fuelLabel(v.fuelType)} ${bodyLabel(v.bodyStyle)} · ${v.exteriorColor}. Est. ${formatPrice(v.displayMonthlyPayment)}/mo. Located in ${v.location.city}, ${v.location.state}.`;
  return {
    title,
    description,
    alternates: { canonical: `/inventory/${v.slug}` },
    robots: { index: v.status !== "SOLD" && !v.isDemo, follow: true },
    openGraph: { title, description, type: "website", url: absoluteUrl(`/inventory/${v.slug}`) },
  };
}

export default async function VehiclePage({ params }: Props) {
  const { slug } = await params;
  const vehicle = await cachedVehicleBySlug(slug.toLowerCase());
  if (!vehicle) notFound();
  if (slug !== vehicle.slug) permanentRedirect(`/inventory/${vehicle.slug}`);

  const [finance, dealer, similar] = await Promise.all([
    cachedFinanceAssumptions(),
    cachedDealerProfile(),
    cachedSimilarVehicles({
      id: vehicle.id,
      bodyStyle: vehicle.bodyStyle,
      fuelType: vehicle.fuelType,
      makeSlug: vehicle.makeSlug,
      displayPrice: vehicle.displayPrice,
    }),
  ]);

  const title = vehicleTitle(vehicle);
  const leadVehicle = { vehicleId: vehicle.id, vin: vehicle.vin, title, price: vehicle.displayPrice, locationId: vehicle.location.id };
  const phone = vehicle.location.phone || dealer.phone;
  const smsPhone = vehicle.location.smsPhone || dealer.smsPhone;
  const sold = vehicle.status === "SOLD";

  return (
    <div className="container-page pb-28 pt-6 md:pb-12">
      <ViewTracker id={vehicle.id} vin={vehicle.vin} title={title} price={vehicle.displayPrice} condition={vehicle.condition} fuel={vehicle.fuelType} />
      <Breadcrumbs
        className="mb-4"
        items={[
          { name: "Home", href: "/" },
          { name: "Inventory", href: "/inventory" },
          { name: vehicle.make, href: `/inventory/${vehicle.makeSlug}` },
          { name: vehicle.model, href: `/inventory/${vehicle.makeSlug}/${vehicle.modelSlug}` },
          { name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, href: `/inventory/${vehicle.slug}` },
        ]}
      />

      {vehicle.isDemo && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          <Info className="size-4 shrink-0" aria-hidden="true" /> {DEMO_IMAGE_NOTICE}
        </p>
      )}
      {sold && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> This vehicle has been sold. Similar vehicles are shown below.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Gallery images={vehicle.images} title={title} videoUrl={vehicle.videoUrl} spinImages={vehicle.spinImages} />
          <KeySpecs vehicle={vehicle} />
          <EvBlock vehicle={vehicle} />
          <MpgBlock vehicle={vehicle} />
          <FeaturesTabs
            features={vehicle.features}
            safety={vehicle.safetyFeatures}
            description={vehicle.description}
            carfaxUrl={vehicle.carfaxUrl}
            condition={vehicle.condition}
          />
          <div id="payment-calculator" className="scroll-mt-28">
            <FinanceCalculator
              price={vehicle.displayPrice}
              defaultDown={vehicle.displayDownPayment}
              defaultApr={finance.aprPercent}
              defaultTerm={finance.termMonths}
            />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start" aria-label="Price and actions">
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="mb-3 flex flex-wrap gap-1.5">
              <ConditionBadge condition={vehicle.condition} />
              <FuelBadge fuel={vehicle.fuelType} />
              <StatusBadge status={vehicle.status} />
            </div>
            <h1 className="text-2xl font-bold leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim && <span className="block text-lg font-medium text-muted-foreground">{vehicle.trim}</span>}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMileage(vehicle.mileage)} · Stock #{vehicle.stockNumber} · VIN {vehicle.vin}
            </p>

            <PriceDisplay
              className="my-5 border-y py-4"
              size="lg"
              price={vehicle.displayPrice}
              monthly={vehicle.displayMonthlyPayment}
              down={vehicle.displayDownPayment}
              finance={finance}
            />

            {!sold && (
              <div className="grid gap-2">
                <LeadDialog kind="availability" vehicle={leadVehicle} buttonClassName="h-11 w-full text-base" />
                <LeadDialog
                  kind="test-drive"
                  vehicle={leadVehicle}
                  buttonVariant="outline"
                  trigger={
                    <Button variant="outline" className="h-11 w-full">
                      <CalendarCheck /> Schedule test drive
                    </Button>
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="h-11">
                    <Link href={`/finance?vehicle=${vehicle.id}#prequalify`}>
                      <BadgeDollarSign /> Get pre-approved
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link href={`/sell-or-trade?vehicle=${vehicle.id}`}>
                      <Repeat /> Value my trade
                    </Link>
                  </Button>
                  <LeadDialog
                    kind="text"
                    vehicle={leadVehicle}
                    trigger={
                      <Button variant="outline" className="h-11">
                        <MessageSquare /> Text us
                      </Button>
                    }
                  />
                  <Button asChild variant="outline" className="h-11">
                    <a href={telHref(phone)}>
                      <Phone /> Call
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <SaveButton vehicleId={vehicle.id} vin={vehicle.vin} title={title} price={vehicle.displayPrice} withLabel className="ring-1 ring-border" />
              <ShareButtons title={title} />
            </div>
            <p className="mt-4 text-[11px] leading-4 text-muted-foreground">{PRICING_CONFIG.disclaimers.priceExcludes}</p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <MapPin className="size-4" aria-hidden="true" /> {vehicle.location.name}
            </h2>
            <address className="text-sm not-italic text-muted-foreground">
              {vehicle.location.address1}
              {vehicle.location.address2 ? `, ${vehicle.location.address2}` : ""}
              <br />
              {vehicle.location.city}, {vehicle.location.state} {vehicle.location.zip}
            </address>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {vehicle.location.salesHours.map((h) => (
                <li key={h.day} className="flex justify-between gap-2">
                  <span>{h.day}</span>
                  <span>{h.open ? `${formatHour(h.open)} to ${formatHour(h.close)}` : "Closed"}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${vehicle.location.latitude},${vehicle.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CarFront /> Directions
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={smsHref(smsPhone, `Question about ${title} (VIN ${vehicle.vin})`)}>
                  <MessageSquare /> Text
                </a>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="no-print mt-14">
          <h2 id="similar" className="mb-4 text-xl font-semibold">
            Similar vehicles
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {similar.slice(0, 4).map((v) => (
              <VehicleCard key={v.id} vehicle={v} finance={finance} />
            ))}
          </div>
        </section>
      )}
      <div className="mt-14">
        <RecentlyViewed currentId={vehicle.id} />
      </div>

      {!sold && <VdpMobileBar vehicle={leadVehicle} phone={phone} smsPhone={smsPhone} />}
      <JsonLd data={vehicleJsonLd(vehicle, dealer)} />
    </div>
  );
}
