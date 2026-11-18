import { Check, Columns3, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { LeadDialog } from "@/components/vehicle/lead-dialog";
import { VehicleImage } from "@/components/vehicle/vehicle-image";
import { cachedFinanceAssumptions } from "@/lib/inventory/cached";
import { bodyLabel, conditionLabel, drivetrainLabel, fuelLabel, POPULAR_FEATURES } from "@/lib/inventory/constants";
import type { PublicVehicleDetail } from "@/lib/inventory/public";
import { getVehiclesForCompare } from "@/lib/inventory/vehicles";
import { formatNumber, formatPrice, vehicleTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RemoveFromCompare, SyncCompareList } from "./compare-actions";

export const metadata: Metadata = { title: "Compare vehicles", robots: { index: false } };

type Props = { searchParams: Promise<{ ids?: string }> };
type Row = { label: string; value: (v: PublicVehicleDetail) => string | number | null; best?: "min" | "max" };

const ROWS: Row[] = [
  { label: "Price", value: (v) => v.displayPrice, best: "min" },
  { label: "Est. monthly payment", value: (v) => v.displayMonthlyPayment, best: "min" },
  { label: "Down payment", value: (v) => v.displayDownPayment },
  { label: "Condition", value: (v) => conditionLabel(v.condition) },
  { label: "Year", value: (v) => v.year, best: "max" },
  { label: "Mileage", value: (v) => v.mileage, best: "min" },
  { label: "Body style", value: (v) => bodyLabel(v.bodyStyle) },
  { label: "Fuel type", value: (v) => fuelLabel(v.fuelType) },
  { label: "EV range (mi)", value: (v) => v.evRangeMiles, best: "max" },
  { label: "Combined MPG", value: (v) => v.mpgCombined, best: "max" },
  { label: "Engine", value: (v) => v.engine || null },
  { label: "Transmission", value: (v) => v.transmission || null },
  { label: "Drivetrain", value: (v) => drivetrainLabel(v.drivetrain, false) },
  { label: "Exterior", value: (v) => v.exteriorColor },
  { label: "Interior", value: (v) => v.interiorColor },
  { label: "Location", value: (v) => `${v.location.city}, ${v.location.state}` },
];

const MONEY = new Set(["Price", "Est. monthly payment", "Down payment"]);

function display(row: Row, v: PublicVehicleDetail) {
  const value = row.value(v);
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    if (MONEY.has(row.label)) return formatPrice(value);
    if (row.label === "Mileage") return `${formatNumber(value)} mi`;
    return String(value);
  }
  return value;
}

export default async function ComparePage({ searchParams }: Props) {
  const { ids: raw } = await searchParams;
  const ids = (raw ?? "").split(",").filter((id) => z.uuid().safeParse(id).success).slice(0, 4);
  const [vehicles, finance] = await Promise.all([getVehiclesForCompare(ids), cachedFinanceAssumptions()]);
  const shownIds = vehicles.map((v) => v.id);

  const bestIndex = (row: Row) => {
    if (!row.best || vehicles.length < 2) return -1;
    const values = vehicles.map((v) => row.value(v));
    const nums = values.map((x) => (typeof x === "number" ? x : null));
    const valid = nums.filter((x): x is number => x !== null);
    if (valid.length < 2) return -1;
    const target = row.best === "min" ? Math.min(...valid) : Math.max(...valid);
    return nums.indexOf(target);
  };

  return (
    <>
      <PageHeader title="Compare vehicles" crumbs={[{ name: "Compare", href: "/compare" }]} description="Side-by-side specs, pricing and features for up to 4 vehicles." />
      <SyncCompareList ids={shownIds} />
      <div className="container-page py-10">
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <Columns3 className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-4 text-muted-foreground">Select “Compare” on up to 4 vehicles to see them side by side.</p>
            <Button asChild className="mt-4 bg-cta text-cta-foreground hover:bg-cta-hover">
              <Link href="/inventory">Browse inventory</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <caption className="sr-only">Vehicle comparison</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-44 p-4 text-left align-bottom text-muted-foreground">
                    {vehicles.length < 4 && (
                      <Link href="/inventory" className="text-sm font-semibold text-primary hover:underline">
                        + Add a vehicle
                      </Link>
                    )}
                  </th>
                  {vehicles.map((v) => (
                    <th key={v.id} scope="col" className="relative p-4 text-left align-top font-normal">
                      <RemoveFromCompare id={v.id} ids={shownIds} title={vehicleTitle(v)} />
                      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                        {v.images[0] && <VehicleImage src={v.images[0]} alt={vehicleTitle(v)} fill sizes="240px" />}
                      </div>
                      <Link href={`/inventory/${v.slug}`} className="font-semibold hover:underline">
                        {v.year} {v.make} {v.model}
                      </Link>
                      <p className="text-xs text-muted-foreground">{v.trim}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const best = bestIndex(row);
                  return (
                    <tr key={row.label} className="border-t">
                      <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                        {row.label}
                      </th>
                      {vehicles.map((v, i) => (
                        <td key={v.id} className={cn("p-4", i === best && "font-semibold text-ev-strong")}>
                          {display(row, v)}
                          {i === best && <span className="sr-only"> (best)</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {POPULAR_FEATURES.slice(0, 12).map((feature) => (
                  <tr key={feature} className="border-t">
                    <th scope="row" className="p-4 text-left font-medium text-muted-foreground">
                      {feature}
                    </th>
                    {vehicles.map((v) => (
                      <td key={v.id} className="p-4">
                        {v.features.includes(feature) ? (
                          <Check className="size-4 text-ev-strong" aria-label="Yes" />
                        ) : (
                          <Minus className="size-4 text-muted-foreground" aria-label="No" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t">
                  <th scope="row" className="p-4" />
                  {vehicles.map((v) => (
                    <td key={v.id} className="p-4">
                      <LeadDialog kind="availability" vehicle={{ vehicleId: v.id, vin: v.vin, title: vehicleTitle(v), price: v.displayPrice }} buttonClassName="w-full" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="border-t p-4 text-xs text-muted-foreground">
              Est. payments: {finance.termMonths} mo at {finance.aprPercent}% APR with the down payment shown, with approved credit. Taxes & fees extra.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
