/**
 * Inventory filter state ⇄ URL. Pure and client-safe.
 *
 * Canonical URL scheme (SEO-friendly):
 *   /inventory/{condition}/{fuel}/{body}/{make}/{model}?{everything else}
 * Each path segment is optional and only used when exactly one value is
 * selected for that facet, e.g.
 *   /inventory/electric/suv
 *   /inventory/used/toyota/camry?price_max=30000&sort=price_asc
 */
import type { BodyStyle, Drivetrain, FuelType, TransmissionType, VehicleCondition } from "@/lib/generated/prisma/enums";
import {
  BODY_STYLES,
  COLOR_FAMILIES,
  CONDITIONS,
  DEFAULT_SORT,
  DRIVETRAINS,
  FUEL_TYPES,
  SORT_OPTIONS,
  TRANSMISSION_TYPES,
  optionBySlug,
  optionByValue,
  type Option,
  type SortKey,
} from "./constants";

export type InventoryFilters = {
  q: string;
  condition: VehicleCondition[];
  /** make slugs */
  make: string[];
  /** model slugs */
  model: string[];
  /** exact trim names */
  trim: string[];
  fuel: FuelType[];
  body: BodyStyle[];
  drivetrain: Drivetrain[];
  transmission: TransmissionType[];
  /** color family slugs */
  extColor: string[];
  intColor: string[];
  /** exact feature names (vehicle must have ALL) */
  feature: string[];
  /** location slugs */
  location: string[];
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  monthlyMin?: number;
  monthlyMax?: number;
  mileageMax?: number;
  rangeMin?: number;
  mpgMin?: number;
  sort: SortKey;
  page: number;
  view: "grid" | "list";
};

export type ListFilterKey =
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
  | "location";

export type RangeFilterKey =
  | "yearMin"
  | "yearMax"
  | "priceMin"
  | "priceMax"
  | "monthlyMin"
  | "monthlyMax"
  | "mileageMax"
  | "rangeMin"
  | "mpgMin";

export const EMPTY_FILTERS: InventoryFilters = {
  q: "",
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
  sort: DEFAULT_SORT,
  page: 1,
  view: "grid",
};

/** URL parameter names for each range filter. */
export const RANGE_PARAMS: Record<RangeFilterKey, string> = {
  yearMin: "year_min",
  yearMax: "year_max",
  priceMin: "price_min",
  priceMax: "price_max",
  monthlyMin: "monthly_min",
  monthlyMax: "monthly_max",
  mileageMax: "mileage_max",
  rangeMin: "range_min",
  mpgMin: "mpg_min",
};

type EnumListKey = "condition" | "fuel" | "body" | "drivetrain" | "transmission";
const ENUM_LISTS: Record<EnumListKey, { param: string; options: readonly Option<string>[] }> = {
  condition: { param: "condition", options: CONDITIONS },
  fuel: { param: "fuel", options: FUEL_TYPES },
  body: { param: "body", options: BODY_STYLES },
  drivetrain: { param: "drivetrain", options: DRIVETRAINS },
  transmission: { param: "transmission", options: TRANSMISSION_TYPES },
};

/** Comma-separated slug lists. */
const SLUG_LISTS: Record<"make" | "model" | "extColor" | "intColor" | "location", string> = {
  make: "make",
  model: "model",
  extColor: "ext_color",
  intColor: "int_color",
  location: "location",
};

/** Repeated params (values may contain commas). */
const REPEATED_LISTS: Record<"trim" | "feature", string> = { trim: "trim", feature: "feature" };

type ParamValue = string | string[] | undefined;
export type SearchParamsInput = URLSearchParams | Record<string, ParamValue>;

function getAll(sp: SearchParamsInput, key: string): string[] {
  if (sp instanceof URLSearchParams) return sp.getAll(key);
  const value = sp[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getFirst(sp: SearchParamsInput, key: string): string | undefined {
  return getAll(sp, key)[0];
}

function splitList(values: string[]): string[] {
  return values
    .flatMap((v) => v.split(","))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

function parsePositiveInt(value: string | undefined, max = 10_000_000): number | undefined {
  if (!value || !/^\s*\$?[\d,]+\s*$/.test(value)) return undefined;
  const n = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return n;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export type ParsedFilters = { filters: InventoryFilters; unknownSegments: string[] };

/**
 * Parse URL search params (+ optional SEO path segments after /inventory/).
 * Unknown/invalid values are dropped silently so hand-edited URLs never error.
 */
export function parseFilters(searchParams: SearchParamsInput, pathSegments: string[] = []): ParsedFilters {
  const f: InventoryFilters = { ...EMPTY_FILTERS };
  const unknownSegments: string[] = [];

  for (const key of Object.keys(ENUM_LISTS) as EnumListKey[]) {
    const { param, options } = ENUM_LISTS[key];
    const values = splitList(getAll(searchParams, param))
      .map((slug) => optionBySlug(options, slug)?.value)
      .filter((v): v is string => Boolean(v));
    (f as Record<EnumListKey, string[]>)[key] = uniqueSorted(values);
  }

  for (const [key, param] of Object.entries(SLUG_LISTS) as [keyof typeof SLUG_LISTS, string][]) {
    const values = splitList(getAll(searchParams, param)).filter((s) => SLUG_PATTERN.test(s));
    f[key] = uniqueSorted(
      key === "extColor" || key === "intColor"
        ? values.filter((s) => COLOR_FAMILIES.some((c) => c.slug === s))
        : values,
    );
  }

  for (const [key, param] of Object.entries(REPEATED_LISTS) as [keyof typeof REPEATED_LISTS, string][]) {
    f[key] = uniqueSorted(
      getAll(searchParams, param)
        .map((v) => v.trim())
        .filter((v) => v.length > 0 && v.length <= 160),
    ).slice(0, 20);
  }

  for (const [key, param] of Object.entries(RANGE_PARAMS) as [RangeFilterKey, string][]) {
    f[key] = parsePositiveInt(getFirst(searchParams, param));
  }

  const q = (getFirst(searchParams, "q") ?? "").trim().slice(0, 100);
  f.q = q;

  const sort = getFirst(searchParams, "sort");
  // Keyword searches sort by relevance unless another order is requested.
  f.sort = SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortKey) : f.q ? "relevance" : DEFAULT_SORT;
  if (f.sort === "relevance" && !f.q) f.sort = DEFAULT_SORT;
  f.page = Math.min(500, Math.max(1, parsePositiveInt(getFirst(searchParams, "page")) ?? 1));
  f.view = getFirst(searchParams, "view") === "list" ? "list" : "grid";

  // ── SEO path segments ──
  let makeFromPath: string | undefined;
  let modelFromPath: string | undefined;
  const consumed = { condition: false, fuel: false, body: false };
  for (const raw of pathSegments) {
    const segment = decodeURIComponent(raw).toLowerCase();
    const condition = !consumed.condition ? optionBySlug(CONDITIONS, segment) : undefined;
    if (condition) {
      consumed.condition = true;
      f.condition = uniqueSorted([...f.condition, condition.value]);
      continue;
    }
    const fuel = !consumed.fuel ? optionBySlug(FUEL_TYPES, segment) : undefined;
    if (fuel) {
      consumed.fuel = true;
      f.fuel = uniqueSorted([...f.fuel, fuel.value]);
      continue;
    }
    const body = !consumed.body ? optionBySlug(BODY_STYLES, segment) : undefined;
    if (body) {
      consumed.body = true;
      f.body = uniqueSorted([...f.body, body.value]);
      continue;
    }
    if (!makeFromPath && SLUG_PATTERN.test(segment)) {
      makeFromPath = segment;
      f.make = uniqueSorted([...f.make, segment]);
      continue;
    }
    if (makeFromPath && !modelFromPath && SLUG_PATTERN.test(segment)) {
      modelFromPath = segment;
      f.model = uniqueSorted([...f.model, segment]);
      continue;
    }
    unknownSegments.push(segment);
  }

  return { filters: f, unknownSegments };
}

function slugOf<T extends string>(options: readonly Option<T>[], value: T): string {
  return optionByValue(options, value)?.slug ?? value.toLowerCase();
}

/** Serialize everything that is NOT expressed in the SEO path. */
export function buildInventoryHref(filters: InventoryFilters, opts: { includePage?: boolean } = {}): string {
  const f = filters;
  const segments: string[] = [];
  const query = new URLSearchParams();

  const pathOrQuery = <T extends string>(key: EnumListKey, values: T[], options: readonly Option<T>[]) => {
    if (values.length === 1) segments.push(slugOf(options, values[0]!));
    else if (values.length > 1) query.set(ENUM_LISTS[key].param, uniqueSorted(values.map((v) => slugOf(options, v))).join(","));
  };

  if (f.q) query.set("q", f.q);
  pathOrQuery("condition", f.condition, CONDITIONS);
  pathOrQuery("fuel", f.fuel, FUEL_TYPES);
  pathOrQuery("body", f.body, BODY_STYLES);

  if (f.make.length === 1) {
    segments.push(f.make[0]!);
    if (f.model.length === 1) segments.push(f.model[0]!);
    else if (f.model.length > 1) query.set("model", uniqueSorted(f.model).join(","));
  } else {
    if (f.make.length > 1) query.set("make", uniqueSorted(f.make).join(","));
    if (f.model.length > 0) query.set("model", uniqueSorted(f.model).join(","));
  }

  for (const value of uniqueSorted(f.trim)) query.append("trim", value);
  if (f.drivetrain.length) query.set("drivetrain", uniqueSorted(f.drivetrain.map((v) => slugOf(DRIVETRAINS, v))).join(","));
  if (f.transmission.length) {
    query.set("transmission", uniqueSorted(f.transmission.map((v) => slugOf(TRANSMISSION_TYPES, v))).join(","));
  }
  if (f.extColor.length) query.set("ext_color", uniqueSorted(f.extColor).join(","));
  if (f.intColor.length) query.set("int_color", uniqueSorted(f.intColor).join(","));
  for (const value of uniqueSorted(f.feature)) query.append("feature", value);
  if (f.location.length) query.set("location", uniqueSorted(f.location).join(","));

  for (const [key, param] of Object.entries(RANGE_PARAMS) as [RangeFilterKey, string][]) {
    const value = f[key];
    if (value !== undefined) query.set(param, String(value));
  }

  if (f.sort !== DEFAULT_SORT) query.set("sort", f.sort);
  if (opts.includePage !== false && f.page > 1) query.set("page", String(f.page));
  if (f.view === "list") query.set("view", "list");

  const path = ["/inventory", ...segments.map(encodeURIComponent)].join("/");
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Stable cache key for a result set (excludes presentation-only params). */
export function filtersCacheKey(filters: InventoryFilters): string {
  return buildInventoryHref({ ...filters, view: "grid" });
}

// ── Immutable update helpers for the filter UI ──────────────────────────────

export function withFilters(filters: InventoryFilters, patch: Partial<InventoryFilters>): InventoryFilters {
  return { ...filters, ...patch, page: patch.page ?? 1 };
}

export function toggleListValue<K extends ListFilterKey>(
  filters: InventoryFilters,
  key: K,
  value: InventoryFilters[K][number],
): InventoryFilters {
  const current = filters[key] as string[];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const patch: Partial<InventoryFilters> = { [key]: next } as Partial<InventoryFilters>;
  // Models/trims only make sense within the selected makes/models.
  if (key === "make" && next.length === 0) Object.assign(patch, { model: [], trim: [] });
  if (key === "model") Object.assign(patch, { trim: [] });
  return withFilters(filters, patch);
}

export function clearFilters(filters: InventoryFilters): InventoryFilters {
  return { ...EMPTY_FILTERS, sort: filters.sort === "relevance" ? DEFAULT_SORT : filters.sort, view: filters.view };
}

export function countActiveFilters(f: InventoryFilters): number {
  let count = 0;
  for (const key of [
    "condition",
    "make",
    "model",
    "trim",
    "fuel",
    "body",
    "drivetrain",
    "transmission",
    "extColor",
    "intColor",
    "feature",
    "location",
  ] as ListFilterKey[]) {
    count += f[key].length;
  }
  for (const key of Object.keys(RANGE_PARAMS) as RangeFilterKey[]) if (f[key] !== undefined) count += 1;
  if (f.q) count += 1;
  return count;
}

// ── Active filter chips ─────────────────────────────────────────────────────

export type FilterChip = { id: string; label: string; next: InventoryFilters };

export type ChipLabels = {
  makes?: Record<string, string>;
  models?: Record<string, string>;
  locations?: Record<string, string>;
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function rangeLabel(min: number | undefined, max: number | undefined, fmt: (n: number) => string, suffix = "") {
  if (min !== undefined && max !== undefined) return `${fmt(min)} to ${fmt(max)}${suffix}`;
  if (min !== undefined) return `${fmt(min)}+${suffix}`;
  return `Under ${fmt(max!)}${suffix}`;
}

export function activeFilterChips(f: InventoryFilters, labels: ChipLabels = {}): FilterChip[] {
  const chips: FilterChip[] = [];
  const listChip = <K extends ListFilterKey>(key: K, label: (v: string) => string) => {
    for (const value of f[key] as string[]) {
      chips.push({ id: `${key}:${value}`, label: label(value), next: toggleListValue(f, key, value as never) });
    }
  };
  if (f.q) chips.push({ id: "q", label: `“${f.q}”`, next: withFilters(f, { q: "", sort: f.sort === "relevance" ? DEFAULT_SORT : f.sort }) });
  listChip("condition", (v) => optionByValue(CONDITIONS, v as VehicleCondition)?.label ?? v);
  listChip("make", (v) => labels.makes?.[v] ?? v);
  listChip("model", (v) => labels.models?.[v] ?? v);
  listChip("trim", (v) => v);
  listChip("fuel", (v) => optionByValue(FUEL_TYPES, v as FuelType)?.label ?? v);
  listChip("body", (v) => optionByValue(BODY_STYLES, v as BodyStyle)?.label ?? v);
  listChip("drivetrain", (v) => optionByValue(DRIVETRAINS, v as Drivetrain)?.short ?? v);
  listChip("transmission", (v) => optionByValue(TRANSMISSION_TYPES, v as TransmissionType)?.label ?? v);
  listChip("extColor", (v) => `${COLOR_FAMILIES.find((c) => c.slug === v)?.label ?? v} exterior`);
  listChip("intColor", (v) => `${COLOR_FAMILIES.find((c) => c.slug === v)?.label ?? v} interior`);
  listChip("feature", (v) => v);
  listChip("location", (v) => labels.locations?.[v] ?? v);

  if (f.yearMin !== undefined || f.yearMax !== undefined) {
    chips.push({
      id: "year",
      label: rangeLabel(f.yearMin, f.yearMax, String),
      next: withFilters(f, { yearMin: undefined, yearMax: undefined }),
    });
  }
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    chips.push({
      id: "price",
      label: rangeLabel(f.priceMin, f.priceMax, usd),
      next: withFilters(f, { priceMin: undefined, priceMax: undefined }),
    });
  }
  if (f.monthlyMin !== undefined || f.monthlyMax !== undefined) {
    chips.push({
      id: "monthly",
      label: rangeLabel(f.monthlyMin, f.monthlyMax, usd, "/mo"),
      next: withFilters(f, { monthlyMin: undefined, monthlyMax: undefined }),
    });
  }
  if (f.mileageMax !== undefined) {
    chips.push({
      id: "mileage",
      label: `Under ${f.mileageMax.toLocaleString("en-US")} mi`,
      next: withFilters(f, { mileageMax: undefined }),
    });
  }
  if (f.rangeMin !== undefined) {
    chips.push({ id: "range", label: `${f.rangeMin}+ mi EV range`, next: withFilters(f, { rangeMin: undefined }) });
  }
  if (f.mpgMin !== undefined) {
    chips.push({ id: "mpg", label: `${f.mpgMin}+ MPG`, next: withFilters(f, { mpgMin: undefined }) });
  }
  return chips;
}

/** Human title for a filtered result set, e.g. "Used Toyota Camry" or "Electric SUVs". */
export function describeFilters(f: InventoryFilters, labels: ChipLabels = {}): string {
  const parts: string[] = [];
  if (f.condition.length === 1) parts.push(optionByValue(CONDITIONS, f.condition[0])!.label);
  if (f.fuel.length === 1) parts.push(optionByValue(FUEL_TYPES, f.fuel[0])!.label);
  if (f.make.length === 1) parts.push(labels.makes?.[f.make[0]!] ?? f.make[0]!);
  if (f.model.length === 1) parts.push(labels.models?.[f.model[0]!] ?? f.model[0]!);
  if (f.body.length === 1) {
    const body = optionByValue(BODY_STYLES, f.body[0])!;
    parts.push(body.short ?? body.label);
    return `${parts.join(" ")}s`; // every body label pluralizes with "s"
  }
  return parts.length ? `${parts.join(" ")} vehicles` : "All vehicles";
}
