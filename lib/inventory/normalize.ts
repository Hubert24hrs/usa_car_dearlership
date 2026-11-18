/**
 * Normalizers that turn the messy values found in dealer feeds ("Pre-Owned",
 * "4x4", "Gasoline Fuel", "Cabriolet", "Midnight Black Metallic"…) into our
 * canonical enums and facet values. Pure and client-safe.
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

function clean(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeCondition(input: unknown): VehicleCondition | null {
  const v = clean(input);
  if (!v) return null;
  if (/(^|\b)(cpo|certified)/.test(v)) return "CPO";
  if (/^(n|new)$/.test(v) || v.startsWith("new")) return "NEW";
  if (/^(u|used)$/.test(v) || /used|pre[- ]?owned|preowned/.test(v)) return "USED";
  return null;
}

export function normalizeFuelType(input: unknown): FuelType | null {
  const v = clean(input);
  if (!v) return null;
  if (/plug[- ]?in|phev/.test(v)) return "PLUG_IN_HYBRID";
  if (/hybrid|hev\b|gas\/electric|electric\/gas/.test(v)) return "HYBRID";
  if (/^(ev|bev)$|electric|battery/.test(v)) return "ELECTRIC";
  if (/diesel|tdi|duramax|cummins|power ?stroke|ecodiesel/.test(v)) return "DIESEL";
  if (/gas|petrol|unleaded|flex|e85|ffv|regular|premium|turbo/.test(v)) return "GAS";
  return null;
}

export function normalizeBodyStyle(input: unknown): BodyStyle | null {
  const v = clean(input);
  if (!v) return null;
  if (/convertible|cabriolet|roadster|spyder|spider/.test(v)) return "CONVERTIBLE";
  if (/wagon|estate|allroad|all-terrain/.test(v)) return "WAGON";
  if (/van|minivan/.test(v)) return "VAN";
  if (/truck|pickup|pick-up|crew cab|crewmax|double cab|extended cab|regular cab|supercrew|supercab|quad cab|mega cab/.test(v)) return "TRUCK";
  if (/hatch|liftback|5dr car|5 door/.test(v)) return "HATCHBACK";
  if (/crossover|cuv/.test(v)) return "CROSSOVER";
  if (/suv|sport utility|utility/.test(v)) return "SUV";
  if (/coupe|2dr car|2 door/.test(v)) return "COUPE";
  if (/sedan|4dr car|4 door|saloon/.test(v)) return "SEDAN";
  return null;
}

export function normalizeDrivetrain(input: unknown): Drivetrain | null {
  const v = clean(input);
  if (!v) return null;
  if (/4x4|4wd|four[- ]?w(heel|d)\b|4 wheel|4-wheel/.test(v)) return "FOUR_WD";
  if (/awd|all[- ]wheel|quattro|4matic|xdrive|sh-awd|e-four|symmetrical|4motion/.test(v)) return "AWD";
  if (/rwd|rear[- ]wheel|4x2 rear/.test(v)) return "RWD";
  if (/fwd|front[- ]wheel/.test(v)) return "FWD";
  if (/2wd|4x2/.test(v)) return "RWD";
  return null;
}

export function normalizeTransmissionType(transmission: unknown, fuelType?: FuelType | null): TransmissionType {
  const v = clean(transmission);
  if (/cvt|continuously variable|e-cvt|ecvt|ivt/.test(v)) return "CVT";
  if (/manual|\bmt\b|stick/.test(v)) return "MANUAL";
  if (/single[- ]speed|1[- ]speed|direct drive|reduction gear/.test(v)) return "DIRECT_DRIVE";
  if (!v && fuelType === "ELECTRIC") return "DIRECT_DRIVE";
  return "AUTOMATIC";
}

export function normalizeChargePort(input: unknown): ChargePort | null {
  const v = clean(input);
  if (!v) return null;
  if (/nacs|j3400|tesla/.test(v)) return "NACS";
  if (/ccs|combo|sae/.test(v)) return "CCS";
  return null;
}

export function normalizeStatus(input: unknown): VehicleStatus | null {
  const v = clean(input);
  if (!v) return null;
  if (/sold|delivered/.test(v)) return "SOLD";
  if (/pending|hold|deposit|in transit/.test(v)) return "PENDING";
  if (/avail|in stock|instock|active|for sale/.test(v)) return "AVAILABLE";
  return null;
}

export function normalizeBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  const v = clean(input);
  if (!v) return null;
  if (["true", "yes", "y", "1", "x"].includes(v)) return true;
  if (["false", "no", "n", "0"].includes(v)) return false;
  return null;
}

// Ordered: more specific words first (e.g. "pearl white" before generic).
const COLOR_RULES: [string, RegExp][] = [
  ["black", /black|ebony|onyx|obsidian|jet|raven|midnight|piano|phantom/],
  ["white", /white|pearl|snow|glacier|polar|arctic|alpine|frost|chalk|ivory white/],
  ["silver", /silver|platinum|quicksilver|chrome|sterling|iridium|celestite/],
  ["gray", /gr[ae]y|graphite|gunmetal|charcoal|slate|magnetic|granite|carbon|titanium|steel|cement|meteor|anvil|nardo/],
  ["blue", /blue|navy|cobalt|sapphire|azure|indigo|ocean|marine|lapis|aqua|teal/],
  ["red", /red|ruby|crimson|burgundy|maroon|cherry|scarlet|garnet|cardinal|wine|rosso/],
  ["green", /green|emerald|olive|forest|jade|army|sage|moss|cactus|eruption/],
  ["orange", /orange|tangerine|copper|sunset|lava|blaze|amber/],
  ["yellow", /yellow|lemon|lime|citrus/],
  ["gold", /gold|champagne/],
  ["purple", /purple|violet|plum|amethyst|lilac/],
  ["beige", /beige|tan|sand|khaki|cream|ivory|parchment|macchiato|oyster|almond|dune|desert|stone|bisque|linen/],
  ["brown", /brown|bronze|mocha|espresso|chestnut|cognac|saddle|mahogany|coffee|walnut|caramel|chocolate|terra/],
];

/** Map a marketing color name to a facet family slug (see COLOR_FAMILIES). */
export function colorFamily(colorName: unknown): string {
  const v = clean(colorName);
  if (!v) return "other";
  for (const [family, pattern] of COLOR_RULES) {
    if (pattern.test(v)) return family;
  }
  return "other";
}

/**
 * Split list-ish values: arrays, JSON arrays, or strings separated by
 * "|", ";", "," or newlines. De-duplicates while preserving order.
 */
export const LIST_SEPARATORS = /[|;\n]+|,/;
/** URLs may legitimately contain commas (CDN transforms), so only split on a comma that starts a new URL. */
export const URL_LIST_SEPARATORS = /[|;\s]+|,(?=\s*(?:https?:|\/))/;

export function toStringList(input: unknown, separators: RegExp = LIST_SEPARATORS): string[] {
  let items: unknown[] = [];
  if (Array.isArray(input)) items = input;
  else if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = trimmed.split(separators);
      }
    } else {
      items = trimmed.split(separators);
    }
  } else if (input !== null && input !== undefined) {
    items = [input];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const value = String(item ?? "").trim();
    if (value && !seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase());
      result.push(value);
    }
  }
  return result;
}

/** Parse "$32,495.00", "32495", 32495 → 32495. Empty → undefined. Bad → NaN. */
export function toNumber(input: unknown): number | undefined {
  if (input === null || input === undefined) return undefined;
  if (typeof input === "number") return input;
  const s = String(input).trim();
  if (!s) return undefined;
  const n = Number(s.replace(/[$,\s]|usd/gi, "").replace(/mi(les)?$/i, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}
