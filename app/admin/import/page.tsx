import type { Metadata } from "next";
import { ImportForm } from "@/components/admin/import-form";
import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Import inventory" };

const SAMPLE_COLUMNS =
  "vin, stock_number, condition, year, make, model, trim, body_style, fuel_type, ev_range_miles, ev_battery_kwh, ev_dc_fast_charge_min, ev_charge_port, mpg_city, mpg_highway, mpg_combined, engine, transmission, drivetrain, mileage, exterior_color, interior_color, features (| separated), safety_features, base_price, base_down_payment, base_monthly_payment, images (| separated URLs), video_url, carfax_url, status, location (slug), is_featured";

export default async function ImportPage() {
  await requirePagePermission("inventory:import");
  const jobs = await prisma.importJob.findMany({ orderBy: { startedAt: "desc" }, take: 25 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import inventory</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Upload a CSV or JSON export of the dealership&apos;s own inventory. Pricing multipliers are applied automatically at import
          time (base_* → display_*). Existing vehicles are matched by VIN and updated.
        </p>
      </div>
      <ImportForm />
      <details className="rounded-2xl border bg-card p-5 text-sm">
        <summary className="cursor-pointer font-semibold">Accepted columns & JSON shape</summary>
        <p className="mt-3 text-muted-foreground">CSV headers (common aliases like “Stock #”, “Selling Price”, “Miles”, “Ext Color” are recognized):</p>
        <p className="mt-2 rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{SAMPLE_COLUMNS}</p>
        <p className="mt-3 text-muted-foreground">JSON: an array (or {"{ \"vehicles\": [...] }"}) using the same keys; nested ev_specs and mpg objects are supported.</p>
      </details>
      <section className="rounded-2xl border bg-card">
        <h2 className="border-b p-4 font-semibold">Import history</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Source</th>
                <th className="p-3">File / feed</th>
                <th className="p-3">Status</th>
                <th className="p-3">Rows</th>
                <th className="p-3">Created</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Failed</th>
                <th className="p-3">Sold</th>
                <th className="p-3">By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="p-3 whitespace-nowrap">{formatDate(j.startedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="p-3">
                    {j.source}
                    {j.dryRun && " (dry run)"}
                  </td>
                  <td className="max-w-56 truncate p-3" title={j.fileName ?? ""}>
                    {j.fileName ?? "—"}
                  </td>
                  <td className="p-3">{j.status}</td>
                  <td className="p-3 tabular-nums">{j.totalRows}</td>
                  <td className="p-3 tabular-nums">{j.created}</td>
                  <td className="p-3 tabular-nums">{j.updated}</td>
                  <td className="p-3 tabular-nums">{j.failed}</td>
                  <td className="p-3 tabular-nums">{j.markedSold}</td>
                  <td className="p-3 text-muted-foreground">{j.triggeredBy ?? "—"}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-muted-foreground">
                    No imports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
