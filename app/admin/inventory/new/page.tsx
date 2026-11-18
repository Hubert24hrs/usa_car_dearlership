import type { Metadata } from "next";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Add vehicle" };

export default async function NewVehiclePage() {
  await requirePagePermission("inventory:write");
  const locations = await prisma.location.findMany({ orderBy: [{ isPrimary: "desc" }, { name: "asc" }], select: { slug: true, name: true } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add vehicle</h1>
      <VehicleForm
        showBasePricing
        locations={locations}
        initial={{
          condition: "USED",
          status: "AVAILABLE",
          body_style: "SUV",
          fuel_type: "GAS",
          drivetrain: "AWD",
          year: String(new Date().getFullYear()),
          location: locations[0]?.slug ?? "",
          features: "",
          safety_features: "",
          images: [],
          is_featured: false,
        }}
      />
    </div>
  );
}
