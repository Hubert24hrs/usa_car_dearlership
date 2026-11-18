import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BarList, DailyColumns, StatTile } from "@/components/admin/charts";
import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { BODY_STYLES, CONDITIONS, FUEL_TYPES, labelFor } from "@/lib/inventory/constants";
import { LEAD_TYPE_LABELS } from "@/lib/leads/schema";
import { formatDate, formatNumber, formatPrice, vehicleTitle } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function AdminDashboard({ searchParams }: Props) {
  await requirePagePermission("analytics:read");
  const { denied } = await searchParams;
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since14 = new Date(Date.now() - 13 * 86_400_000);
  since14.setHours(0, 0, 0, 0);

  const [total, byStatus, byFuel, byBody, byCondition, priceAgg, leads30, leadsByType, leadsNew, recentLeadRows, topViewed, imports] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["fuelType"], where: { status: { not: "SOLD" } }, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["bodyStyle"], where: { status: { not: "SOLD" } }, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["condition"], where: { status: { not: "SOLD" } }, _count: { _all: true } }),
    prisma.vehicle.aggregate({ where: { status: { not: "SOLD" } }, _avg: { displayPrice: true, mileage: true } }),
    prisma.lead.count({ where: { createdAt: { gte: since30 } } }),
    prisma.lead.groupBy({ by: ["type"], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    prisma.vehicle.findMany({
      where: { status: { not: "SOLD" } },
      orderBy: { viewCount: "desc" },
      take: 8,
      select: { id: true, slug: true, year: true, make: true, model: true, trim: true, viewCount: true, displayPrice: true },
    }),
    prisma.importJob.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
  ]);

  const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(since14.getTime() + i * 86_400_000);
    const key = day.toDateString();
    return {
      date: formatDate(day, { month: "short", day: "numeric" }),
      value: recentLeadRows.filter((l) => l.createdAt.toDateString() === key).length,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Inventory health, lead flow and what shoppers are viewing.</p>
      </div>
      {denied && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          <AlertCircle className="size-4" /> Your role doesn&apos;t have access to that page.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Vehicles in stock" value={formatNumber((status.AVAILABLE ?? 0) + (status.PENDING ?? 0))} hint={`${formatNumber(status.PENDING ?? 0)} pending · ${formatNumber(status.SOLD ?? 0)} sold · ${formatNumber(total)} total`} />
        <StatTile label="Average listed price" value={priceAgg._avg.displayPrice ? formatPrice(Number(priceAgg._avg.displayPrice)) : "N/A"} hint={priceAgg._avg.mileage ? `Avg. ${formatNumber(Math.round(priceAgg._avg.mileage))} mi` : undefined} />
        <StatTile label="Leads (30 days)" value={formatNumber(leads30)} hint={`${formatNumber(leadsNew)} awaiting first contact`} />
        <StatTile label="Most viewed" value={topViewed[0] ? `${formatNumber(topViewed[0].viewCount)} views` : "No views yet"} hint={topViewed[0] ? vehicleTitle(topViewed[0]) : undefined} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <DailyColumns title="Leads per day, last 14 days" days={days} />
        <BarList
          title="Leads by type, last 30 days"
          rows={leadsByType.map((l) => ({ label: LEAD_TYPE_LABELS[l.type], value: l._count._all })).sort((a, b) => b.value - a.value)}
        />
        <BarList
          title="In-stock inventory by fuel type"
          rows={byFuel.map((r) => ({ label: labelFor(FUEL_TYPES, r.fuelType), value: r._count._all })).sort((a, b) => b.value - a.value)}
        />
        <BarList
          title="In-stock inventory by body style"
          rows={byBody.map((r) => ({ label: labelFor(BODY_STYLES, r.bodyStyle), value: r._count._all })).sort((a, b) => b.value - a.value)}
        />
        <BarList
          title="In-stock inventory by condition"
          rows={byCondition.map((r) => ({ label: labelFor(CONDITIONS, r.condition), value: r._count._all })).sort((a, b) => b.value - a.value)}
        />
        <section className="rounded-2xl border bg-card p-5" aria-labelledby="top-viewed">
          <h2 id="top-viewed" className="mb-3 text-sm font-semibold">
            Most viewed vehicles
          </h2>
          <ol className="space-y-2 text-sm">
            {topViewed.map((v) => (
              <li key={v.id} className="flex justify-between gap-3">
                <Link href={`/inventory/${v.slug}`} className="truncate hover:underline" target="_blank">
                  {vehicleTitle(v)}
                </Link>
                <span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(v.viewCount)} views</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="rounded-2xl border bg-card p-5" aria-labelledby="recent-imports">
        <h2 id="recent-imports" className="mb-3 text-sm font-semibold">
          Recent imports & feed syncs
        </h2>
        <ul className="divide-y text-sm">
          {imports.map((job) => (
            <li key={job.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                {job.source} · {job.fileName ?? "N/A"} {job.dryRun && "(dry run)"}
              </span>
              <span className="text-muted-foreground">
                {job.status} · {job.created} new · {job.updated} updated · {job.failed} failed · {formatDate(job.startedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </li>
          ))}
          {imports.length === 0 && <li className="py-2 text-muted-foreground">No imports yet.</li>}
        </ul>
      </section>
    </div>
  );
}
