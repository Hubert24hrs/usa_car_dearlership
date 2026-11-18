/**
 * Builds the denormalized `search_text` column used by Postgres full-text
 * search, including common synonyms shoppers type ("ev", "4x4", "cpo"…).
 */
import type { BodyStyle, Drivetrain, FuelType, VehicleCondition } from "@/lib/generated/prisma/enums";
import { bodyLabel, conditionLabel, drivetrainLabel, fuelLabel } from "./constants";

const FUEL_SYNONYMS: Record<FuelType, string> = {
  ELECTRIC: "ev bev electric battery electric zero emission",
  HYBRID: "hybrid hev",
  PLUG_IN_HYBRID: "phev plug-in plugin hybrid",
  GAS: "gas gasoline",
  DIESEL: "diesel",
};

const CONDITION_SYNONYMS: Record<VehicleCondition, string> = {
  NEW: "new",
  USED: "used pre-owned preowned",
  CPO: "certified cpo pre-owned preowned used",
};

const DRIVE_SYNONYMS: Record<Drivetrain, string> = {
  AWD: "awd all-wheel all wheel drive",
  FOUR_WD: "4wd 4x4 four-wheel four wheel drive",
  FWD: "fwd front-wheel",
  RWD: "rwd rear-wheel",
};

const BODY_SYNONYMS: Partial<Record<BodyStyle, string>> = {
  TRUCK: "truck pickup",
  VAN: "van minivan",
  SUV: "suv sport utility",
  CONVERTIBLE: "convertible cabriolet",
};

export function buildSearchText(v: {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  condition: VehicleCondition;
  bodyStyle: BodyStyle;
  fuelType: FuelType;
  drivetrain: Drivetrain;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  engine?: string | null;
  transmission?: string | null;
  stockNumber: string;
  vin: string;
  features?: string[];
}): string {
  return [
    v.year,
    v.make,
    v.model,
    v.trim,
    conditionLabel(v.condition),
    CONDITION_SYNONYMS[v.condition],
    bodyLabel(v.bodyStyle),
    BODY_SYNONYMS[v.bodyStyle],
    fuelLabel(v.fuelType),
    FUEL_SYNONYMS[v.fuelType],
    drivetrainLabel(v.drivetrain),
    DRIVE_SYNONYMS[v.drivetrain],
    v.exteriorColor,
    v.interiorColor,
    v.engine,
    v.transmission,
    v.stockNumber,
    v.vin,
    ...(v.features ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
