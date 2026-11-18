import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { cachedFinanceAssumptions } from "@/lib/inventory/cached";
import { publicVehicleCardSelect, toPublicCard } from "@/lib/inventory/public";
import { visibilityWhere } from "@/lib/inventory/query";
import { shouldShowDemoInventory } from "@/lib/settings";

/** Server-rendered grid of vehicles matching an extra where-clause (landing pages). */
export async function VehicleRail({
  where,
  orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }],
  take = 8,
}: {
  where: Prisma.VehicleWhereInput;
  orderBy?: Prisma.VehicleOrderByWithRelationInput[];
  take?: number;
}) {
  const [rows, finance] = await Promise.all([
    prisma.vehicle.findMany({
      where: { AND: [visibilityWhere(shouldShowDemoInventory()), where] },
      orderBy,
      take,
      select: publicVehicleCardSelect,
    }),
    cachedFinanceAssumptions(),
  ]);
  if (rows.length === 0) return <p className="text-muted-foreground">No vehicles available right now — check back soon.</p>;
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map((row) => (
        <VehicleCard key={row.id} vehicle={toPublicCard(row)} finance={finance} />
      ))}
    </div>
  );
}
