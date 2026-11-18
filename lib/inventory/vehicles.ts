/**
 * Read helpers for public pages (VDP, homepage rails, saved/compare, sitemap).
 * All return public shapes only (no base_* pricing).
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { shouldShowDemoInventory } from "@/lib/settings";
import { MAX_COMPARE } from "./constants";
import { publicVehicleCardSelect, publicVehicleDetailSelect, toPublicCard, toPublicDetail } from "./public";
import { visibilityWhere } from "./query";

export async function getVehicleBySlug(slug: string) {
  const row = await prisma.vehicle.findUnique({ where: { slug }, select: publicVehicleDetailSelect });
  if (!row) return null;
  if (row.isDemo && !shouldShowDemoInventory()) return null;
  return toPublicDetail(row);
}

async function listCards(where: Prisma.VehicleWhereInput, orderBy: Prisma.VehicleOrderByWithRelationInput[], take: number) {
  const rows = await prisma.vehicle.findMany({ where, orderBy, take, select: publicVehicleCardSelect });
  return rows.map(toPublicCard);
}

export async function getFeaturedVehicles(limit = 12) {
  const base = visibilityWhere(shouldShowDemoInventory());
  const featured = await listCards({ AND: [base, { isFeatured: true }] }, [{ createdAt: "desc" }], limit);
  if (featured.length >= limit) return featured;
  const filler = await listCards(
    { AND: [base, { id: { notIn: featured.map((v) => v.id) } }] },
    [{ createdAt: "desc" }],
    limit - featured.length,
  );
  return [...featured, ...filler];
}

export async function getJustArrived(limit = 12) {
  return listCards(visibilityWhere(shouldShowDemoInventory()), [{ createdAt: "desc" }, { id: "asc" }], limit);
}

/** Vehicles similar to the given one: same body style / fuel type, similar price. */
export async function getSimilarVehicles(
  v: { id: string; bodyStyle: string; fuelType: string; makeSlug: string; displayPrice: number },
  limit = 8,
) {
  const rows = await prisma.vehicle.findMany({
    where: {
      AND: [
        visibilityWhere(shouldShowDemoInventory()),
        { id: { not: v.id } },
        { OR: [{ bodyStyle: v.bodyStyle as never }, { fuelType: v.fuelType as never }] },
        { displayPrice: { gte: Math.floor(v.displayPrice * 0.65), lte: Math.ceil(v.displayPrice * 1.35) } },
      ],
    },
    take: 48,
    select: publicVehicleCardSelect,
  });
  const score = (r: (typeof rows)[number]) =>
    (r.bodyStyle === v.bodyStyle ? 3 : 0) +
    (r.fuelType === v.fuelType ? 2 : 0) +
    (r.makeSlug === v.makeSlug ? 1 : 0) -
    Math.abs(Number(r.displayPrice) - v.displayPrice) / Math.max(1, v.displayPrice);
  return rows
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map(toPublicCard);
}

/** For saved vehicles / recently viewed. Includes sold units so shoppers see what happened. */
export async function getVehicleCardsByIds(ids: string[]) {
  const unique = [...new Set(ids)].slice(0, 60);
  if (unique.length === 0) return [];
  const includeDemo = shouldShowDemoInventory();
  const rows = await prisma.vehicle.findMany({
    where: { id: { in: unique }, ...(includeDemo ? {} : { isDemo: false }) },
    select: publicVehicleCardSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toPublicCard(r)]));
  return unique.map((id) => byId.get(id)).filter((v) => v !== undefined);
}

export async function getVehiclesForCompare(ids: string[]) {
  const unique = [...new Set(ids)].slice(0, MAX_COMPARE);
  if (unique.length === 0) return [];
  const includeDemo = shouldShowDemoInventory();
  const rows = await prisma.vehicle.findMany({
    where: { id: { in: unique }, ...(includeDemo ? {} : { isDemo: false }) },
    select: publicVehicleDetailSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toPublicDetail(r)]));
  return unique.map((id) => byId.get(id)).filter((v) => v !== undefined);
}

export type InventoryStats = {
  total: number;
  byFuel: Record<string, number>;
  byBody: Record<string, number>;
  byCondition: Record<string, number>;
  makes: { slug: string; name: string; count: number; models: { slug: string; name: string; count: number }[] }[];
  minMonthly: number | null;
};

/** Aggregate counts for homepage tiles and quick search. */
export async function getInventoryStats(): Promise<InventoryStats> {
  const where = visibilityWhere(shouldShowDemoInventory());
  const [total, byFuel, byBody, byCondition, models, agg] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.groupBy({ by: ["fuelType"], where, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["bodyStyle"], where, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["condition"], where, _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["makeSlug", "make", "modelSlug", "model"], where, _count: { _all: true } }),
    prisma.vehicle.aggregate({ where, _min: { displayMonthlyPayment: true } }),
  ]);

  const makes = new Map<string, InventoryStats["makes"][number]>();
  for (const row of models) {
    const make: InventoryStats["makes"][number] = makes.get(row.makeSlug) ?? { slug: row.makeSlug, name: row.make, count: 0, models: [] };
    make.count += row._count._all;
    const existing = make.models.find((m) => m.slug === row.modelSlug);
    if (existing) existing.count += row._count._all;
    else make.models.push({ slug: row.modelSlug, name: row.model, count: row._count._all });
    makes.set(row.makeSlug, make);
  }

  return {
    total,
    byFuel: Object.fromEntries(byFuel.map((r) => [r.fuelType, r._count._all])),
    byBody: Object.fromEntries(byBody.map((r) => [r.bodyStyle, r._count._all])),
    byCondition: Object.fromEntries(byCondition.map((r) => [r.condition, r._count._all])),
    makes: [...makes.values()]
      .map((m) => ({ ...m, models: m.models.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    minMonthly: agg._min.displayMonthlyPayment === null ? null : Number(agg._min.displayMonthlyPayment),
  };
}

/** One representative photo per body style for the homepage "Browse by body style" grid. */
export async function getBodyStyleShowcase(): Promise<Partial<Record<string, string>>> {
  const base = visibilityWhere(shouldShowDemoInventory());
  const bodies = ["SUV", "SEDAN", "TRUCK", "CROSSOVER", "COUPE", "CONVERTIBLE", "HATCHBACK", "VAN", "WAGON"] as const;
  const rows = await Promise.all(
    bodies.map((bodyStyle) =>
      prisma.vehicle.findFirst({
        where: { AND: [base, { bodyStyle, NOT: { images: { isEmpty: true } } }] },
        orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
        select: { images: true },
      }),
    ),
  );
  return Object.fromEntries(bodies.map((b, i) => [b, rows[i]?.images[0]]).filter(([, src]) => Boolean(src)));
}

export async function getSitemapVehicles() {
  return prisma.vehicle.findMany({
    where: visibilityWhere(shouldShowDemoInventory()),
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 45_000,
  });
}

export async function getLocations() {
  const rows = await prisma.location.findMany({
    where: shouldShowDemoInventory() ? undefined : { isDemo: false },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
  return rows.map((l) => ({
    ...l,
    salesHours: (l.salesHours ?? []) as { day: string; open: string | null; close: string | null }[],
    serviceHours: (l.serviceHours ?? []) as { day: string; open: string | null; close: string | null }[],
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));
}

export type PublicLocation = Awaited<ReturnType<typeof getLocations>>[number];

export async function getPublishedReviews(limit = 9) {
  const rows = await prisma.review.findMany({
    where: { published: true, ...(shouldShowDemoInventory() ? {} : { isDemo: false }) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export type PublicReview = Awaited<ReturnType<typeof getPublishedReviews>>[number];
