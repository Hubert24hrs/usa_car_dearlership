"use client";

import { Bell, BellOff, Heart, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { useSavedVehicles } from "@/components/vehicle/use-saved-vehicles";
import { deleteMySavedSearch, listMySavedSearches, toggleMySavedSearchAlerts } from "@/lib/account/actions";
import type { PublicVehicleCard } from "@/lib/inventory/public";
import type { FinanceAssumptions } from "@/lib/pricing.config";

type SavedSearchRow = Awaited<ReturnType<typeof listMySavedSearches>>[number];

export function SavedView() {
  const { saved } = useSavedVehicles();
  const { status } = useSession();
  const [data, setData] = useState<{ vehicles: PublicVehicleCard[]; finance: FinanceAssumptions } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState<SavedSearchRow[] | null>(null);
  const key = saved.join(",");

  useEffect(() => {
    if (!key) {
      setData({ vehicles: [], finance: { termMonths: 72, aprPercent: 7.49 } });
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/vehicles?ids=${key}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json && setData(json))
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    if (status === "authenticated") void listMySavedSearches().then(setSearches);
  }, [status]);

  return (
    <div className="space-y-12">
      <section aria-labelledby="saved-vehicles">
        <h2 id="saved-vehicles" className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Heart className="size-5 text-cta" aria-hidden="true" /> Saved vehicles ({saved.length})
        </h2>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : data && data.vehicles.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} finance={data.finance} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="text-muted-foreground">Tap the heart on any vehicle to save it here.</p>
            <Button asChild className="mt-4 bg-cta text-cta-foreground hover:bg-cta-hover">
              <Link href="/inventory">Browse inventory</Link>
            </Button>
          </div>
        )}
        {status !== "authenticated" && saved.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Saved on this device only.{" "}
            <Link href="/account/sign-up?callbackUrl=/saved" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>{" "}
            to keep them across devices.
          </p>
        )}
      </section>

      <section aria-labelledby="saved-searches">
        <h2 id="saved-searches" className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Search className="size-5 text-cta" aria-hidden="true" /> Saved searches & alerts
        </h2>
        {status !== "authenticated" ? (
          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            <Link href="/account/sign-in?callbackUrl=/saved" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>{" "}
            to manage saved searches. Alerts you created without an account can be stopped from the link in any alert email.
          </p>
        ) : searches === null ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : searches.length === 0 ? (
          <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            No saved searches yet. Use “Save search” on the inventory page to get alerts when new matches arrive.
          </p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {searches.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link href={s.url} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Alerts {s.alertsEnabled ? `on · ${s.frequency.toLowerCase()}` : "off"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await toggleMySavedSearchAlerts(s.id, !s.alertsEnabled);
                      setSearches((list) => list?.map((x) => (x.id === s.id ? { ...x, alertsEnabled: !x.alertsEnabled } : x)) ?? null);
                    }}
                  >
                    {s.alertsEnabled ? <BellOff /> : <Bell />} {s.alertsEnabled ? "Pause alerts" : "Resume alerts"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Delete saved search ${s.name}`}
                    onClick={async () => {
                      await deleteMySavedSearch(s.id);
                      setSearches((list) => list?.filter((x) => x.id !== s.id) ?? null);
                      toast.success("Saved search deleted");
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
