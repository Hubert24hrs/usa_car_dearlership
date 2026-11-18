import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LocationsMap } from "@/components/home/locations-map";
import { PageHeader } from "@/components/layout/page-header";
import { cachedLocations } from "@/lib/inventory/cached";
import { formatHour } from "@/lib/format";
import { telHref } from "@/lib/site.config";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Locations, hours & directions",
  description: "Find a Prestige Auto Group store near you — sales and service hours, phone numbers and directions.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const locations = await cachedLocations();
  return (
    <>
      <PageHeader title="Locations & hours" crumbs={[{ name: "Locations", href: "/locations" }]} description="Visit any of our stores — or shop online and we'll deliver to you." />
      <div className="container-page space-y-12 py-12">
        <LocationsMap locations={locations} />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((l) => (
            <article key={l.id} className="rounded-2xl border bg-card p-6" aria-labelledby={`loc-${l.slug}`}>
              <h2 id={`loc-${l.slug}`} className="text-lg font-semibold">
                {l.name}
              </h2>
              <address className="mt-1 text-sm not-italic text-muted-foreground">
                {l.address1}
                {l.address2 ? `, ${l.address2}` : ""}, {l.city}, {l.state} {l.zip}
              </address>
              <a href={telHref(l.phone)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                <Phone className="size-4" aria-hidden="true" /> {l.phone}
              </a>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Sales", hours: l.salesHours },
                  { label: "Service", hours: l.serviceHours },
                ].map((group) => (
                  <div key={group.label}>
                    <h3 className="mb-1 font-semibold">{group.label}</h3>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {group.hours.map((h) => (
                        <li key={h.day} className="flex justify-between gap-2">
                          <span>{h.day}</span>
                          <span className="tabular-nums">{h.open ? `${formatHour(h.open)}–${formatHour(h.close)}` : "Closed"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <Link href={`/inventory?location=${l.slug}`} className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
                Shop this location&apos;s inventory →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
