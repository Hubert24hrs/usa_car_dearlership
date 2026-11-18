/**
 * Demo seed.
 *
 *   npm run db:seed                       # 1,500 demo vehicles (spec fuel mix, scaled)
 *   npm run db:seed:small                 # 120 demo vehicles (EV 30 · Hybrid 25 · PHEV 10 · Gas 45 · Diesel 10)
 *   npx tsx prisma/seed.ts --count=3000   # any size, same proportions
 *   npx tsx prisma/seed.ts --no-demo      # admin user + defaults only (production)
 *
 * Demo vehicles are flagged is_demo=true (hidden in production unless
 * SHOW_DEMO_INVENTORY=true). Each one uses an AI-generated illustrative photo of
 * its catalog model in one of two paint colors (seed-data/vehicle-images.json),
 * falling back to generated SVG artwork for models without a photo.
 * They are inserted through the real import pipeline, so the pricing multipliers
 * are applied exactly as for a dealer feed: we choose realistic retail targets,
 * back-solve the base_* "feed" values, and let the pipeline compute display_*.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ quiet: true });

import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { amortizedMonthlyPayment } from "../lib/finance";
import { runImport } from "../lib/inventory/importer/pipeline";
import { withCheckDigit } from "../lib/inventory/vin";
import { placeholderUrl } from "../lib/placeholder";
import { roundToNearest } from "../lib/pricing";
import { getFinanceAssumptions, getPricingMultipliers } from "../lib/settings";
import type { FuelType, LeadType } from "../lib/generated/prisma/enums";
import { CATALOG, FUEL_DISTRIBUTION, MAKE_WMI, type CatalogEntry } from "./seed-data/catalog";
import { DEMO_LEADS, DEMO_LOCATIONS, DEMO_REVIEWS } from "./seed-data/content";
import vehicleImages from "./seed-data/vehicle-images.json";
import {
  COMMON_FEATURES,
  EV_FEATURES,
  EXTERIOR_COLORS,
  INTERIOR_COLORS,
  LUXURY_FEATURES,
  SAFETY_FEATURES,
  TAG_FEATURES,
  UPSCALE_FEATURES,
  VAN_FEATURES,
  type Paint,
} from "./seed-data/options";

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const COUNT = Math.max(10, Number(arg("count") ?? process.env.SEED_VEHICLE_COUNT ?? 1500));
const NO_DEMO = args.includes("--no-demo");
const SEED = Number(arg("seed") ?? 20261118);

// ── Deterministic PRNG ───────────────────────────────────────────────────────
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const chance = (p: number) => rand() < p;
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
function weighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}
function sample<T>(items: readonly T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

// ── Constants ────────────────────────────────────────────────────────────────
const NOW = new Date();
const CURRENT_MODEL_YEAR = NOW.getMonth() >= 6 ? NOW.getFullYear() + 1 : NOW.getFullYear();
const NEW_YEARS = [CURRENT_MODEL_YEAR - 1, CURRENT_MODEL_YEAR];
const LAST_USED_YEAR = CURRENT_MODEL_YEAR - 2;
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const YEAR_CODES: Record<number, string> = {
  2010: "A", 2011: "B", 2012: "C", 2013: "D", 2014: "E", 2015: "F", 2016: "G", 2017: "H", 2018: "J",
  2019: "K", 2020: "L", 2021: "M", 2022: "N", 2023: "P", 2024: "R", 2025: "S", 2026: "T", 2027: "V",
  2028: "W", 2029: "X", 2030: "Y",
};

type Condition = "NEW" | "USED" | "CPO";

/** AI-generated illustrative photos per catalog model (see seed-data/vehicle-images.json). */
type ModelPhoto = { color: string; hex: string; url: string };
const MODEL_PHOTOS = vehicleImages.images as Record<string, ModelPhoto[]>;

function makeVin(entry: CatalogEntry, year: number, serial: number): string {
  const wmi = (entry.wmi ?? MAKE_WMI[entry.make] ?? "1XX").slice(0, 3);
  const vds = Array.from({ length: 5 }, () => pick(VIN_CHARS.split(""))).join("");
  const plant = pick("ABCDEFGHJKLMNPRSTUVWXYZ0123456789".split(""));
  const serialStr = String(serial).padStart(6, "0").slice(-6);
  return withCheckDigit(`${wmi}${vds}0${YEAR_CODES[year] ?? "T"}${plant}${serialStr}`);
}

function chooseCondition(entry: CatalogEntry): { condition: Condition; year: number } | null {
  const [first, last] = entry.years;
  const newYears = NEW_YEARS.filter((y) => y >= first && y <= last);
  const usedRange: [number, number] = [Math.max(first, 2016), Math.min(last, LAST_USED_YEAR)];
  const cpoRange: [number, number] = [Math.max(first, LAST_USED_YEAR - 4), Math.min(last, LAST_USED_YEAR)];
  const options: { condition: Condition; weight: number }[] = [];
  if (newYears.length) options.push({ condition: "NEW", weight: 45 });
  if (usedRange[0] <= usedRange[1]) options.push({ condition: "USED", weight: 40 });
  if (cpoRange[0] <= cpoRange[1]) options.push({ condition: "CPO", weight: 15 });
  if (!options.length) return null;
  const { condition } = weighted(options);
  if (condition === "NEW") return { condition, year: newYears.length > 1 && chance(0.55) ? newYears[1]! : newYears[0]! };
  const range = condition === "CPO" ? cpoRange : usedRange;
  // Skew used inventory toward recent model years.
  const span = range[1] - range[0];
  const year = range[1] - Math.floor(Math.pow(rand(), 1.6) * (span + 1));
  return { condition, year: Math.max(range[0], year) };
}

function residualValue(entry: CatalogEntry, year: number, mileage: number): number {
  const age = Math.max(0.5, CURRENT_MODEL_YEAR - year - 0.4);
  let r = age < 1 ? 0.88 : 0.84 * Math.pow(0.9, age - 1);
  if (entry.fuel === "ELECTRIC") r *= Math.pow(0.94, age);
  if (entry.tags?.includes("lux")) r *= Math.pow(0.97, age);
  if (entry.tags?.some((t) => t === "tow" || t === "offroad") || ["Toyota", "Lexus", "Honda", "Subaru"].includes(entry.make)) {
    r *= Math.min(1.25, Math.pow(1.035, age));
  }
  const expectedMiles = 12_000 * age;
  r *= 1 - Math.max(-0.08, Math.min(0.15, ((mileage - expectedMiles) / 100_000) * 0.12));
  return Math.max(0.2, Math.min(0.95, r * between(0.96, 1.04)));
}

function pickFeatures(entry: CatalogEntry, trimIndex: number, trimCount: number, year: number) {
  const level = trimCount > 1 ? trimIndex / (trimCount - 1) : 0.5;
  const lux = entry.tags?.includes("lux") ? 0.35 : 0;
  const features = new Set<string>(sample(COMMON_FEATURES, int(6, COMMON_FEATURES.length)));
  for (const f of UPSCALE_FEATURES) if (chance(0.25 + level * 0.55 + lux)) features.add(f);
  for (const f of LUXURY_FEATURES) if (chance(level * 0.35 + lux)) features.add(f);
  for (const tag of entry.tags ?? []) for (const f of TAG_FEATURES[tag] ?? []) if (chance(0.7)) features.add(f);
  if (entry.fuel === "ELECTRIC") for (const f of EV_FEATURES) if (chance(0.75)) features.add(f);
  if (entry.fuel === "PLUG_IN_HYBRID") features.add("Level 2 Charging Capable");
  if (entry.body === "VAN" && !entry.tags?.includes("work")) for (const f of VAN_FEATURES) if (chance(0.6)) features.add(f);
  if (entry.body === "CONVERTIBLE") features.add("Power-Folding Top");
  if (year >= 2021 && features.has("Apple CarPlay") && chance(0.6)) features.add("Wireless Apple CarPlay");
  return [...features];
}

function pickSafety(year: number) {
  const base = ["Front, Side & Curtain Airbags", "Stability Control", "Tire Pressure Monitoring"];
  const adasCount = year >= 2023 ? int(7, 11) : year >= 2019 ? int(4, 8) : int(2, 5);
  return [...new Set([...base, ...sample(SAFETY_FEATURES.filter((s) => !base.includes(s)), adasCount)])];
}

function description(entry: CatalogEntry, condition: Condition, year: number, trim: string, color: string, features: string[]) {
  const intro: Record<Condition, string> = {
    NEW: `Brand-new ${year} ${entry.make} ${entry.model} ${trim}`,
    USED: `Inspected, pre-owned ${year} ${entry.make} ${entry.model} ${trim}`,
    CPO: `Certified pre-owned ${year} ${entry.make} ${entry.model} ${trim}`,
  };
  const highlights = features.filter((f) => !COMMON_FEATURES.includes(f)).slice(0, 4);
  return [
    `${intro[condition]} finished in ${color}.`,
    highlights.length ? `Highlights include ${highlights.join(", ").toLowerCase()}.` : "",
    condition === "CPO" ? "Includes the manufacturer certified pre-owned warranty and a multi-point inspection." : "",
    "Demo listing — placeholder data for development only.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ── Seeding steps ────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.startsWith("change-me")) {
    console.warn("[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set (or still the placeholder) — skipping admin user.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, name: "Administrator", passwordHash, role: "ADMIN" },
    update: { role: "ADMIN", isActive: true },
  });
  console.log(`[seed] admin user ready: ${email}`);
}

async function seedLocations() {
  for (const { weight: _weight, ...location } of DEMO_LOCATIONS) {
    await prisma.location.upsert({
      where: { slug: location.slug },
      create: { ...location, isDemo: true },
      update: { ...location, isDemo: true },
    });
  }
  console.log(`[seed] ${DEMO_LOCATIONS.length} demo locations`);
}

async function seedReviews() {
  await prisma.review.deleteMany({ where: { isDemo: true } });
  await prisma.review.createMany({
    data: DEMO_REVIEWS.map((r, i) => ({ ...r, source: "Demo", isDemo: true, createdAt: new Date(NOW.getTime() - i * 6 * 86_400_000) })),
  });
}

async function seedFeedSource() {
  const exists = await prisma.feedSource.findFirst({ where: { name: "Example HomeNet feed (disabled)" } });
  if (!exists) {
    await prisma.feedSource.create({
      data: {
        name: "Example HomeNet feed (disabled)",
        provider: "HOMENET",
        url: "https://feeds.example.com/homenet/inventory.csv",
        authEnvVar: "HOMENET_FEED_TOKEN",
        enabled: false,
      },
    });
  }
}

function buildRecords(count: number, multipliers: Awaited<ReturnType<typeof getPricingMultipliers>>, finance: Awaited<ReturnType<typeof getFinanceAssumptions>>) {
  const totalWeight = Object.values(FUEL_DISTRIBUTION).reduce((a, b) => a + b, 0);
  const fuels = Object.keys(FUEL_DISTRIBUTION) as FuelType[];
  const perFuel = new Map<FuelType, number>();
  let assigned = 0;
  fuels.forEach((fuel, i) => {
    const n = i === fuels.length - 1 ? count - assigned : Math.round((count * FUEL_DISTRIBUTION[fuel]) / totalWeight);
    perFuel.set(fuel, n);
    assigned += n;
  });

  const records: Record<string, unknown>[] = [];
  let serial = 100_000;
  const featuredBudget = Math.max(8, Math.round(count * 0.07));
  let featured = 0;

  for (const fuel of fuels) {
    const entries = CATALOG[fuel];
    const target = perFuel.get(fuel)!;
    // Round-robin over a shuffled catalog so every model appears before repeats.
    let order = sample(entries, entries.length);
    for (let i = 0; i < target; i++) {
      if (i > 0 && i % order.length === 0) order = sample(entries, entries.length);
      const entry = order[i % order.length]!;
      const cy = chooseCondition(entry);
      if (!cy) continue;
      const { condition, year } = cy;
      const trimIndex = int(0, entry.trims.length - 1);
      const [trim, latestMsrp] = entry.trims[trimIndex]!;
      const latestYear = Math.min(entry.years[1], CURRENT_MODEL_YEAR);
      const msrp = latestMsrp * Math.pow(0.975, Math.max(0, latestYear - year));

      const age = CURRENT_MODEL_YEAR - year;
      let mileage = condition === "NEW" ? int(3, 45) : Math.round(12_000 * Math.max(0.6, age - 0.4) * between(0.45, 1.45));
      if (condition === "CPO") mileage = Math.min(mileage, int(8_000, 58_000));
      mileage = Math.min(mileage, 165_000);

      const retail =
        condition === "NEW"
          ? msrp * between(0.97, 1.06)
          : msrp * residualValue(entry, year, mileage) * (condition === "CPO" ? 1.05 : 1);
      const displayPrice = roundToNearest(Math.max(4_900, retail), 100);
      const displayDown = roundToNearest(displayPrice * between(0.08, 0.15), 50);
      const displayMonthly = Math.round(
        amortizedMonthlyPayment(displayPrice - displayDown, finance.aprPercent, finance.termMonths),
      );

      // Use the model's generated photo (and its paint color) when available; otherwise illustrated placeholders.
      const photos = MODEL_PHOTOS[`${entry.make}|${entry.model}`];
      const photo = photos?.length ? pick(photos) : null;
      const paint: Paint = photo ? { name: photo.color, hex: photo.hex, weight: 1 } : weighted(EXTERIOR_COLORS);
      const interior: Paint = entry.tags?.includes("lux") && chance(0.35) ? pick(INTERIOR_COLORS.slice(5)) : weighted(INTERIOR_COLORS);
      const drive = entry.drive.length > 1 && ["SUV", "TRUCK", "CROSSOVER"].includes(entry.body) && chance(0.6)
        ? entry.drive[entry.drive.length - 1]!
        : pick(entry.drive);
      const manual = entry.manual && chance(entry.tags?.includes("perf") ? 0.35 : 0.15);
      const isPlug = fuel === "ELECTRIC" || fuel === "PLUG_IN_HYBRID";
      const rangeFactor = (/standard|light|select|pro\b|s$/i.test(trim) ? 0.88 : /performance|plaid|gt|m50|m60|rs|cyberbeast|tri/i.test(trim) ? 0.92 : 1) *
        (year < CURRENT_MODEL_YEAR - 3 ? 0.9 : 1);
      const awdPenalty = drive === "AWD" || drive === "FOUR_WD" ? 1 : 0;
      const features = pickFeatures(entry, trimIndex, entry.trims.length, year);
      const vin = makeVin(entry, year, serial++);
      const label = `${year} ${entry.make} ${entry.model}`;
      const status = chance(0.05) ? "Pending" : chance(0.03) ? "Sold" : "Available";
      const isFeatured = status === "Available" && featured < featuredBudget && chance(0.12);
      if (isFeatured) featured++;
      const location = fuel === "ELECTRIC" && chance(0.35) ? "san-antonio-ev" : weighted(DEMO_LOCATIONS).slug;

      records.push({
        vin,
        stock_number: `${condition === "NEW" ? "N" : condition === "CPO" ? "C" : "U"}${String(year).slice(2)}${String(serial).slice(-4)}`,
        condition: condition === "CPO" ? "Certified Pre-Owned" : condition === "NEW" ? "New" : "Used",
        year,
        make: entry.make,
        model: entry.model,
        trim,
        body_style: entry.body,
        fuel_type: fuel,
        ev_specs: isPlug && entry.ev
          ? {
              range_miles: Math.round(entry.ev.range * rangeFactor),
              battery_kwh: entry.ev.kwh,
              dc_fast_charge_min: fuel === "ELECTRIC" ? entry.ev.dc : undefined,
              charge_port: fuel === "ELECTRIC" ? (entry.make === "Tesla" || year >= 2025 ? "NACS" : "CCS") : undefined,
            }
          : undefined,
        mpg: entry.mpg && fuel !== "ELECTRIC"
          ? { city: Math.max(8, entry.mpg[0] - awdPenalty - (year < 2020 ? 1 : 0)), highway: Math.max(10, entry.mpg[1] - awdPenalty) }
          : undefined,
        engine: entry.engine,
        transmission: manual ? "6-Speed Manual" : entry.trans,
        drivetrain: drive,
        mileage,
        exterior_color: paint.name,
        interior_color: interior.name,
        features,
        safety_features: pickSafety(year),
        description: description(entry, condition, year, trim, paint.name, features),
        // Back-solve the "feed" values so display_* (after multipliers) land on realistic retail numbers.
        base_price: (displayPrice / multipliers.vehiclePrice).toFixed(2),
        base_down_payment: (displayDown / multipliers.downPayment).toFixed(2),
        base_monthly_payment: (displayMonthly / multipliers.monthlyPayment).toFixed(2),
        images: photo ? [photo.url] : [0, 1, 2, 3].map((v) => placeholderUrl({ body: entry.body, color: paint.hex, variant: v, label })),
        spin_images:
          !photo && isFeatured && featured <= 10
            ? Array.from({ length: 24 }, (_, k) => placeholderUrl({ body: entry.body, color: paint.hex, angle: k * 15 }))
            : [],
        status,
        location,
        is_featured: isFeatured,
        is_demo: true,
      });
    }
  }
  return records;
}

async function seedVehicles() {
  const [multipliers, finance] = await Promise.all([getPricingMultipliers(), getFinanceAssumptions()]);
  const removed = await prisma.vehicle.deleteMany({ where: { isDemo: true } });
  if (removed.count) console.log(`[seed] removed ${removed.count} existing demo vehicles`);

  const records = buildRecords(COUNT, multipliers, finance);
  const summary = await runImport(records, {
    source: "SEED",
    sourceRef: "demo-seed",
    triggeredBy: "seed",
    fileName: `demo-seed-${COUNT}.json`,
  });
  if (summary.errors.length) {
    console.error("[seed] import errors:", summary.errors.slice(0, 10));
  }
  console.log(
    `[seed] imported ${summary.created + summary.updated}/${summary.totalRows} demo vehicles (status ${summary.status}, ${summary.warnings.length} warnings)`,
  );

  // Spread arrival dates over the last ~75 days so "Just arrived" & "Newest" sorting are meaningful.
  await prisma.$executeRaw`
    UPDATE vehicles
    SET created_at = now() - (random() * interval '75 days')
    WHERE is_demo = true`;
}

async function seedLeads() {
  const existing = await prisma.lead.count({ where: { email: { endsWith: "@example.com" } } });
  if (existing > 0) return;
  const vehicles = await prisma.vehicle.findMany({ where: { isDemo: true, status: "AVAILABLE" }, take: 20, select: { id: true, locationId: true } });
  await prisma.lead.createMany({
    data: DEMO_LEADS.map((lead, i) => {
      const vehicle = vehicles[i % Math.max(1, vehicles.length)];
      return {
        ...lead,
        type: lead.type as LeadType,
        vehicleId: ["CHECK_AVAILABILITY", "TEST_DRIVE", "TEXT_US"].includes(lead.type) ? vehicle?.id : undefined,
        locationId: vehicle?.locationId,
        status: i % 3 === 0 ? "CONTACTED" : "NEW",
        sourcePath: "/inventory",
        createdAt: new Date(NOW.getTime() - i * 9 * 3_600_000),
      };
    }),
  });
  console.log(`[seed] ${DEMO_LEADS.length} demo leads`);
}

async function main() {
  console.log(`[seed] starting (${NO_DEMO ? "no demo data" : `${COUNT} demo vehicles`})`);
  await seedAdmin();
  if (NO_DEMO) return;
  await seedLocations();
  await seedReviews();
  await seedFeedSource();
  await seedVehicles();
  await seedLeads();
  const counts = await prisma.vehicle.groupBy({ by: ["fuelType"], where: { isDemo: true }, _count: { _all: true } });
  console.log("[seed] demo vehicles by fuel type:", Object.fromEntries(counts.map((c) => [c.fuelType, c._count._all])));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
