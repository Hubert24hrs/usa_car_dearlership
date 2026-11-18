"use server";

/**
 * Trade-in helpers:
 *  • decodeVin — free NHTSA vPIC API (no key). Disable with VIN_DECODER=none.
 *  • lookupPlate — requires a paid data provider; stub returns "not configured".
 *  • getTradeInEstimate — instant PRELIMINARY range from comparable vehicles in
 *    our own inventory (wholesale-adjusted). Swap in a valuation provider
 *    (e.g. Black Book / KBB ICO) via the same function signature.
 */
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/inventory/slug";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

export type DecodedVin = {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  fuelType?: string;
  driveType?: string;
};

type DecodeResult = { ok: true; vehicle: DecodedVin } | { ok: false; error: string };

const vinSchema = z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/);

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export async function decodeVin(input: string): Promise<DecodeResult> {
  const parsed = vinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid 17-character VIN." };
  if (process.env.VIN_DECODER === "none") return { ok: false, error: "VIN lookup is not enabled." };

  const ip = getClientIp(await headers());
  if (!(await rateLimit(`vin:${ip}`, LIMITS.vinLookup)).success) {
    return { ok: false, error: "Too many lookups. Please wait a moment." };
  }
  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(parsed.data)}?format=json`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 86_400 } },
    );
    if (!response.ok) throw new Error(`vPIC ${response.status}`);
    const json = (await response.json()) as { Results?: Record<string, string>[] };
    const r = json.Results?.[0];
    if (!r || !r.Make) return { ok: false, error: "We couldn't decode that VIN. Please enter the details manually." };
    return {
      ok: true,
      vehicle: {
        vin: parsed.data,
        year: r.ModelYear ? Number(r.ModelYear) : undefined,
        make: r.Make ? titleCase(r.Make) : undefined,
        model: r.Model || undefined,
        trim: r.Trim || r.Series || undefined,
        bodyClass: r.BodyClass || undefined,
        fuelType: r.FuelTypePrimary || undefined,
        driveType: r.DriveType || undefined,
      },
    };
  } catch (error) {
    console.warn("[vin] decode failed:", (error as Error).message);
    return { ok: false, error: "VIN lookup is temporarily unavailable. Please enter the details manually." };
  }
}

export async function lookupPlate(_plate: string, _state: string): Promise<DecodeResult> {
  if (!process.env.PLATE_LOOKUP_PROVIDER) {
    return { ok: false, error: "License plate lookup isn't available yet. Please use your VIN or enter the details." };
  }
  // Integrate your licensed plate-to-VIN provider here.
  return { ok: false, error: "Plate lookup provider is not implemented." };
}

const estimateSchema = z.object({
  year: z.number().int().min(1981).max(new Date().getFullYear() + 2),
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(60),
  mileage: z.number().int().min(0).max(1_000_000),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
});

export type TradeInEstimate =
  | { ok: true; low: number; high: number; comps: number; method: "inventory-comps" }
  | { ok: false; error: string };

const CONDITION_FACTOR = { excellent: 1, good: 0.94, fair: 0.85, poor: 0.72 } as const;
const WHOLESALE_FACTOR = 0.82;

export async function getTradeInEstimate(input: unknown): Promise<TradeInEstimate> {
  const parsed = estimateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter year, make, model, mileage and condition." };
  const { year, make, model, mileage, condition } = parsed.data;

  const ip = getClientIp(await headers());
  if (!(await rateLimit(`tradein:${ip}`, LIMITS.vinLookup)).success) {
    return { ok: false, error: "Too many requests. Please wait a moment." };
  }

  const comps = await prisma.vehicle.findMany({
    where: {
      makeSlug: slugify(make),
      modelSlug: { startsWith: slugify(model).split("-")[0] ?? slugify(model) },
      year: { gte: year - 3, lte: year + 3 },
      condition: { in: ["USED", "CPO"] },
    },
    select: { year: true, mileage: true, displayPrice: true },
    take: 50,
  });
  if (comps.length === 0) {
    return { ok: false, error: "We need to take a closer look. Submit the form and an appraiser will send your offer." };
  }

  const values = comps.map((c) => {
    const yearAdj = Math.pow(0.93, c.year - year); // older trade-in → lower
    const mileageAdj = 1 - Math.max(-0.1, Math.min(0.25, ((mileage - c.mileage) / 100_000) * 0.15));
    return Number(c.displayPrice) * yearAdj * mileageAdj;
  });
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = average * WHOLESALE_FACTOR * CONDITION_FACTOR[condition];
  const round = (n: number) => Math.max(500, Math.round(n / 100) * 100);
  return { ok: true, low: round(mid * 0.94), high: round(mid * 1.06), comps: comps.length, method: "inventory-comps" };
}
