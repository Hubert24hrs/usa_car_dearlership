/**
 * Site search: takes shoppers straight to a car when it is in stock, or to the
 * closest alternatives when it is not.
 *
 *   VIN or stock number          → that car's page (similar cars if it has sold)
 *   exactly one in-stock match   → that car's page
 *   several in-stock matches     → inventory results for the search
 *   nothing in stock             → similar cars, ranked by body style, fuel,
 *                                  make, price and year
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { vehicleTitle } from "@/lib/format";
import { shouldShowDemoInventory } from "@/lib/settings";
import { CACHE_TAGS } from "./cached";
import { buildInventoryHref, EMPTY_FILTERS, type InventoryFilters } from "./filters";
import { anyKeywordMatches } from "./keyword";
import { publicVehicleCardSelect, toPublicCard, type PublicVehicleCard } from "./public";
import { visibilityWhere } from "./query";
import { countInventory, searchInventory } from "./search";
import { hasSearchableIntent, parseSearchIntent, type SearchIntent, type SearchVocabulary } from "./search-intent";
import { getFeaturedVehicles, getSimilarVehicles } from "./vehicles";
import { VIN_REGEX } from "./vin";

export type SearchOutcome =
  | { kind: "empty" }
  | { kind: "vehicle"; slug: string }
  | { kind: "matches"; href: string; total: number }
  | {
      kind: "similar";
      query: string;
      /** Set when the search named a specific car that has since sold. */
      soldTitle?: string;
      terms: string[];
      vehicles: PublicVehicleCard[];
      browseHref: string | null;
    };

const RESULT_LIMIT = 12;
const IN_STOCK: string[] = ["AVAILABLE", "PENDING"];

/** Trim, collapse whitespace and cap length. */
export function cleanQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 100) : "";
}

/** Every make/model the dealership has listed (including sold), with body style, fuel and typical price. */
async function getSearchVocabulary(): Promise<SearchVocabulary> {
  const rows = await prisma.vehicle.groupBy({
    by: ["make", "makeSlug", "model", "modelSlug", "bodyStyle", "fuelType"],
    where: shouldShowDemoInventory() ? undefined : { isDemo: false },
    _avg: { displayPrice: true },
  });
  const makes = new Map<string, string>();
  for (const row of rows) makes.set(row.makeSlug, row.make);
  return {
    makes: [...makes].map(([slug, name]) => ({ slug, name })),
    models: rows.map((row) => ({
      make: row.make,
      makeSlug: row.makeSlug,
      model: row.model,
      modelSlug: row.modelSlug,
      bodyStyle: row.bodyStyle,
      fuelType: row.fuelType,
      avgPrice: Number(row._avg.displayPrice ?? 0),
    })),
  };
}

const cachedSearchVocabulary = unstable_cache(getSearchVocabulary, ["search-vocabulary"], {
  tags: [CACHE_TAGS.inventory],
  revalidate: 3600,
});

/** Inventory filters that express the search exactly (used when every word was understood). */
function filtersForIntent(intent: SearchIntent): InventoryFilters {
  return {
    ...EMPTY_FILTERS,
    make: intent.makes.flatMap((m) => (m.slug ? [m.slug] : [])),
    model: intent.models.map((m) => m.modelSlug),
    body: intent.models.length ? [] : intent.bodyStyles,
    fuel: intent.fuelTypes,
    condition: intent.conditions,
    yearMin: intent.year,
    yearMax: intent.year,
    priceMin: intent.luxury ? 45_000 : undefined,
    priceMax: intent.priceMax,
    monthlyMax: intent.monthlyMax,
  };
}

/** A broader "see more like this" link for the similar-cars page. */
function browseHrefFor(intent: SearchIntent): string | null {
  const body = [...new Set([...intent.bodyStyles, ...intent.models.map((m) => m.bodyStyle)])];
  const fuel = [...new Set([...intent.fuelTypes, ...intent.models.map((m) => m.fuelType)])];
  if (!body.length && !fuel.length && !intent.priceMax && !intent.monthlyMax) return null;
  return buildInventoryHref({ ...EMPTY_FILTERS, body, fuel, priceMax: intent.priceMax, monthlyMax: intent.monthlyMax });
}

/** Rank in-stock cars by how closely they resemble what was searched. */
async function similarToIntent(intent: SearchIntent, includeDemo: boolean): Promise<PublicVehicleCard[]> {
  const makeSlugs = intent.makes.flatMap((m) => (m.slug ? [m.slug] : []));
  const bodies = [...new Set([...intent.bodyStyles, ...intent.models.map((m) => m.bodyStyle)])];
  const fuels = [...new Set([...intent.fuelTypes, ...intent.models.map((m) => m.fuelType)])];

  const anyOf: Prisma.VehicleWhereInput[] = [];
  if (bodies.length) anyOf.push({ bodyStyle: { in: bodies } });
  if (fuels.length) anyOf.push({ fuelType: { in: fuels } });
  if (makeSlugs.length) anyOf.push({ makeSlug: { in: makeSlugs } });
  const where: Prisma.VehicleWhereInput[] = [visibilityWhere(includeDemo)];
  if (anyOf.length) where.push({ OR: anyOf });
  if (intent.priceMax) where.push({ displayPrice: { lte: Math.round(intent.priceMax * 1.1) } });
  if (intent.monthlyMax) where.push({ displayMonthlyPayment: { lte: Math.round(intent.monthlyMax * 1.1) } });

  const rows = await prisma.vehicle.findMany({ where: { AND: where }, select: publicVehicleCardSelect, take: 2000 });
  const target = intent.targetPrice;
  const scored = rows.map((row) => {
    const v = toPublicCard(row);
    let score = 0;
    if (bodies.includes(v.bodyStyle)) score += 3;
    if (fuels.includes(v.fuelType)) score += 2;
    if (makeSlugs.includes(v.makeSlug)) score += 2;
    if (intent.conditions.includes(v.condition)) score += 1;
    if (target) score -= Math.min(1.5, Math.abs(v.displayPrice - target) / target) * 2;
    if (intent.year) score -= Math.min(1, Math.abs(v.year - intent.year) / 6);
    if (intent.luxury && v.displayPrice >= 45_000) score += 1;
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score || b.v.year - a.v.year || a.v.id.localeCompare(b.v.id));

  // Variety: at most two cars of the same model.
  const perModel = new Map<string, number>();
  const picked: PublicVehicleCard[] = [];
  for (const { v } of scored) {
    const key = `${v.makeSlug}/${v.modelSlug}`;
    const count = perModel.get(key) ?? 0;
    if (count >= 2) continue;
    perModel.set(key, count + 1);
    picked.push(v);
    if (picked.length === RESULT_LIMIT) break;
  }
  return picked;
}

/** In-stock cars matching any word of the query. */
async function partialMatches(q: string, includeDemo: boolean): Promise<PublicVehicleCard[]> {
  const rank = await anyKeywordMatches(q);
  if (rank.size === 0) return [];
  const rows = await prisma.vehicle.findMany({
    where: { AND: [visibilityWhere(includeDemo), { id: { in: [...rank.keys()] } }] },
    select: publicVehicleCardSelect,
  });
  return rows
    .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
    .slice(0, RESULT_LIMIT)
    .map(toPublicCard);
}

export async function resolveSearch(raw: unknown): Promise<SearchOutcome> {
  const q = cleanQuery(raw);
  if (!q) return { kind: "empty" };
  const includeDemo = shouldShowDemoInventory();

  // 1. A VIN or stock number identifies one specific car.
  const vin = q.replace(/[\s-]/g, "").toUpperCase();
  const exact = await prisma.vehicle.findFirst({
    where: {
      OR: [...(VIN_REGEX.test(vin) ? [{ vin }] : []), { stockNumber: { equals: q, mode: "insensitive" as const } }],
      ...(includeDemo ? {} : { isDemo: false }),
    },
    select: publicVehicleCardSelect,
  });
  if (exact) {
    if (IN_STOCK.includes(exact.status)) return { kind: "vehicle", slug: exact.slug };
    const sold = toPublicCard(exact);
    return {
      kind: "similar",
      query: q,
      soldTitle: vehicleTitle(sold),
      terms: [vehicleTitle(sold)],
      vehicles: await getSimilarVehicles(sold, RESULT_LIMIT),
      browseHref: buildInventoryHref({ ...EMPTY_FILTERS, body: [sold.bodyStyle] }),
    };
  }

  // 2. Keyword match against cars in stock.
  const keywordFilters: InventoryFilters = { ...EMPTY_FILTERS, q, sort: "relevance" };
  const keyword = await searchInventory(keywordFilters, { pageSize: 1, withFacets: false });
  if (keyword.total === 1 && keyword.vehicles[0]) return { kind: "vehicle", slug: keyword.vehicles[0].slug };
  if (keyword.total > 1) return { kind: "matches", total: keyword.total, href: buildInventoryHref(keywordFilters) };

  // 3. Understand the search ("electric suv under 50k"); show exact matches if there are any.
  const intent = parseSearchIntent(q, await cachedSearchVocabulary());
  const understood = hasSearchableIntent(intent) && intent.leftover.length === 0 && intent.makes.every((m) => m.slug !== null);
  if (understood) {
    const filters = filtersForIntent(intent);
    const total = await countInventory(filters);
    if (total === 1) {
      const only = await searchInventory(filters, { pageSize: 1, withFacets: false });
      if (only.vehicles[0]) return { kind: "vehicle", slug: only.vehicles[0].slug };
    }
    if (total > 1) return { kind: "matches", total, href: buildInventoryHref(filters) };
  }

  // 4. Not in stock: the closest alternatives we have.
  let vehicles = hasSearchableIntent(intent) ? await similarToIntent(intent, includeDemo) : [];
  if (vehicles.length === 0) vehicles = await partialMatches(q, includeDemo);
  if (vehicles.length === 0) vehicles = await getFeaturedVehicles(RESULT_LIMIT);
  return { kind: "similar", query: q, terms: intent.terms, vehicles, browseHref: browseHrefFor(intent) };
}

/** Live suggestions for the header search box: up to `limit` in-stock matches. */
export async function suggestVehicles(raw: unknown, limit = 6) {
  const q = cleanQuery(raw);
  if (q.length < 2) return { total: 0, vehicles: [] as PublicVehicleCard[] };
  const result = await searchInventory({ ...EMPTY_FILTERS, q, sort: "relevance" }, { pageSize: limit, withFacets: false });
  return { total: result.total, vehicles: result.vehicles };
}
