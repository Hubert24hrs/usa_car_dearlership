import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requirePagePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePagePermission("inventory:read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [v, locations] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id }, include: { location: { select: { slug: true } } } }),
    prisma.location.findMany({ orderBy: [{ isPrimary: "desc" }, { name: "asc" }], select: { slug: true, name: true } }),
  ]);
  if (!v) notFound();
  const showBase = can(user.role, "pricing:read-base");
  const s = (n: unknown) => (n === null || n === undefined ? "" : String(n));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {v.year} {v.make} {v.model} {v.trim}
          </h1>
          <p className="text-sm text-muted-foreground">
            Public price {formatPrice(Number(v.displayPrice))} · {formatPrice(Number(v.displayMonthlyPayment))}/mo · {formatPrice(Number(v.displayDownPayment))} down
            {v.pricedAt && ` · priced ${formatDate(v.pricedAt)}`}
            {showBase && ` · base ${formatPrice(Number(v.basePrice))}`}
          </p>
        </div>
        <Link href={`/inventory/${v.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          View public page <ExternalLink className="size-4" />
        </Link>
      </div>
      {can(user.role, "inventory:write") ? (
        <VehicleForm
          vehicleId={v.id}
          showBasePricing={showBase}
          locations={locations}
          initial={{
            vin: v.vin,
            stock_number: v.stockNumber,
            condition: v.condition,
            status: v.status,
            year: s(v.year),
            make: v.make,
            model: v.model,
            trim: v.trim,
            body_style: v.bodyStyle,
            fuel_type: v.fuelType,
            drivetrain: v.drivetrain,
            location: v.location.slug,
            mileage: s(v.mileage),
            engine: v.engine,
            transmission: v.transmission,
            exterior_color: v.exteriorColor,
            interior_color: v.interiorColor,
            mpg_city: s(v.mpgCity),
            mpg_highway: s(v.mpgHighway),
            mpg_combined: s(v.mpgCombined),
            ev_range_miles: s(v.evRangeMiles),
            ev_battery_kwh: s(v.evBatteryKwh),
            ev_dc_fast_charge_min: s(v.evDcFastChargeMin),
            ev_charge_port: s(v.evChargePort),
            base_price: showBase ? s(v.basePrice) : "",
            base_down_payment: showBase ? s(v.baseDownPayment) : "",
            base_monthly_payment: showBase ? s(v.baseMonthlyPayment) : "",
            features: v.features.join("\n"),
            safety_features: v.safetyFeatures.join("\n"),
            description: s(v.description),
            video_url: s(v.videoUrl),
            carfax_url: s(v.carfaxUrl),
            images: v.images,
            is_featured: v.isFeatured,
          }}
        />
      ) : (
        <p className="rounded-xl bg-muted p-4 text-sm">Your role has read-only access to inventory.</p>
      )}
    </div>
  );
}
