/**
 * Validation schema for a single canonical import record (snake_case keys from
 * the inventory spec). Values are coerced/normalized leniently — dealer feeds
 * are messy — but anything that would produce a wrong listing is rejected.
 */
import { z } from "zod";
import {
  normalizeBodyStyle,
  normalizeBoolean,
  normalizeChargePort,
  normalizeCondition,
  normalizeDrivetrain,
  normalizeFuelType,
  normalizeStatus,
  toNumber,
  toStringList,
  URL_LIST_SEPARATORS,
} from "../normalize";
import { normalizeVin, VIN_REGEX } from "../vin";

const MAX_MODEL_YEAR = new Date().getFullYear() + 2;

const BODY_VALUES = ["SEDAN", "SUV", "CROSSOVER", "TRUCK", "COUPE", "CONVERTIBLE", "HATCHBACK", "VAN", "WAGON"] as const;
const FUEL_VALUES = ["GAS", "DIESEL", "HYBRID", "PLUG_IN_HYBRID", "ELECTRIC"] as const;
const DRIVE_VALUES = ["FWD", "RWD", "AWD", "FOUR_WD"] as const;
const CONDITION_VALUES = ["NEW", "USED", "CPO"] as const;
const STATUS_VALUES = ["AVAILABLE", "PENDING", "SOLD"] as const;

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const optionalText = (max: number) =>
  z.preprocess((v) => (isBlank(v) ? undefined : String(v).trim()), z.string().max(max).optional());

const requiredText = (label: string, max: number) =>
  z.preprocess(
    (v) => (isBlank(v) ? "" : String(v).trim()),
    z.string().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`),
  );

type NumOpts = { int?: boolean; min?: number; max?: number };

function numberSchema(label: string, o: NumOpts) {
  let schema = z.number({
    error: (issue) => (issue.input === undefined ? `${label} is required` : `${label} must be a number`),
  });
  if (o.min !== undefined) schema = schema.min(o.min, `${label} must be at least ${o.min}`);
  if (o.max !== undefined) schema = schema.max(o.max, `${label} must be at most ${o.max}`);
  return schema;
}

function coerceNumber(o: NumOpts) {
  return (v: unknown) => {
    const n = toNumber(v);
    if (n === undefined) return undefined;
    return o.int && Number.isFinite(n) ? Math.round(n) : n;
  };
}

const requiredNumber = (label: string, o: NumOpts = {}) => z.preprocess(coerceNumber(o), numberSchema(label, o));
const optionalNumber = (label: string, o: NumOpts = {}) =>
  z.preprocess(coerceNumber(o), numberSchema(label, o).optional());

function enumField<const T extends readonly [string, ...string[]]>(
  label: string,
  values: T,
  normalize: (v: unknown) => T[number] | null,
) {
  return z.preprocess(
    (v) => (isBlank(v) ? undefined : (normalize(v) ?? String(v))),
    z.enum(values, {
      error: (issue) =>
        issue.input === undefined ? `${label} is required` : `Unrecognized ${label.toLowerCase()} "${String(issue.input)}"`,
    }),
  );
}

function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T,
  normalize: (v: unknown) => T[number] | null,
) {
  return z.preprocess((v) => (isBlank(v) ? undefined : (normalize(v) ?? undefined)), z.enum(values).optional());
}

/** Absolute http(s) URLs or site-relative paths ("/uploads/…"); never "//host" or javascript: */
export function isAcceptableUrl(value: string): boolean {
  return /^https?:\/\/[^\s"'<>]+$/i.test(value) || /^\/(?!\/)[^\s"'<>]*$/.test(value);
}

const urlList = z.preprocess(
  (v) => toStringList(v, URL_LIST_SEPARATORS),
  z.array(z.string().max(2048).refine(isAcceptableUrl, "Media URLs must be http(s) URLs or site-relative paths")).max(100),
);

const optionalUrl = (label: string) =>
  z.preprocess(
    (v) => (isBlank(v) ? undefined : String(v).trim()),
    z.string().max(2048).refine(isAcceptableUrl, `${label} must be an http(s) URL`).optional(),
  );

const stringList = z.preprocess((v) => toStringList(v), z.array(z.string().max(160)).max(250));

const optionalBoolean = z.preprocess((v) => normalizeBoolean(v) ?? undefined, z.boolean().optional());

export const importRecordSchema = z
  .object({
    vin: z.preprocess(
      (v) => normalizeVin(String(v ?? "")),
      z.string().regex(VIN_REGEX, "VIN must be 17 characters (letters I, O and Q are not allowed)"),
    ),
    stock_number: requiredText("Stock number", 40),
    condition: enumField("Condition", CONDITION_VALUES, normalizeCondition),
    year: requiredNumber("Year", { int: true, min: 1981, max: MAX_MODEL_YEAR }),
    make: requiredText("Make", 60),
    model: requiredText("Model", 80),
    trim: optionalText(120),
    body_style: enumField("Body style", BODY_VALUES, normalizeBodyStyle),
    fuel_type: enumField("Fuel type", FUEL_VALUES, normalizeFuelType),
    ev_range_miles: optionalNumber("EV range", { int: true, min: 1, max: 1000 }),
    ev_battery_kwh: optionalNumber("Battery capacity", { min: 1, max: 300 }),
    ev_dc_fast_charge_min: optionalNumber("DC fast-charge time", { int: true, min: 1, max: 600 }),
    ev_charge_port: optionalEnum(["NACS", "CCS"] as const, normalizeChargePort),
    mpg_city: optionalNumber("City MPG", { int: true, min: 1, max: 250 }),
    mpg_highway: optionalNumber("Highway MPG", { int: true, min: 1, max: 250 }),
    mpg_combined: optionalNumber("Combined MPG", { int: true, min: 1, max: 250 }),
    engine: optionalText(160),
    transmission: optionalText(120),
    drivetrain: enumField("Drivetrain", DRIVE_VALUES, normalizeDrivetrain),
    mileage: optionalNumber("Mileage", { int: true, min: 0, max: 1_500_000 }),
    exterior_color: optionalText(80),
    interior_color: optionalText(80),
    features: stringList,
    safety_features: stringList,
    description: optionalText(8000),
    base_price: requiredNumber("Price", { min: 1, max: 10_000_000 }),
    base_down_payment: optionalNumber("Down payment", { min: 0, max: 10_000_000 }),
    base_monthly_payment: optionalNumber("Monthly payment", { min: 0, max: 100_000 }),
    images: urlList,
    spin_images: urlList,
    video_url: optionalUrl("Video URL"),
    carfax_url: optionalUrl("Vehicle history URL"),
    status: optionalEnum(STATUS_VALUES, normalizeStatus),
    location: optionalText(120),
    location_id: optionalText(64),
    is_featured: optionalBoolean,
    is_demo: optionalBoolean,
  })
  .superRefine((record, ctx) => {
    if (record.condition !== "NEW" && record.mileage === undefined) {
      ctx.addIssue({ code: "custom", path: ["mileage"], message: "Mileage is required for used and certified vehicles" });
    }
    if (record.base_down_payment !== undefined && record.base_down_payment > record.base_price) {
      ctx.addIssue({ code: "custom", path: ["base_down_payment"], message: "Down payment cannot exceed the price" });
    }
  });

export type ImportRecord = z.output<typeof importRecordSchema>;
