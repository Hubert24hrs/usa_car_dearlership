"use client";

import { MessageSquare, Phone, Printer, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { recentStore } from "@/lib/client-store";
import type { PublicVehicleCard } from "@/lib/inventory/public";
import type { FinanceAssumptions } from "@/lib/pricing.config";
import { smsHref, telHref } from "@/lib/site.config";
import { LeadDialog } from "./lead-dialog";
import { VehicleCard } from "./vehicle-card";

/** Records the view (analytics + "most viewed" counter + recently viewed list). */
export function ViewTracker({ id, vin, title, price, condition, fuel }: { id: string; vin: string; title: string; price: number; condition: string; fuel: string }) {
  useEffect(() => {
    recentStore.add(id);
    track({ name: "view_item", params: { vin, item_name: title, price, condition, fuel } });
    void fetch(`/api/vehicles/${id}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [id, vin, title, price, condition, fuel]);
  return null;
}

export function ShareButtons({ title }: { title: string }) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const url = window.location.href;
          try {
            if (navigator.share) await navigator.share({ title, url });
            else {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }
          } catch {
            // user cancelled
          }
        }}
      >
        <Share2 /> Share
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
    </div>
  );
}

export function RecentlyViewed({ currentId }: { currentId: string }) {
  const ids = recentStore.useList();
  const [data, setData] = useState<{ vehicles: PublicVehicleCard[]; finance: FinanceAssumptions } | null>(null);
  const others = ids.filter((id) => id !== currentId).slice(0, 4);
  const key = others.join(",");

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/vehicles?ids=${key}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json && setData(json))
      .catch(() => undefined);
    return () => controller.abort();
  }, [key]);

  if (!key || !data || data.vehicles.length === 0) return null;
  return (
    <section aria-labelledby="recently-viewed" className="no-print">
      <h2 id="recently-viewed" className="mb-4 text-xl font-semibold">
        Recently viewed
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {data.vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} finance={data.finance} showActions={false} />
        ))}
      </div>
    </section>
  );
}

/** Vehicle-specific sticky mobile CTA bar. */
export function VdpMobileBar({
  vehicle,
  phone,
  smsPhone,
}: {
  vehicle: { vehicleId: string; vin: string; title: string; price: number; locationId?: string };
  phone: string;
  smsPhone: string;
}) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-2 backdrop-blur md:hidden">
      <div className="grid grid-cols-[auto_auto_1fr] gap-2">
        <Button asChild variant="outline" size="lg" aria-label="Call us">
          <a href={telHref(phone)} onClick={() => track({ name: "click_to_call", params: { location: "vdp-bar" } })}>
            <Phone />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" aria-label="Text us">
          <a
            href={smsHref(smsPhone, `Hi! I'm interested in the ${vehicle.title} (VIN ${vehicle.vin}).`)}
            onClick={() => track({ name: "click_to_text", params: { location: "vdp-bar" } })}
          >
            <MessageSquare />
          </a>
        </Button>
        <LeadDialog kind="availability" vehicle={vehicle} buttonClassName="h-10 w-full" />
      </div>
    </div>
  );
}
