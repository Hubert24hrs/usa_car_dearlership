/**
 * Translate InventoryFilters into Prisma where/orderBy clauses.
 */
import type { Prisma } from "@/lib/generated/prisma/client";
import type { SortKey } from "./constants";
import type { InventoryFilters } from "./filters";

export type FacetKey =
  | "condition"
  | "make"
  | "model"
  | "trim"
  | "fuel"
  | "body"
  | "drivetrain"
  | "transmission"
  | "extColor"
  | "intColor"
  | "feature"
  | "location"
  | "year"
  | "price"
  | "monthly"
  | "mileage"
  | "range"
  | "mpg";

export const RANGE_FACETS: FacetKey[] = ["year", "price", "monthly", "mileage", "range", "mpg"];

export type WhereOptions = {
  includeDemo: boolean;
  /** Facets to leave out (disjunctive facet counts). */
  omit?: FacetKey[];
  /** Restrict to these ids (keyword search matches). */
  ids?: string[];
};

/** Publicly listable vehicles: available or sale-pending. Sold units are hidden from search. */
export function visibilityWhere(includeDemo: boolean): Prisma.VehicleWhereInput {
  return includeDemo
    ? { status: { in: ["AVAILABLE", "PENDING"] } }
    : { status: { in: ["AVAILABLE", "PENDING"] }, isDemo: false };
}

function between(min?: number, max?: number) {
  if (min === undefined && max === undefined) return undefined;
  return { ...(min !== undefined ? { gte: min } : {}), ...(max !== undefined ? { lte: max } : {}) };
}

export function buildVehicleWhere(f: InventoryFilters, opts: WhereOptions): Prisma.VehicleWhereInput {
  const omit = new Set(opts.omit ?? []);
  const use = (key: FacetKey) => !omit.has(key);
  const and: Prisma.VehicleWhereInput[] = [visibilityWhere(opts.includeDemo)];

  if (opts.ids) and.push({ id: { in: opts.ids } });
  if (use("condition") && f.condition.length) and.push({ condition: { in: f.condition } });
  if (use("make") && f.make.length) and.push({ makeSlug: { in: f.make } });
  if (use("model") && f.model.length) and.push({ modelSlug: { in: f.model } });
  if (use("trim") && f.trim.length) and.push({ trim: { in: f.trim } });
  if (use("fuel") && f.fuel.length) and.push({ fuelType: { in: f.fuel } });
  if (use("body") && f.body.length) and.push({ bodyStyle: { in: f.body } });
  if (use("drivetrain") && f.drivetrain.length) and.push({ drivetrain: { in: f.drivetrain } });
  if (use("transmission") && f.transmission.length) and.push({ transmissionType: { in: f.transmission } });
  if (use("extColor") && f.extColor.length) and.push({ exteriorColorFamily: { in: f.extColor } });
  if (use("intColor") && f.intColor.length) and.push({ interiorColorFamily: { in: f.intColor } });
  if (use("feature") && f.feature.length) and.push({ features: { hasEvery: f.feature } });
  if (use("location") && f.location.length) and.push({ location: { slug: { in: f.location } } });

  const year = use("year") ? between(f.yearMin, f.yearMax) : undefined;
  if (year) and.push({ year });
  const price = use("price") ? between(f.priceMin, f.priceMax) : undefined;
  if (price) and.push({ displayPrice: price });
  const monthly = use("monthly") ? between(f.monthlyMin, f.monthlyMax) : undefined;
  if (monthly) and.push({ displayMonthlyPayment: monthly });
  if (use("mileage") && f.mileageMax !== undefined) and.push({ mileage: { lte: f.mileageMax } });
  if (use("range") && f.rangeMin !== undefined) and.push({ evRangeMiles: { gte: f.rangeMin } });
  if (use("mpg") && f.mpgMin !== undefined) and.push({ mpgCombined: { gte: f.mpgMin } });

  return { AND: and };
}

export function buildOrderBy(sort: SortKey): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "price_asc":
      return [{ displayPrice: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ displayPrice: "desc" }, { id: "asc" }];
    case "monthly_asc":
      return [{ displayMonthlyPayment: "asc" }, { id: "asc" }];
    case "year_desc":
      return [{ year: "desc" }, { createdAt: "desc" }, { id: "asc" }];
    case "year_asc":
      return [{ year: "asc" }, { createdAt: "desc" }, { id: "asc" }];
    case "mileage_asc":
      return [{ mileage: "asc" }, { id: "asc" }];
    case "range_desc":
      return [{ evRangeMiles: { sort: "desc", nulls: "last" } }, { displayPrice: "asc" }, { id: "asc" }];
    case "featured":
    case "relevance":
    default:
      return [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  }
}
