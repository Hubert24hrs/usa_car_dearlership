import type { Metadata } from "next";
import { LocationForm, type LocationValues } from "@/components/admin/location-form";

import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Locations" };

// Defined here (not imported from the client module) so the server can read it.
const EMPTY_HOURS: LocationValues["salesHours"] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
  day,
  open: "09:00",
  close: "18:00",
}));

export default async function AdminLocationsPage() {
  await requirePagePermission("settings:write");
  const locations = await prisma.location.findMany({ orderBy: [{ isPrimary: "desc" }, { name: "asc" }] });
  const toValues = (l: (typeof locations)[number]): LocationValues => ({
    name: l.name,
    slug: l.slug,
    address1: l.address1,
    address2: l.address2 ?? "",
    city: l.city,
    state: l.state,
    zip: l.zip,
    phone: l.phone,
    smsPhone: l.smsPhone ?? "",
    email: l.email ?? "",
    latitude: l.latitude,
    longitude: l.longitude,
    salesHours: l.salesHours as LocationValues["salesHours"],
    serviceHours: l.serviceHours as LocationValues["serviceHours"],
    isPrimary: l.isPrimary,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Locations</h1>
        <p className="text-sm text-muted-foreground">Stores, hours and contact numbers shown across the site, maps and structured data.</p>
      </div>
      {locations.map((l) => (
        <div key={l.id} className="space-y-2">
          <h2 className="font-semibold">
            {l.name} {l.isDemo && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">demo — replace with real details</span>}
          </h2>
          <LocationForm id={l.id} initial={toValues(l)} />
        </div>
      ))}
      <div className="space-y-2">
        <h2 className="font-semibold">Add a location</h2>
        <LocationForm
          initial={{
            name: "",
            slug: "",
            address1: "",
            address2: "",
            city: "",
            state: "",
            zip: "",
            phone: "",
            smsPhone: "",
            email: "",
            latitude: 0,
            longitude: 0,
            salesHours: EMPTY_HOURS,
            serviceHours: EMPTY_HOURS,
            isPrimary: locations.length === 0,
          }}
        />
      </div>
    </div>
  );
}
