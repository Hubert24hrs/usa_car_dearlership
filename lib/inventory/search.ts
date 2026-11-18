/**
 * Inventory search service: results + faceted counts.
 *
 * Facet counts are "disjunctive": each facet's counts are computed with every
 * OTHER active filter applied but not its own, so shoppers can see how many
 * vehicles they would get by adding another make, fuel type, etc.
 */
import { prisma } from "@/lib/db";
import { shouldShowDemoInventory } from "@/lib/settings";
import {
  BODY_STYLES,
  COLOR_FAMILIES,
  CONDITIONS,
  DRIVETRAINS,
  FUEL_TYPES,
  PAGE_SIZE,
  POPULAR_FEATURES,
  TRANSMISSION_TYPES,
  optionByValue,
  type Option,
} from "./constants";
import type { InventoryFilters } from "./filters";
import { keywordMatches } from "./keyword";
import { publicVehicleCardSelect, toPublicCard, type PublicVehicleCard } from "./public";
import { RANGE_FACETS, buildOrderBy, buildVehicleWhere, type FacetKey } from "./query";

export type FacetOption = { value: string; label: string; count: number; hex?: string };
export type RangeBounds = { min: number | null; max: number | null };

export type InventoryFacets = {
  condition: FacetOption[];
  make: FacetOption[];
  model: FacetOption[];
  trim: FacetOption[];
  fuel: FacetOption[];
  body: FacetOption[];
  drivetrain: FacetOption[];
  transmission: FacetOption[];
  extColor: FacetOption[];
  intColor: FacetOption[];
  feature: FacetOption[];
  location: FacetOption[];
  ranges: {
    year: RangeBounds;
    price: RangeBounds;
    monthly: RangeBounds;
    mileage: RangeBounds;
    range: RangeBounds;
    mpg: RangeBounds;
  };
};

export type InventorySearchResult = {
  vehicles: PublicVehicleCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: InventoryFacets;
  /** slug → display name lookups for chips/titles */
  labels: { makes: Record<string, string>; models: Record<string, string>; locations: Record<string, string> };
};

type GroupRow = { _count: { _all: number } } & Record<string, unknown>;

function enumFacet<T extends string>(rows: GroupRow[], field: string, options: readonly Option<T>[]): FacetOption[] {
  const counts = new Map(rows.map((r) => [String(r[field]), r._count._all]));
  return options
    .map((o) => ({ value: o.value, label: o.label, count: counts.get(o.value) ?? 0 }))
    .filter((o) => o.count > 0);
}

/** Merge rows that share a slug but differ in spelling; keep the most common label. */
function slugFacet(rows: GroupRow[], slugField: string, labelField: string): FacetOption[] {
  const map = new Map<string, { label: string; labelCount: number; count: number }>();
  for (const row of rows) {
    const slug = String(row[slugField]);
    const label = String(row[labelField]);
    const entry = map.get(slug);
    if (!entry) map.set(slug, { label, labelCount: row._count._all, count: row._count._all });
    else {
      entry.count += row._count._all;
      if (row._count._all > entry.labelCount) Object.assign(entry, { label, labelCount: row._count._all });
    }
  }
  return [...map.entries()]
    .map(([value, e]) => ({ value, label: e.label, count: e.count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function colorFacet(rows: GroupRow[], field: string): FacetOption[] {
  const counts = new Map(rows.map((r) => [String(r[field]), r._count._all]));
  return COLOR_FAMILIES.map((c) => ({ value: c.slug, label: c.label, hex: c.hex, count: counts.get(c.slug) ?? 0 })).filter(
    (c) => c.count > 0,
  );
}

function featureFacet(rows: { features: string[] }[], selected: string[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const feature of row.features) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  const popular = new Set<string>(POPULAR_FEATURES);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => {
      const pa = popular.has(a.value) ? 1 : 0;
      const pb = popular.has(b.value) ? 1 : 0;
      return pb - pa || b.count - a.count || a.label.localeCompare(b.label);
    })
    .filter((o, index) => index < 40 || selected.includes(o.value));
}

function bounds(min: unknown, max: unknown): RangeBounds {
  const toNum = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return { min: toNum(min), max: toNum(max) };
}

export async function getFacets(f: InventoryFilters, ctx: { includeDemo: boolean; ids?: string[] }) {
  const where = (omit: FacetKey[]) => buildVehicleWhere(f, { includeDemo: ctx.includeDemo, ids: ctx.ids, omit });
  const count = { _count: { _all: true } } as const;

  const [condition, make, model, trim, fuel, body, drivetrain, transmission, extColor, intColor, location, agg, features, locations] =
    await Promise.all([
      prisma.vehicle.groupBy({ by: ["condition"], where: where(["condition"]), ...count }),
      prisma.vehicle.groupBy({ by: ["makeSlug", "make"], where: where(["make", "model", "trim"]), ...count }),
      f.make.length > 0
        ? prisma.vehicle.groupBy({ by: ["modelSlug", "model"], where: where(["model", "trim"]), ...count })
        : Promise.resolve([]),
      f.model.length === 1
        ? prisma.vehicle.groupBy({ by: ["trim"], where: where(["trim"]), ...count })
        : Promise.resolve([]),
      prisma.vehicle.groupBy({ by: ["fuelType"], where: where(["fuel"]), ...count }),
      prisma.vehicle.groupBy({ by: ["bodyStyle"], where: where(["body"]), ...count }),
      prisma.vehicle.groupBy({ by: ["drivetrain"], where: where(["drivetrain"]), ...count }),
      prisma.vehicle.groupBy({ by: ["transmissionType"], where: where(["transmission"]), ...count }),
      prisma.vehicle.groupBy({ by: ["exteriorColorFamily"], where: where(["extColor"]), ...count }),
      prisma.vehicle.groupBy({ by: ["interiorColorFamily"], where: where(["intColor"]), ...count }),
      prisma.vehicle.groupBy({ by: ["locationId"], where: where(["location"]), ...count }),
      prisma.vehicle.aggregate({
        where: where(RANGE_FACETS),
        _min: { year: true, displayPrice: true, displayMonthlyPayment: true, mileage: true, evRangeMiles: true, mpgCombined: true },
        _max: { year: true, displayPrice: true, displayMonthlyPayment: true, mileage: true, evRangeMiles: true, mpgCombined: true },
      }),
      prisma.vehicle.findMany({ where: where(["feature"]), select: { features: true } }),
      prisma.location.findMany({ select: { id: true, slug: true, name: true } }),
    ]);

  const locationById = new Map(locations.map((l) => [l.id, l]));
  const facets: InventoryFacets = {
    condition: enumFacet(condition as GroupRow[], "condition", CONDITIONS),
    make: slugFacet(make as GroupRow[], "makeSlug", "make"),
    model: slugFacet(model as GroupRow[], "modelSlug", "model"),
    trim: (trim as GroupRow[])
      .filter((r) => r.trim)
      .map((r) => ({ value: String(r.trim), label: String(r.trim), count: r._count._all }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    fuel: enumFacet(fuel as GroupRow[], "fuelType", FUEL_TYPES),
    body: enumFacet(body as GroupRow[], "bodyStyle", BODY_STYLES),
    drivetrain: enumFacet(drivetrain as GroupRow[], "drivetrain", DRIVETRAINS).map((o) => ({
      ...o,
      label: optionByValue(DRIVETRAINS, o.value as never)?.label ?? o.label,
    })),
    transmission: enumFacet(transmission as GroupRow[], "transmissionType", TRANSMISSION_TYPES),
    extColor: colorFacet(extColor as GroupRow[], "exteriorColorFamily"),
    intColor: colorFacet(intColor as GroupRow[], "interiorColorFamily"),
    feature: featureFacet(features, f.feature),
    location: (location as GroupRow[])
      .map((r) => {
        const loc = locationById.get(String(r.locationId));
        return loc ? { value: loc.slug, label: loc.name, count: r._count._all } : null;
      })
      .filter((o): o is FacetOption => o !== null),
    ranges: {
      year: bounds(agg._min.year, agg._max.year),
      price: bounds(agg._min.displayPrice, agg._max.displayPrice),
      monthly: bounds(agg._min.displayMonthlyPayment, agg._max.displayMonthlyPayment),
      mileage: bounds(agg._min.mileage, agg._max.mileage),
      range: bounds(agg._min.evRangeMiles, agg._max.evRangeMiles),
      mpg: bounds(agg._min.mpgCombined, agg._max.mpgCombined),
    },
  };
  return { facets, locations };
}

export async function searchInventory(
  f: InventoryFilters,
  opts: { pageSize?: number; withFacets?: boolean } = {},
): Promise<InventorySearchResult> {
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const includeDemo = shouldShowDemoInventory();

  let rank: Map<string, number> | null = null;
  if (f.q) rank = await keywordMatches(f.q);
  const ids = rank ? [...rank.keys()] : undefined;
  const where = buildVehicleWhere(f, { includeDemo, ids });

  let vehicles: PublicVehicleCard[];
  let total: number;

  if (rank && f.sort === "relevance") {
    const matching = await prisma.vehicle.findMany({ where, select: { id: true } });
    const ordered = matching.map((m) => m.id).sort((a, b) => (rank.get(b) ?? 0) - (rank.get(a) ?? 0));
    total = ordered.length;
    const pageIds = ordered.slice((f.page - 1) * pageSize, f.page * pageSize);
    const rows = await prisma.vehicle.findMany({ where: { id: { in: pageIds } }, select: publicVehicleCardSelect });
    const byId = new Map(rows.map((r) => [r.id, r]));
    vehicles = pageIds.map((id) => byId.get(id)).filter((r) => r !== undefined).map(toPublicCard);
  } else {
    const [rows, count] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: buildOrderBy(f.sort),
        skip: (f.page - 1) * pageSize,
        take: pageSize,
        select: publicVehicleCardSelect,
      }),
      prisma.vehicle.count({ where }),
    ]);
    vehicles = rows.map(toPublicCard);
    total = count;
  }

  const { facets, locations } =
    opts.withFacets === false
      ? { facets: emptyFacets(), locations: await prisma.location.findMany({ select: { id: true, slug: true, name: true } }) }
      : await getFacets(f, { includeDemo, ids });

  return {
    vehicles,
    total,
    page: f.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    facets,
    labels: {
      makes: Object.fromEntries(facets.make.map((m) => [m.value, m.label])),
      models: Object.fromEntries(facets.model.map((m) => [m.value, m.label])),
      locations: Object.fromEntries(locations.map((l) => [l.slug, l.name])),
    },
  };
}

export function emptyFacets(): InventoryFacets {
  const empty: RangeBounds = { min: null, max: null };
  return {
    condition: [],
    make: [],
    model: [],
    trim: [],
    fuel: [],
    body: [],
    drivetrain: [],
    transmission: [],
    extColor: [],
    intColor: [],
    feature: [],
    location: [],
    ranges: { year: empty, price: empty, monthly: empty, mileage: empty, range: empty, mpg: empty },
  };
}

/** Count only — used by the homepage quick search ("Search 1,248 vehicles"). */
export async function countInventory(f: InventoryFilters): Promise<number> {
  const includeDemo = shouldShowDemoInventory();
  const ids = f.q ? [...(await keywordMatches(f.q)).keys()] : undefined;
  return prisma.vehicle.count({ where: buildVehicleWhere(f, { includeDemo, ids }) });
}
