/**
 * Import pipeline (database side). Used by:
 *   • Admin CSV / JSON uploads
 *   • Scheduled feed sync (/api/inventory/sync)
 *   • Manual add/edit form
 *   • The demo seed
 *
 * Flow: adapter → canonical record → prepareRecords() [validation + pricing]
 *       → upsert by VIN → optional "mark missing as sold" → ImportJob log.
 *
 * Framework-agnostic: cache revalidation / search indexing are done by the
 * caller via `onCommitted`.
 */
import { prisma } from "@/lib/db";
import type { FeedProvider, ImportSource, ImportStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import { applyPricingMultipliers } from "@/lib/pricing";
import { getFinanceAssumptions, getPricingMultipliers } from "@/lib/settings";
import { getAdapter } from "./adapters";
import { prepareRecords, type PreparedVehicle, type RowError } from "./prepare";

export type ImportOptions = {
  source: ImportSource;
  provider?: FeedProvider;
  fileName?: string;
  dryRun?: boolean;
  /** Treat the batch as a full snapshot: vehicles from the same sourceRef that are missing become SOLD. */
  markMissingAsSold?: boolean;
  /** Groups vehicles by origin (feed id, "csv-upload"…) for snapshot semantics. */
  sourceRef?: string;
  defaultLocationId?: string;
  feedSourceId?: string;
  triggeredBy?: string;
  /** Skip writing an ImportJob row (used by the manual edit form). */
  skipJobLog?: boolean;
};

export type ImportSummary = {
  jobId: string | null;
  status: ImportStatus;
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  markedSold: number;
  errors: RowError[];
  warnings: RowError[];
  vins: string[];
};

const CHUNK_SIZE = 50;
const MAX_STORED_ERRORS = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function buildLocationResolver(defaultLocationId?: string) {
  const locations = await prisma.location.findMany({ select: { id: true, slug: true, name: true, isPrimary: true } });
  const fallback = defaultLocationId ?? locations.find((l) => l.isPrimary)?.id ?? locations[0]?.id ?? null;
  const bySlug = new Map(locations.map((l) => [l.slug.toLowerCase(), l.id]));
  const byName = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));
  const ids = new Set(locations.map((l) => l.id));
  return ({ location, locationId }: { location?: string; locationId?: string }) => {
    if (locationId && ids.has(locationId)) return locationId;
    if (location) {
      const key = location.toLowerCase();
      return bySlug.get(key) ?? byName.get(key) ?? (ids.has(location) ? location : null);
    }
    return fallback;
  };
}

function toCreateInput(v: PreparedVehicle): Prisma.VehicleUncheckedCreateInput {
  const { pricingMultipliers, ...rest } = v.data;
  return { ...rest, pricingMultipliers };
}

/** Build the update payload, preserving merchandising fields the record did not provide. */
function toUpdateInput(v: PreparedVehicle): Prisma.VehicleUncheckedUpdateInput {
  const { pricingMultipliers, images, spinImages, description, videoUrl, carfaxUrl, isFeatured, status, ...rest } = v.data;
  const update: Prisma.VehicleUncheckedUpdateInput = { ...rest, pricingMultipliers };
  if (v.provided.images) update.images = images;
  if (v.provided.spinImages) update.spinImages = spinImages;
  if (v.provided.description) update.description = description;
  if (v.provided.videoUrl) update.videoUrl = videoUrl;
  if (v.provided.carfaxUrl) update.carfaxUrl = carfaxUrl;
  if (v.provided.isFeatured) update.isFeatured = isFeatured;
  // Presence in an import means the unit is on the lot unless the feed says otherwise.
  update.status = v.provided.status ? status : "AVAILABLE";
  return update;
}

/**
 * Run an import. `records` may be raw provider records (pass `provider`) or
 * records already using the spec's snake_case field names.
 */
export async function runImport(
  records: Record<string, unknown>[],
  options: ImportOptions,
  hooks: { onCommitted?: (summary: ImportSummary) => Promise<void> | void } = {},
): Promise<ImportSummary> {
  const adapter = getAdapter(options.provider ?? (options.source === "CSV" ? "GENERIC_CSV" : "GENERIC_JSON"));
  const canonical = records.map((r) => adapter.map(r));
  const [multipliers, finance, resolveLocationId] = await Promise.all([
    getPricingMultipliers(),
    getFinanceAssumptions(),
    buildLocationResolver(options.defaultLocationId),
  ]);

  const firstRow = options.source === "CSV" ? 2 : 1; // CSV row 1 is the header
  const prepared = prepareRecords(canonical, {
    multipliers,
    finance,
    source: options.source,
    sourceRef: options.sourceRef ?? null,
    resolveLocationId,
  }, firstRow);

  const warnings: RowError[] = [
    ...prepared.duplicates,
    ...prepared.vehicles.flatMap((v) => v.warnings.map((message) => ({ row: v.row, vin: v.data.vin, message }))),
  ];
  const vins = prepared.vehicles.map((v) => v.data.vin);
  const existing = new Set(
    (
      await prisma.vehicle.findMany({ where: { vin: { in: vins } }, select: { vin: true } })
    ).map((v) => v.vin),
  );

  const summary: ImportSummary = {
    jobId: null,
    status: "RUNNING",
    dryRun: Boolean(options.dryRun),
    totalRows: records.length,
    created: prepared.vehicles.filter((v) => !existing.has(v.data.vin)).length,
    updated: prepared.vehicles.filter((v) => existing.has(v.data.vin)).length,
    skipped: prepared.duplicates.length,
    failed: new Set(prepared.errors.map((e) => e.row)).size,
    markedSold: 0,
    errors: prepared.errors,
    warnings,
    vins,
  };

  const job = options.skipJobLog
    ? null
    : await prisma.importJob.create({
        data: {
          source: options.source,
          feedSourceId: options.feedSourceId,
          fileName: options.fileName,
          dryRun: summary.dryRun,
          totalRows: summary.totalRows,
          triggeredBy: options.triggeredBy,
        },
      });
  summary.jobId = job?.id ?? null;

  try {
    if (!options.dryRun) {
      for (const batch of chunk(prepared.vehicles, CHUNK_SIZE)) {
        await prisma.$transaction(
          batch.map((v) =>
            prisma.vehicle.upsert({
              where: { vin: v.data.vin },
              create: toCreateInput(v),
              update: toUpdateInput(v),
            }),
          ),
        );
      }
      if (options.markMissingAsSold && options.sourceRef) {
        const result = await prisma.vehicle.updateMany({
          where: { sourceRef: options.sourceRef, vin: { notIn: vins }, status: { not: "SOLD" } },
          data: { status: "SOLD" },
        });
        summary.markedSold = result.count;
      } else if (options.markMissingAsSold) {
        // Projected count for dry runs / missing sourceRef is reported as 0 by design.
        summary.markedSold = 0;
      }
    } else if (options.markMissingAsSold && options.sourceRef) {
      summary.markedSold = await prisma.vehicle.count({
        where: { sourceRef: options.sourceRef, vin: { notIn: vins }, status: { not: "SOLD" } },
      });
    }

    summary.status = summary.failed > 0 ? (prepared.vehicles.length > 0 ? "PARTIAL" : "FAILED") : "SUCCESS";
  } catch (error) {
    summary.status = "FAILED";
    summary.errors.push({ row: 0, message: `Database error: ${(error as Error).message}` });
  }

  if (job) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: summary.status,
        created: summary.dryRun ? 0 : summary.created,
        updated: summary.dryRun ? 0 : summary.updated,
        skipped: summary.skipped,
        failed: summary.failed,
        markedSold: summary.markedSold,
        errors: [...summary.errors, ...summary.warnings].slice(0, MAX_STORED_ERRORS) as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
  }

  if (!options.dryRun && summary.status !== "FAILED") await hooks.onCommitted?.(summary);
  return summary;
}

/**
 * Recompute display_* for every vehicle from its stored base_* values using
 * the current multipliers. Triggered when an admin changes pricing settings.
 */
export async function repriceAllVehicles(): Promise<number> {
  const [multipliers, finance] = await Promise.all([getPricingMultipliers(), getFinanceAssumptions()]);
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, basePrice: true, baseDownPayment: true, baseMonthlyPayment: true },
  });
  const pricedAt = new Date();
  let count = 0;
  for (const batch of chunk(vehicles, 200)) {
    await prisma.$transaction(
      batch.map((v) => {
        const display = applyPricingMultipliers(
          {
            basePrice: Number(v.basePrice),
            baseDownPayment: Number(v.baseDownPayment),
            baseMonthlyPayment: Number(v.baseMonthlyPayment),
          },
          multipliers,
        );
        return prisma.vehicle.update({
          where: { id: v.id },
          data: { ...display, pricingMultipliers: { ...multipliers, ...finance }, pricedAt },
        });
      }),
    );
    count += batch.length;
  }
  return count;
}
