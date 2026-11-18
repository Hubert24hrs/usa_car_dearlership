import { BatteryCharging, Calendar, Car, Cog, Droplet, Fuel, Gauge, Palette, PlugZap, Route, Timer, Zap } from "lucide-react";
import { bodyLabel, conditionLabel, drivetrainLabel, fuelLabel, isPlugIn } from "@/lib/inventory/constants";
import type { PublicVehicleDetail } from "@/lib/inventory/public";
import { formatNumber } from "@/lib/format";

export function KeySpecs({ vehicle: v }: { vehicle: PublicVehicleDetail }) {
  const specs = [
    { icon: Calendar, label: "Year", value: String(v.year) },
    { icon: Gauge, label: "Mileage", value: `${formatNumber(v.mileage)} mi` },
    { icon: Car, label: "Body style", value: bodyLabel(v.bodyStyle) },
    { icon: Fuel, label: "Fuel type", value: fuelLabel(v.fuelType) },
    { icon: Cog, label: "Engine", value: v.engine || "N/A" },
    { icon: Cog, label: "Transmission", value: v.transmission || "N/A" },
    { icon: Route, label: "Drivetrain", value: drivetrainLabel(v.drivetrain, false) },
    { icon: Palette, label: "Exterior", value: v.exteriorColor },
    { icon: Droplet, label: "Interior", value: v.interiorColor },
    { icon: Car, label: "Condition", value: conditionLabel(v.condition) },
    { icon: Car, label: "Stock #", value: v.stockNumber },
    { icon: Car, label: "VIN", value: v.vin },
  ];
  return (
    <section aria-labelledby="key-specs" className="rounded-2xl border bg-card p-5 md:p-6">
      <h2 id="key-specs" className="mb-4 text-lg font-semibold">
        Key specs
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {specs.map((s) => (
          <div key={s.label} className="flex items-start gap-3">
            <s.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="break-words text-sm font-medium">{s.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** EV range & charging block (EVs and plug-in hybrids). */
export function EvBlock({ vehicle: v }: { vehicle: PublicVehicleDetail }) {
  if (!isPlugIn(v.fuelType)) return null;
  const isEv = v.fuelType === "ELECTRIC";
  const level2Hours = v.evBatteryKwh ? Math.ceil((v.evBatteryKwh * 0.9) / 9.6) : null; // ~40A home charger
  const items = [
    { icon: Route, label: isEv ? "EPA-est. range" : "Electric-only range", value: v.evRangeMiles ? `${v.evRangeMiles} mi` : "N/A" },
    { icon: BatteryCharging, label: "Battery", value: v.evBatteryKwh ? `${v.evBatteryKwh} kWh` : "N/A" },
    ...(isEv ? [{ icon: Zap, label: "DC fast charge (10% to 80%)", value: v.evDcFastChargeMin ? `~${v.evDcFastChargeMin} min` : "N/A" }] : []),
    { icon: Timer, label: "Level 2 home charging", value: level2Hours ? `~${level2Hours} hrs (empty to full)` : "N/A" },
    ...(isEv ? [{ icon: PlugZap, label: "Charge port", value: v.evChargePort === "NACS" ? "NACS (J3400)" : v.evChargePort === "CCS" ? "CCS1" : "N/A" }] : []),
  ];
  return (
    <section aria-labelledby="ev-specs" className="rounded-2xl border border-ev/30 bg-ev-soft p-5 md:p-6">
      <h2 id="ev-specs" className="mb-1 text-lg font-semibold">
        {isEv ? "Range & charging" : "Plug-in hybrid efficiency"}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {isEv
          ? "Real-world range varies with speed, temperature and climate use. Charging times are estimates."
          : "Drive electric for daily trips; the gas engine takes over for longer drives."}
      </p>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((s) => (
          <div key={s.label} className="rounded-xl bg-background/70 p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <s.icon className="size-3.5 text-ev-strong" aria-hidden="true" /> {s.label}
            </dt>
            <dd className="mt-1 text-base font-semibold">{s.value}</dd>
          </div>
        ))}
        {v.fuelType === "PLUG_IN_HYBRID" && v.mpgCombined && (
          <div className="rounded-xl bg-background/70 p-3">
            <dt className="text-xs text-muted-foreground">Hybrid mode</dt>
            <dd className="mt-1 text-base font-semibold">{v.mpgCombined} MPG comb.</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** MPG block for gas, diesel and hybrid vehicles. */
export function MpgBlock({ vehicle: v }: { vehicle: PublicVehicleDetail }) {
  if (v.fuelType === "ELECTRIC" || v.fuelType === "PLUG_IN_HYBRID") return null;
  if (!v.mpgCity && !v.mpgHighway && !v.mpgCombined) {
    return (
      <section className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground md:p-6">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Fuel economy</h2>
        Heavy-duty vehicles (over 8,500 lbs GVWR) are not EPA fuel-economy rated.
      </section>
    );
  }
  const rows = [
    { label: "City", value: v.mpgCity },
    { label: "Highway", value: v.mpgHighway },
    { label: "Combined", value: v.mpgCombined },
  ];
  return (
    <section aria-labelledby="mpg" className="rounded-2xl border bg-card p-5 md:p-6">
      <h2 id="mpg" className="mb-4 text-lg font-semibold">
        Fuel economy {v.fuelType === "HYBRID" && <span className="ml-1 rounded-full bg-ev-soft px-2 py-0.5 align-middle text-xs text-ev-strong">Hybrid</span>}
      </h2>
      <dl className="grid grid-cols-3 gap-3 text-center">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-muted/60 p-3">
            <dd className="font-heading text-2xl font-bold">{r.value ?? "N/A"}</dd>
            <dt className="text-xs text-muted-foreground">{r.label} MPG</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">EPA-estimated. Actual mileage will vary with options, driving conditions and habits.</p>
    </section>
  );
}
