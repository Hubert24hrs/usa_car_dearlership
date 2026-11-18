/**
 * Inventory vocabulary: labels, URL slugs and display helpers for every enum.
 * Client-safe (imports only the generated enum *types*).
 */
import type {
  BodyStyle,
  ChargePort,
  Drivetrain,
  FuelType,
  TransmissionType,
  VehicleCondition,
  VehicleStatus,
} from "@/lib/generated/prisma/enums";

export type { BodyStyle, ChargePort, Drivetrain, FuelType, TransmissionType, VehicleCondition, VehicleStatus };

export type Option<T extends string> = {
  value: T;
  label: string;
  slug: string;
  short?: string;
  description?: string;
};

export const CONDITIONS: readonly Option<VehicleCondition>[] = [
  { value: "NEW", label: "New", slug: "new" },
  { value: "USED", label: "Used", slug: "used" },
  { value: "CPO", label: "Certified Pre-Owned", short: "Certified", slug: "certified" },
];

export const FUEL_TYPES: readonly Option<FuelType>[] = [
  {
    value: "ELECTRIC",
    label: "Electric",
    short: "EV",
    slug: "electric",
    description: "Zero tailpipe emissions. Charge at home and skip the gas station.",
  },
  {
    value: "HYBRID",
    label: "Hybrid",
    slug: "hybrid",
    description: "Gas + electric working together for outstanding MPG. No plugging in.",
  },
  {
    value: "PLUG_IN_HYBRID",
    label: "Plug-in Hybrid",
    short: "PHEV",
    slug: "plug-in-hybrid",
    description: "Electric for daily drives, gas for road trips. The best of both.",
  },
  {
    value: "GAS",
    label: "Gas",
    slug: "gas",
    description: "Proven, familiar and refuels in minutes anywhere in the country.",
  },
  {
    value: "DIESEL",
    label: "Diesel",
    slug: "diesel",
    description: "Serious torque and towing with long-haul efficiency.",
  },
];

export const BODY_STYLES: readonly Option<BodyStyle>[] = [
  { value: "SUV", label: "SUV", slug: "suv" },
  { value: "SEDAN", label: "Sedan", slug: "sedan" },
  { value: "TRUCK", label: "Truck", slug: "truck" },
  { value: "CROSSOVER", label: "Crossover", slug: "crossover" },
  { value: "COUPE", label: "Coupe", slug: "coupe" },
  { value: "CONVERTIBLE", label: "Convertible", slug: "convertible" },
  { value: "HATCHBACK", label: "Hatchback", slug: "hatchback" },
  { value: "VAN", label: "Van / Minivan", short: "Van", slug: "van" },
  { value: "WAGON", label: "Wagon", slug: "wagon" },
];

export const DRIVETRAINS: readonly Option<Drivetrain>[] = [
  { value: "AWD", label: "All-Wheel Drive", short: "AWD", slug: "awd" },
  { value: "FOUR_WD", label: "Four-Wheel Drive", short: "4WD", slug: "4wd" },
  { value: "FWD", label: "Front-Wheel Drive", short: "FWD", slug: "fwd" },
  { value: "RWD", label: "Rear-Wheel Drive", short: "RWD", slug: "rwd" },
];

export const TRANSMISSION_TYPES: readonly Option<TransmissionType>[] = [
  { value: "AUTOMATIC", label: "Automatic", slug: "automatic" },
  { value: "CVT", label: "CVT", slug: "cvt" },
  { value: "DIRECT_DRIVE", label: "Single-speed (EV)", short: "Single-speed", slug: "direct-drive" },
  { value: "MANUAL", label: "Manual", slug: "manual" },
];

export const CHARGE_PORTS: readonly Option<ChargePort>[] = [
  { value: "NACS", label: "NACS (J3400)", short: "NACS", slug: "nacs" },
  { value: "CCS", label: "CCS1", short: "CCS", slug: "ccs" },
];

export const VEHICLE_STATUSES: readonly Option<VehicleStatus>[] = [
  { value: "AVAILABLE", label: "Available", slug: "available" },
  { value: "PENDING", label: "Sale Pending", short: "Pending", slug: "pending" },
  { value: "SOLD", label: "Sold", slug: "sold" },
];

export type ColorFamily = {
  slug: string;
  label: string;
  /** Swatch color for filter UI */
  hex: string;
};

export const COLOR_FAMILIES: readonly ColorFamily[] = [
  { slug: "black", label: "Black", hex: "#111111" },
  { slug: "white", label: "White", hex: "#f8f8f6" },
  { slug: "silver", label: "Silver", hex: "#c0c4c8" },
  { slug: "gray", label: "Gray", hex: "#6b7280" },
  { slug: "blue", label: "Blue", hex: "#1d4ed8" },
  { slug: "red", label: "Red", hex: "#b91c1c" },
  { slug: "green", label: "Green", hex: "#166534" },
  { slug: "brown", label: "Brown", hex: "#6b4423" },
  { slug: "beige", label: "Beige / Tan", hex: "#d6c3a0" },
  { slug: "orange", label: "Orange", hex: "#ea580c" },
  { slug: "yellow", label: "Yellow", hex: "#facc15" },
  { slug: "gold", label: "Gold", hex: "#b8963e" },
  { slug: "purple", label: "Purple", hex: "#6d28d9" },
  { slug: "other", label: "Other", hex: "#94a3b8" },
];

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "monthly_asc", label: "Monthly payment: low to high" },
  { value: "year_desc", label: "Year: newest first" },
  { value: "year_asc", label: "Year: oldest first" },
  { value: "mileage_asc", label: "Mileage: lowest first" },
  { value: "range_desc", label: "EV range: highest first" },
  { value: "relevance", label: "Best match" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export const DEFAULT_SORT: SortKey = "featured";

/** "Shop by budget" bands, by estimated monthly payment. */
export const MONTHLY_BUDGET_BANDS = [
  { label: "Under $350", min: undefined, max: 350 },
  { label: "$350 to $500", min: 350, max: 500 },
  { label: "$500 to $700", min: 500, max: 700 },
  { label: "$700 to $900", min: 700, max: 900 },
  { label: "$900+", min: 900, max: undefined },
] as const;

/** Price bands for grouped browsing. */
export const PRICE_BANDS = [
  { label: "Under $25k", min: undefined, max: 25_000 },
  { label: "$25k to $40k", min: 25_000, max: 40_000 },
  { label: "$40k to $60k", min: 40_000, max: 60_000 },
  { label: "$60k to $90k", min: 60_000, max: 90_000 },
  { label: "$90k+", min: 90_000, max: undefined },
] as const;

/** Features shoppers filter by most often (shown first in the facet list). */
export const POPULAR_FEATURES = [
  "Apple CarPlay",
  "Android Auto",
  "Heated Seats",
  "Ventilated Seats",
  "Leather Seats",
  "Sunroof / Moonroof",
  "Panoramic Roof",
  "Navigation",
  "Third-Row Seating",
  "Tow Package",
  "Remote Start",
  "Wireless Charging",
  "Premium Audio",
  "Heated Steering Wheel",
  "Head-Up Display",
  "360° Camera",
  "Power Liftgate",
  "Adaptive Cruise Control",
] as const;

export const PAGE_SIZE = 24;
export const MAX_COMPARE = 4;

// ── Lookup helpers ──────────────────────────────────────────────────────────

export function optionByValue<T extends string>(list: readonly Option<T>[], value: T | null | undefined) {
  return list.find((o) => o.value === value);
}

export function optionBySlug<T extends string>(list: readonly Option<T>[], slug: string | null | undefined) {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return list.find((o) => o.slug === s);
}

export function labelFor<T extends string>(list: readonly Option<T>[], value: T | null | undefined, short = false) {
  const option = optionByValue(list, value);
  if (!option) return value ?? "";
  return short ? (option.short ?? option.label) : option.label;
}

export const conditionLabel = (v: VehicleCondition, short = false) => labelFor(CONDITIONS, v, short);
export const fuelLabel = (v: FuelType, short = false) => labelFor(FUEL_TYPES, v, short);
export const bodyLabel = (v: BodyStyle, short = false) => labelFor(BODY_STYLES, v, short);
export const drivetrainLabel = (v: Drivetrain, short = true) => labelFor(DRIVETRAINS, v, short);
export const transmissionTypeLabel = (v: TransmissionType) => labelFor(TRANSMISSION_TYPES, v);
export const statusLabel = (v: VehicleStatus, short = false) => labelFor(VEHICLE_STATUSES, v, short);

export function colorFamilyLabel(slug: string): string {
  return COLOR_FAMILIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isPlugIn(fuel: FuelType): boolean {
  return fuel === "ELECTRIC" || fuel === "PLUG_IN_HYBRID";
}

export function isElectrified(fuel: FuelType): boolean {
  return fuel === "ELECTRIC" || fuel === "PLUG_IN_HYBRID" || fuel === "HYBRID";
}
