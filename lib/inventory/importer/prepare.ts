/**
 * Pure "prepare" step of the import pipeline: validate a canonical record,
 * normalize it, APPLY PRICING MULTIPLIERS and return the exact data that will
 * be written to the database. No I/O — fully unit-tested.
 */
import type {
  BodyStyle,
  ChargePort,
  Drivetrain,
  FuelType,
  ImportSource,
  TransmissionType,
  VehicleCondition,
  VehicleStatus,
} from "@/lib/generated/prisma/enums";
import { computePricing } from "@/lib/pricing";
import type { FinanceAssumptions, PricingMultipliers } from "@/lib/pricing.config";
import { colorFamily, normalizeTransmissionType } from "../normalize";
import { buildSearchText } from "../search-text";
import { slugify, vehicleSlug } from "../slug";
import { hasValidCheckDigit } from "../vin";
import { canonicalizeRecord } from "./headers";
import { importRecordSchema, type ImportRecord } from "./schema";

export type RowError = { row: number; vin?: string; field?: string; message: string };

export type VehicleWriteData = {
  vin: string;
  stockNumber: string;
  slug: string;
  condition: VehicleCondition;
  year: number;
  make: string;
  makeSlug: string;
  model: string;
  modelSlug: string;
  trim: string;
  bodyStyle: BodyStyle;
  fuelType: FuelType;
  evRangeMiles: number | null;
  evBatteryKwh: number | null;
  evDcFastChargeMin: number | null;
  evChargePort: ChargePort | null;
  mpgCity: number | null;
  mpgHighway: number | null;
  mpgCombined: number | null;
  engine: string;
  transmission: string;
  transmissionType: TransmissionType;
  drivetrain: Drivetrain;
  mileage: number;
  exteriorColor: string;
  exteriorColorFamily: string;
  interiorColor: string;
  interiorColorFamily: string;
  features: string[];
  safetyFeatures: string[];
  description: string | null;
  basePrice: number;
  baseDownPayment: number;
  baseMonthlyPayment: number;
  displayPrice: number;
  displayDownPayment: number;
  displayMonthlyPayment: number;
  pricingMultipliers: PricingMultipliers & FinanceAssumptions;
  pricedAt: Date;
  images: string[];
  spinImages: string[];
  videoUrl: string | null;
  carfaxUrl: string | null;
  status: VehicleStatus;
  locationId: string;
  isFeatured: boolean;
  isDemo: boolean;
  source: ImportSource;
  sourceRef: string | null;
  searchText: string;
};

/** Which optional fields the record explicitly provided (drives update merging). */
export type ProvidedFields = {
  images: boolean;
  spinImages: boolean;
  description: boolean;
  videoUrl: boolean;
  carfaxUrl: boolean;
  isFeatured: boolean;
  status: boolean;
};

export type PreparedVehicle = {
  row: number;
  data: VehicleWriteData;
  provided: ProvidedFields;
  warnings: string[];
};

export type PrepareContext = {
  multipliers: PricingMultipliers;
  finance: FinanceAssumptions;
  source: ImportSource;
  sourceRef?: string | null;
  /** Resolve a location slug/id from the record; return null when unknown. */
  resolveLocationId: (ref: { location?: string; locationId?: string }) => string | null;
  now?: Date;
};

export type PrepareResult = { ok: true; vehicle: PreparedVehicle } | { ok: false; errors: RowError[] };

/** EPA-style combined MPG (55% city / 45% highway, harmonic mean). */
export function combinedMpg(city?: number, highway?: number): number | undefined {
  if (!city || !highway) return undefined;
  return Math.round(1 / (0.55 / city + 0.45 / highway));
}

export function prepareRecord(input: Record<string, unknown>, row: number, ctx: PrepareContext): PrepareResult {
  // Idempotent: accepts spec-shaped records (nested ev_specs / mpg) or already-canonical ones.
  const raw = canonicalizeRecord(input);
  const parsed = importRecordSchema.safeParse(raw);
  const vinGuess = typeof raw.vin === "string" ? raw.vin.trim().toUpperCase() : undefined;
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        row,
        vin: vinGuess,
        field: issue.path.join(".") || undefined,
        message: issue.message,
      })),
    };
  }
  const r: ImportRecord = parsed.data;
  const warnings: string[] = [];

  const locationId = ctx.resolveLocationId({ location: r.location, locationId: r.location_id });
  if (!locationId) {
    return {
      ok: false,
      errors: [{ row, vin: r.vin, field: "location", message: `Unknown location "${r.location ?? r.location_id ?? ""}"` }],
    };
  }

  if (!hasValidCheckDigit(r.vin)) warnings.push("VIN check digit does not validate (OK for non-North-American VINs)");
  if (r.condition === "NEW" && (r.mileage ?? 0) > 5000) warnings.push("New vehicle with more than 5,000 miles");

  // ── Pricing: base_* from the feed → display_* via multipliers + rounding ──
  const pricing = computePricing(
    { basePrice: r.base_price, baseDownPayment: r.base_down_payment, baseMonthlyPayment: r.base_monthly_payment },
    ctx.multipliers,
    ctx.finance,
  );

  const isElectric = r.fuel_type === "ELECTRIC";
  const hasPlug = isElectric || r.fuel_type === "PLUG_IN_HYBRID";
  const trim = r.trim ?? "";
  const exteriorColor = r.exterior_color ?? "Not specified";
  const interiorColor = r.interior_color ?? "Not specified";
  const transmission = r.transmission ?? (isElectric ? "Single-Speed Automatic" : "");

  const data: VehicleWriteData = {
    vin: r.vin,
    stockNumber: r.stock_number,
    slug: vehicleSlug({ year: r.year, make: r.make, model: r.model, trim, vin: r.vin }),
    condition: r.condition,
    year: r.year,
    make: r.make,
    makeSlug: slugify(r.make),
    model: r.model,
    modelSlug: slugify(r.model),
    trim,
    bodyStyle: r.body_style,
    fuelType: r.fuel_type,
    evRangeMiles: hasPlug ? (r.ev_range_miles ?? null) : null,
    evBatteryKwh: hasPlug ? (r.ev_battery_kwh ?? null) : null,
    evDcFastChargeMin: isElectric ? (r.ev_dc_fast_charge_min ?? null) : null,
    evChargePort: hasPlug ? (r.ev_charge_port ?? null) : null,
    mpgCity: isElectric ? null : (r.mpg_city ?? null),
    mpgHighway: isElectric ? null : (r.mpg_highway ?? null),
    mpgCombined: isElectric ? null : (r.mpg_combined ?? combinedMpg(r.mpg_city, r.mpg_highway) ?? null),
    engine: r.engine ?? (isElectric ? "Electric motor" : ""),
    transmission,
    transmissionType: normalizeTransmissionType(transmission, r.fuel_type),
    drivetrain: r.drivetrain,
    mileage: r.mileage ?? 0,
    exteriorColor,
    exteriorColorFamily: colorFamily(exteriorColor),
    interiorColor,
    interiorColorFamily: colorFamily(interiorColor),
    features: r.features,
    safetyFeatures: r.safety_features,
    description: r.description ?? null,
    ...pricing,
    pricingMultipliers: { ...ctx.multipliers, ...ctx.finance },
    pricedAt: ctx.now ?? new Date(),
    images: r.images,
    spinImages: r.spin_images,
    videoUrl: r.video_url ?? null,
    carfaxUrl: r.carfax_url ?? null,
    status: r.status ?? "AVAILABLE",
    locationId,
    isFeatured: r.is_featured ?? false,
    isDemo: r.is_demo ?? false,
    source: ctx.source,
    sourceRef: ctx.sourceRef ?? null,
    searchText: buildSearchText({
      year: r.year,
      make: r.make,
      model: r.model,
      trim,
      condition: r.condition,
      bodyStyle: r.body_style,
      fuelType: r.fuel_type,
      drivetrain: r.drivetrain,
      exteriorColor,
      interiorColor,
      engine: r.engine,
      transmission,
      stockNumber: r.stock_number,
      vin: r.vin,
      features: r.features,
    }),
  };

  return {
    ok: true,
    vehicle: {
      row,
      data,
      warnings,
      provided: {
        images: r.images.length > 0,
        spinImages: r.spin_images.length > 0,
        description: r.description !== undefined,
        videoUrl: r.video_url !== undefined,
        carfaxUrl: r.carfax_url !== undefined,
        isFeatured: r.is_featured !== undefined,
        status: r.status !== undefined,
      },
    },
  };
}

export type PrepareBatchResult = {
  vehicles: PreparedVehicle[];
  errors: RowError[];
  duplicates: RowError[];
};

/**
 * Prepare many records. Duplicate VINs within one batch keep the LAST
 * occurrence (feeds append corrections) and are reported.
 */
export function prepareRecords(records: Record<string, unknown>[], ctx: PrepareContext, firstRow = 1): PrepareBatchResult {
  const byVin = new Map<string, PreparedVehicle>();
  const errors: RowError[] = [];
  const duplicates: RowError[] = [];
  records.forEach((record, index) => {
    const row = firstRow + index;
    const result = prepareRecord(record, row, ctx);
    if (!result.ok) {
      errors.push(...result.errors);
      return;
    }
    const existing = byVin.get(result.vehicle.data.vin);
    if (existing) {
      duplicates.push({
        row: existing.row,
        vin: existing.data.vin,
        message: `Duplicate VIN: row ${existing.row} superseded by row ${row}`,
      });
    }
    byVin.set(result.vehicle.data.vin, result.vehicle);
  });
  return { vehicles: [...byVin.values()], errors, duplicates };
}
