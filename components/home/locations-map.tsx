"use client";

import { MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicLocation } from "@/lib/inventory/vehicles";
import { formatHour } from "@/lib/format";
import { telHref } from "@/lib/site.config";
import { cn } from "@/lib/utils";

/**
 * Store finder with a click-to-load OpenStreetMap embed (no third-party
 * requests or cookies until the visitor asks for the map).
 */
export function LocationsMap({ locations }: { locations: PublicLocation[] }) {
  const [selected, setSelected] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const loc = locations[selected];
  if (!loc) return null;
  const d = 0.02;
  const bbox = `${loc.longitude - d},${loc.latitude - d},${loc.longitude + d},${loc.latitude + d}`;
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
  const todayHours = loc.salesHours.find((h) => h.day === today);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ul className="space-y-3" aria-label="Locations">
        {locations.map((l, i) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              className={cn(
                "w-full rounded-2xl border bg-card p-4 text-left transition hover:shadow-soft",
                selected === i && "border-primary ring-1 ring-primary",
              )}
            >
              <p className="font-semibold">{l.name}</p>
              <p className="text-sm text-muted-foreground">
                {l.address1}, {l.city}, {l.state} {l.zip}
              </p>
              <p className="mt-1 text-sm">{l.phone}</p>
            </button>
          </li>
        ))}
      </ul>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="relative aspect-[16/9] bg-[radial-gradient(circle_at_30%_30%,#dbe7f5,transparent_60%),linear-gradient(135deg,#eef2f7,#e3e9f2)] dark:bg-[linear-gradient(135deg,#111c30,#0a1220)]">
          {showMap ? (
            <iframe
              title={`Map of ${loc.name}`}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${loc.latitude}%2C${loc.longitude}`}
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <MapPin className="size-10 text-cta" aria-hidden="true" />
              <p className="max-w-sm text-sm text-muted-foreground">
                {loc.address1}, {loc.city}, {loc.state}
              </p>
              <Button variant="outline" onClick={() => setShowMap(true)}>
                Show interactive map
              </Button>
              <p className="text-[11px] text-muted-foreground">Loads OpenStreetMap (© OpenStreetMap contributors)</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm">
            <p className="font-semibold">{loc.name}</p>
            <p className="text-muted-foreground">
              Today: {todayHours?.open ? `${formatHour(todayHours.open)} to ${formatHour(todayHours.close)}` : "Closed"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={telHref(loc.phone)}>Call</a>
            </Button>
            <Button asChild size="sm" className="bg-cta text-cta-foreground hover:bg-cta-hover">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation /> Directions
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
