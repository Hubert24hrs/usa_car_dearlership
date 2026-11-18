import { BatteryCharging, Fuel, Gauge, MapPin } from "lucide-react";
import Link from "next/link";
import { drivetrainLabel } from "@/lib/inventory/constants";
import type { PublicVehicleCard } from "@/lib/inventory/public";
import { formatCompactMileage, formatMileage, vehicleTitle } from "@/lib/format";
import type { FinanceAssumptions } from "@/lib/pricing.config";
import { cn } from "@/lib/utils";
import { ConditionBadge, FeaturedBadge, FuelBadge, StatusBadge } from "./badges";
import { CardImageCarousel } from "./card-image-carousel";
import { CompareToggle } from "./compare-toggle";
import { LeadDialog } from "./lead-dialog";
import { PriceDisplay } from "./price-display";
import { SaveButton } from "./save-button";

/**
 * Inventory card. Safe to render from server or client components (no hooks;
 * interactive pieces are client islands).
 */
export function VehicleCard({
  vehicle,
  finance,
  priority = false,
  view = "grid",
  showActions = true,
}: {
  vehicle: PublicVehicleCard;
  finance: FinanceAssumptions;
  priority?: boolean;
  view?: "grid" | "list";
  showActions?: boolean;
}) {
  const href = `/inventory/${vehicle.slug}`;
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const fullTitle = vehicleTitle(vehicle);
  const isList = view === "list";
  const efficiency =
    vehicle.fuelType === "ELECTRIC" && vehicle.evRangeMiles
      ? { icon: BatteryCharging, text: `${vehicle.evRangeMiles} mi range` }
      : vehicle.mpgCombined
        ? { icon: Fuel, text: `${vehicle.mpgCombined} MPG comb.` }
        : null;

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift",
        isList ? "flex-col sm:flex-row" : "flex-col",
      )}
      aria-labelledby={`vehicle-${vehicle.id}-title`}
    >
      <div className={cn("relative", isList && "sm:w-80 sm:shrink-0")}>
        <CardImageCarousel
          images={vehicle.images}
          alt={fullTitle}
          href={href}
          priority={priority}
          sizes={isList ? "(min-width: 640px) 320px, 100vw" : undefined}
        />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ConditionBadge condition={vehicle.condition} />
          <FuelBadge fuel={vehicle.fuelType} />
          <StatusBadge status={vehicle.status} />
        </div>
        {vehicle.isFeatured && <FeaturedBadge className="pointer-events-none absolute bottom-3 left-3" />}
        <SaveButton
          vehicleId={vehicle.id}
          vin={vehicle.vin}
          title={fullTitle}
          price={vehicle.displayPrice}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 id={`vehicle-${vehicle.id}-title`} className="text-base font-semibold leading-snug">
            <Link href={href} className="hover:underline focus-visible:underline">
              {title}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">{vehicle.trim || " "}</p>
        </div>

        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1">
            <Gauge className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Mileage: </span>
            {vehicle.condition === "NEW" ? formatMileage(vehicle.mileage) : formatCompactMileage(vehicle.mileage)}
          </li>
          {efficiency && (
            <li className="inline-flex items-center gap-1">
              <efficiency.icon className="size-3.5" aria-hidden="true" />
              {efficiency.text}
            </li>
          )}
          <li>{drivetrainLabel(vehicle.drivetrain)}</li>
          <li className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {vehicle.location.city}, {vehicle.location.state}
          </li>
        </ul>

        <PriceDisplay
          price={vehicle.displayPrice}
          monthly={vehicle.displayMonthlyPayment}
          down={vehicle.displayDownPayment}
          finance={finance}
          className="mt-auto"
        />

        {showActions && (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <CompareToggle vehicleId={vehicle.id} title={fullTitle} />
            <LeadDialog
              kind="availability"
              vehicle={{ vehicleId: vehicle.id, vin: vehicle.vin, title: fullTitle, price: vehicle.displayPrice }}
              buttonClassName="h-9"
            />
          </div>
        )}
      </div>
    </article>
  );
}
