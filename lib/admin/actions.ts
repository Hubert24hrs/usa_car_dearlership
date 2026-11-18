"use server";

/**
 * Admin server actions. EVERY action starts with requirePermission(), which
 * re-checks the user's role in the database.
 */
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { hashPassword, passwordSchema } from "@/lib/auth";
import { AuthorizationError, requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { afterInventoryChange } from "@/lib/inventory/after-change";
import { CACHE_TAGS } from "@/lib/inventory/cached";
import { isAllowedFeedUrl, syncFeedSource } from "@/lib/inventory/feeds";
import { detectFormat, parseInventoryFile } from "@/lib/inventory/importer/parse";
import { repriceAllVehicles, runImport, type ImportSummary } from "@/lib/inventory/importer/pipeline";
import { validateMultipliers } from "@/lib/pricing";
import { SETTING_KEYS, writeSetting } from "@/lib/settings";
import { storeImage, UploadError } from "@/lib/storage";

type Result<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

async function guarded<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof UploadError) return { ok: false, error: error.message };
    console.error("[admin]", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

async function audit(actor: string, action: string, entity: string, entityId?: string, data?: unknown) {
  await prisma.auditLog.create({
    data: { actor, action, entity, entityId, data: (data ?? undefined) as Prisma.InputJsonValue | undefined },
  });
}

// ── Inventory ──────────────────────────────────────────────────────────────

/** Manual add/edit: runs through the same import pipeline, so pricing rules apply. */
export async function saveVehicle(record: Record<string, unknown>, existingId?: string): Promise<Result<{ slug: string; id: string }>> {
  return guarded(async () => {
    const user = await requirePermission("inventory:write");
    if (existingId) {
      const existing = await prisma.vehicle.findUnique({
        where: { id: existingId },
        select: { vin: true, basePrice: true, baseDownPayment: true, baseMonthlyPayment: true },
      });
      if (!existing) return { ok: false, error: "Vehicle not found" };
      // Roles that can't see feed pricing can't change it either — keep the stored base values.
      if (!can(user.role, "pricing:read-base") || record.base_price === undefined || record.base_price === "") {
        record = {
          ...record,
          base_price: Number(existing.basePrice),
          base_down_payment: Number(existing.baseDownPayment),
          base_monthly_payment: Number(existing.baseMonthlyPayment),
        };
      }
      if (String(record.vin ?? "").toUpperCase() !== existing.vin) {
        const clash = await prisma.vehicle.findUnique({ where: { vin: String(record.vin ?? "").toUpperCase() }, select: { id: true } });
        if (clash) return { ok: false, error: "Another vehicle already uses that VIN." };
        await prisma.vehicle.update({ where: { id: existingId }, data: { vin: String(record.vin).toUpperCase() } });
      }
    } else {
      const vin = String(record.vin ?? "").trim().toUpperCase();
      if (vin && (await prisma.vehicle.findUnique({ where: { vin }, select: { id: true } }))) {
        return { ok: false, error: "A vehicle with this VIN already exists. Edit it instead." };
      }
    }
    const summary = await runImport([record], { source: "MANUAL", sourceRef: "manual", skipJobLog: true, triggeredBy: user.email });
    if (summary.errors.length) return { ok: false, error: summary.errors.map((e) => `${e.field ? `${e.field}: ` : ""}${e.message}`).join("; ") };
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { vin: summary.vins[0]! }, select: { id: true, slug: true } });
    await audit(user.email, existingId ? "vehicle.update" : "vehicle.create", "vehicle", vehicle.id, { vin: summary.vins[0] });
    await afterInventoryChange({ vins: summary.vins, slugs: [vehicle.slug] });
    revalidatePath("/admin/inventory");
    return { ok: true, data: vehicle };
  });
}

export async function deleteVehicle(id: string): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("inventory:delete");
    const vehicle = await prisma.vehicle.delete({ where: { id }, select: { vin: true, slug: true } });
    await audit(user.email, "vehicle.delete", "vehicle", id, vehicle);
    await afterInventoryChange({ slugs: [vehicle.slug] });
    revalidatePath("/admin/inventory");
    return { ok: true };
  });
}

export async function updateVehicleFlags(id: string, patch: { status?: "AVAILABLE" | "PENDING" | "SOLD"; isFeatured?: boolean }): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("inventory:write");
    const data = z.object({ status: z.enum(["AVAILABLE", "PENDING", "SOLD"]).optional(), isFeatured: z.boolean().optional() }).parse(patch);
    const vehicle = await prisma.vehicle.update({ where: { id }, data, select: { slug: true } });
    await audit(user.email, "vehicle.flags", "vehicle", id, data);
    await afterInventoryChange({ slugs: [vehicle.slug] });
    revalidatePath("/admin/inventory");
    return { ok: true };
  });
}

export async function uploadVehicleImages(formData: FormData): Promise<Result<{ urls: string[] }>> {
  return guarded(async () => {
    await requirePermission("inventory:write");
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 30);
    if (!files.length) return { ok: false, error: "Choose at least one image." };
    const urls: string[] = [];
    for (const file of files) urls.push(await storeImage(file, "vehicles"));
    return { ok: true, data: { urls } };
  });
}

// ── Import ─────────────────────────────────────────────────────────────────

export async function importInventoryFile(formData: FormData): Promise<Result<Omit<ImportSummary, "vins">>> {
  return guarded(async () => {
    const user = await requirePermission("inventory:import");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV or JSON file." };
    if (file.size > 15 * 1024 * 1024) return { ok: false, error: "Files must be 15 MB or smaller." };
    const provider = z
      .enum(["HOMENET", "VAUTO", "DEALERCOM", "CDK", "GENERIC_CSV", "GENERIC_JSON"])
      .optional()
      .parse(formData.get("provider") || undefined);
    const dryRun = formData.get("dryRun") === "on";
    const markMissingAsSold = formData.get("markMissingAsSold") === "on";
    const text = await file.text();
    const format = detectFormat(file.name, text);
    const parsed = parseInventoryFile(text, format);
    if (parsed.records.length === 0) return { ok: false, error: parsed.errors[0]?.message ?? "No vehicles found in file." };

    const summary = await runImport(
      parsed.records,
      {
        source: format === "csv" ? "CSV" : "JSON",
        provider: provider ?? (format === "csv" ? "GENERIC_CSV" : "GENERIC_JSON"),
        fileName: file.name,
        dryRun,
        markMissingAsSold,
        sourceRef: markMissingAsSold ? `upload:${provider ?? format}` : `upload:${file.name}`,
        triggeredBy: user.email,
      },
      { onCommitted: (s) => afterInventoryChange({ vins: s.vins }) },
    );
    summary.errors.unshift(...parsed.errors.map((e) => ({ row: e.row, message: `Parse error: ${e.message}` })));
    revalidatePath("/admin/import");
    const { vins: _vins, ...rest } = summary;
    return { ok: true, data: { ...rest, errors: rest.errors.slice(0, 200), warnings: rest.warnings.slice(0, 200) } };
  });
}

// ── Feeds ──────────────────────────────────────────────────────────────────

const feedSchema = z.object({
  name: z.string().trim().min(2).max(80),
  provider: z.enum(["HOMENET", "VAUTO", "DEALERCOM", "CDK", "GENERIC_CSV", "GENERIC_JSON"]),
  url: z.url().refine(isAllowedFeedUrl, "Feed URL must use https://"),
  authEnvVar: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/, "Use an ENV_VAR_NAME").optional()),
  locationId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
  enabled: z.boolean(),
  markMissingAsSold: z.boolean(),
});

export async function saveFeedSource(input: unknown, id?: string): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("feeds:manage");
    const parsed = feedSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    const data = { ...parsed.data, authEnvVar: parsed.data.authEnvVar ?? null, locationId: parsed.data.locationId ?? null };
    const feed = id ? await prisma.feedSource.update({ where: { id }, data }) : await prisma.feedSource.create({ data });
    await audit(user.email, id ? "feed.update" : "feed.create", "feed", feed.id, { name: feed.name, provider: feed.provider });
    revalidatePath("/admin/feeds");
    return { ok: true };
  });
}

export async function deleteFeedSource(id: string): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("feeds:manage");
    await prisma.feedSource.delete({ where: { id } });
    await audit(user.email, "feed.delete", "feed", id);
    revalidatePath("/admin/feeds");
    return { ok: true };
  });
}

export async function runFeedNow(id: string): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("feeds:manage");
    const feed = await prisma.feedSource.findUnique({ where: { id } });
    if (!feed) return { ok: false, error: "Feed not found" };
    try {
      const summary = await syncFeedSource(feed, user.email);
      revalidatePath("/admin/feeds");
      return { ok: true, message: `${summary.created} new · ${summary.updated} updated · ${summary.markedSold} sold · ${summary.failed} failed` };
    } catch (error) {
      revalidatePath("/admin/feeds");
      return { ok: false, error: (error as Error).message };
    }
  });
}

// ── Leads / CRM ────────────────────────────────────────────────────────────

export async function updateLead(id: string, patch: { status?: string; assignedToId?: string | null }): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("leads:write");
    const data = z
      .object({
        status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "APPOINTMENT_SET", "WON", "LOST"]).optional(),
        assignedToId: z.uuid().nullable().optional(),
      })
      .parse(patch);
    await prisma.lead.update({ where: { id }, data });
    await audit(user.email, "lead.update", "lead", id, data);
    revalidatePath("/admin/leads");
    return { ok: true };
  });
}

export async function addLeadNote(id: string, body: string): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("leads:write");
    const text = z.string().trim().min(1).max(4000).parse(body);
    await prisma.leadNote.create({ data: { leadId: id, authorId: user.id, body: text } });
    revalidatePath("/admin/leads");
    return { ok: true };
  });
}

// ── Settings ───────────────────────────────────────────────────────────────

const pricingSchema = z.object({
  vehiclePrice: z.number(),
  downPayment: z.number(),
  monthlyPayment: z.number(),
  termMonths: z.number().int().min(12).max(96),
  aprPercent: z.number().min(0).max(39.99),
});

/** Change multipliers / finance assumptions without a redeploy, then re-price every vehicle. */
export async function savePricingSettings(input: unknown): Promise<Result<{ repriced: number }>> {
  return guarded(async () => {
    const user = await requirePermission("pricing:write");
    const parsed = pricingSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Enter valid numbers for every field." };
    const { termMonths, aprPercent, ...multipliers } = parsed.data;
    const problems = validateMultipliers(multipliers);
    if (problems.length) return { ok: false, error: problems.join("; ") };
    await writeSetting(SETTING_KEYS.pricingMultipliers, multipliers, user.email);
    await writeSetting(SETTING_KEYS.financeAssumptions, { termMonths, aprPercent }, user.email);
    await audit(user.email, "settings.pricing", "setting", SETTING_KEYS.pricingMultipliers, parsed.data);
    const repriced = await repriceAllVehicles();
    revalidateTag(CACHE_TAGS.settings);
    await afterInventoryChange();
    revalidatePath("/admin/settings");
    return { ok: true, data: { repriced }, message: `Saved. Re-priced ${repriced} vehicles.` };
  });
}

const dealerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  legalName: z.string().trim().min(2).max(120),
  licenseNumber: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(7).max(30),
  smsPhone: z.string().trim().min(7).max(30),
  email: z.email(),
  address: z.string().trim().min(5).max(160),
  returnWindowDays: z.number().int().min(0).max(60),
  returnWindowMiles: z.number().int().min(0).max(5000),
  inspectionPoints: z.number().int().min(0).max(500),
  deliveryRadiusMiles: z.number().int().min(0).max(5000),
});

export async function saveDealerProfile(input: unknown): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("settings:write");
    const parsed = dealerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    await writeSetting(SETTING_KEYS.dealerProfile, parsed.data, user.email);
    await audit(user.email, "settings.dealer", "setting", SETTING_KEYS.dealerProfile, parsed.data);
    revalidateTag(CACHE_TAGS.settings);
    revalidatePath("/", "layout");
    return { ok: true, message: "Dealer profile saved." };
  });
}

// ── Users ──────────────────────────────────────────────────────────────────

const ROLES = ["CUSTOMER", "SALES", "FINANCE", "ADMIN"] as const;

export async function createStaffUser(input: unknown): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("users:manage");
    const parsed = z
      .object({ email: z.email(), name: z.string().trim().min(1).max(80), role: z.enum(ROLES), password: passwordSchema })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return { ok: false, error: "A user with that email already exists." };
    const created = await prisma.user.create({
      data: { email, name: parsed.data.name, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) },
    });
    await audit(user.email, "user.create", "user", created.id, { email, role: created.role });
    revalidatePath("/admin/users");
    return { ok: true, message: `Created ${email}. Share the temporary password securely.` };
  });
}

export async function updateUser(id: string, patch: { role?: string; isActive?: boolean }): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("users:manage");
    const data = z.object({ role: z.enum(ROLES).optional(), isActive: z.boolean().optional() }).parse(patch);
    if (id === user.id && ((data.role !== undefined && data.role !== "ADMIN") || data.isActive === false)) {
      return { ok: false, error: "You can't remove your own admin access." };
    }
    await prisma.user.update({ where: { id }, data });
    await audit(user.email, "user.update", "user", id, data);
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

// ── Locations ──────────────────────────────────────────────────────────────

const hoursSchema = z.array(z.object({ day: z.string(), open: z.string().nullable(), close: z.string().nullable() })).length(7);
const locationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/, "lowercase-with-dashes"),
  address1: z.string().trim().min(3).max(120),
  address2: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().length(2),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  phone: z.string().trim().min(7).max(30),
  smsPhone: z.string().trim().max(30).optional().nullable(),
  email: z.email().optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  salesHours: hoursSchema,
  serviceHours: hoursSchema,
  isPrimary: z.boolean(),
});

export async function saveLocation(input: unknown, id?: string): Promise<Result> {
  return guarded(async () => {
    const user = await requirePermission("settings:write");
    const parsed = locationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    const data = { ...parsed.data, state: parsed.data.state.toUpperCase(), isDemo: false };
    if (data.isPrimary) await prisma.location.updateMany({ data: { isPrimary: false } });
    const location = id ? await prisma.location.update({ where: { id }, data }) : await prisma.location.create({ data });
    await audit(user.email, id ? "location.update" : "location.create", "location", location.id, { name: location.name });
    revalidateTag(CACHE_TAGS.locations);
    revalidatePath("/admin/locations");
    return { ok: true, message: "Location saved." };
  });
}
