import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { VehicleRowActions } from "@/components/admin/vehicle-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleImage } from "@/components/vehicle/vehicle-image";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { CONDITIONS, FUEL_TYPES, labelFor } from "@/lib/inventory/constants";
import { formatNumber, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Inventory" };

const PAGE = 50;
type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminInventoryPage({ searchParams }: Props) {
  const user = await requirePagePermission("inventory:read");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.VehicleWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { vin: { contains: q.toUpperCase() } },
              { stockNumber: { contains: q, mode: "insensitive" } },
              { make: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      sp.status ? { status: sp.status as never } : {},
      sp.condition ? { condition: sp.condition as never } : {},
      sp.fuel ? { fuelType: sp.fuel as never } : {},
      sp.demo === "only" ? { isDemo: true } : sp.demo === "hide" ? { isDemo: false } : {},
    ],
  };
  const showBase = can(user.role, "pricing:read-base");
  const [rows, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        slug: true,
        vin: true,
        stockNumber: true,
        year: true,
        make: true,
        model: true,
        trim: true,
        condition: true,
        fuelType: true,
        status: true,
        isFeatured: true,
        isDemo: true,
        mileage: true,
        images: true,
        displayPrice: true,
        displayMonthlyPayment: true,
        basePrice: showBase,
        viewCount: true,
        location: { select: { name: true } },
      },
    }),
    prisma.vehicle.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const params = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1])));
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{formatNumber(total)} vehicles</p>
        </div>
        {can(user.role, "inventory:write") && (
          <Button asChild className="bg-cta text-cta-foreground hover:bg-cta-hover">
            <Link href="/admin/inventory/new">
              <Plus /> Add vehicle
            </Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="VIN, stock #, make, model" className="pl-9" aria-label="Search inventory" />
        </div>
        <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="PENDING">Pending</option>
          <option value="SOLD">Sold</option>
        </select>
        <select name="condition" defaultValue={sp.condition ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Condition">
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="fuel" defaultValue={sp.fuel ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Fuel type">
          <option value="">All fuel types</option>
          {FUEL_TYPES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select name="demo" defaultValue={sp.demo ?? ""} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Demo vehicles">
          <option value="">Demo + real</option>
          <option value="hide">Hide demo</option>
          <option value="only">Demo only</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Condition</th>
              <th className="p-3">Price</th>
              {showBase && <th className="p-3">Base (feed)</th>}
              <th className="p-3">Mileage</th>
              <th className="p-3">Location</th>
              <th className="p-3">Views</th>
              <th className="p-3">Status / actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((v) => {
              const title = `${v.year} ${v.make} ${v.model}`;
              return (
                <tr key={v.id} className="align-middle">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {v.images[0] && <VehicleImage src={v.images[0]} alt="" fill sizes="64px" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/inventory/${v.id}`} className="font-medium hover:underline">
                          {title} {v.trim}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {v.vin} · #{v.stockNumber}
                          {v.isDemo && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-900">demo</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {labelFor(CONDITIONS, v.condition, true)}
                    <br />
                    <span className="text-xs text-muted-foreground">{labelFor(FUEL_TYPES, v.fuelType)}</span>
                  </td>
                  <td className="p-3 tabular-nums">
                    {formatPrice(Number(v.displayPrice))}
                    <br />
                    <span className="text-xs text-muted-foreground">{formatPrice(Number(v.displayMonthlyPayment))}/mo</span>
                  </td>
                  {showBase && <td className="p-3 tabular-nums text-muted-foreground">{v.basePrice ? formatPrice(Number(v.basePrice)) : "—"}</td>}
                  <td className="p-3 tabular-nums">{formatNumber(v.mileage)}</td>
                  <td className="p-3 text-muted-foreground">{v.location.name}</td>
                  <td className="p-3 tabular-nums">{formatNumber(v.viewCount)}</td>
                  <td className="p-3">
                    <VehicleRowActions
                      id={v.id}
                      title={title}
                      status={v.status}
                      isFeatured={v.isFeatured}
                      canWrite={can(user.role, "inventory:write")}
                      canDelete={can(user.role, "inventory:delete")}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No vehicles match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={qs(page - 1)} className="font-medium text-primary hover:underline">← Previous</Link> : <span />}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={qs(page + 1)} className="font-medium text-primary hover:underline">Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
