/**
 * Understands free-text car searches such as "2021 toyota camry under 25k",
 * "electric suv", "chevy silverado" or "porsche 911", so the search page can
 * find the closest cars in stock when nothing matches exactly.
 *
 * Pure functions: the make/model vocabulary comes from the inventory (including
 * sold vehicles), plus a small table of well-known makes the dealership may
 * not carry.
 */
import { bodyLabel, conditionLabel, fuelLabel, type BodyStyle, type FuelType, type VehicleCondition } from "./constants";

export type VocabularyModel = {
  make: string;
  makeSlug: string;
  model: string;
  modelSlug: string;
  bodyStyle: BodyStyle;
  fuelType: FuelType;
  avgPrice: number;
};

export type SearchVocabulary = {
  makes: { name: string; slug: string }[];
  models: VocabularyModel[];
};

export type SearchIntent = {
  /** Makes mentioned; `slug` is null for makes the dealership doesn't carry. */
  makes: { name: string; slug: string | null }[];
  /** Known models mentioned (from the vocabulary). */
  models: VocabularyModel[];
  bodyStyles: BodyStyle[];
  fuelTypes: FuelType[];
  conditions: VehicleCondition[];
  year?: number;
  priceMax?: number;
  monthlyMax?: number;
  /** Price to aim for when the query names a model or a premium make. */
  targetPrice?: number;
  luxury: boolean;
  /** Human-readable interpretation, e.g. ["Toyota Camry", "Under $25,000"]. */
  terms: string[];
  /** Words the parser could not account for (empty when the whole query was understood). */
  leftover: string[];
};

/** Words that carry no meaning for a car search. */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "with", "in", "on", "of", "to", "my", "me", "i", "im", "looking", "want", "need",
  "find", "show", "search", "car", "cars", "vehicle", "vehicles", "auto", "autos", "sale", "near", "best", "good", "great",
  "under", "below", "less", "than", "max", "up", "price", "priced", "around", "about", "k", "thousand", "dollars", "month",
  "monthly", "per", "mo", "payment", "s",
]);

/** Lowercase, strip accents and punctuation: "F-150" → "f 150", "Mercedes-Benz" → "mercedes benz". */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const compact = (value: string) => value.replace(/ /g, "");
const hasWords = (haystack: string, phrase: string) => ` ${haystack} `.includes(` ${phrase} `);

const BODY_WORDS: [RegExp, BodyStyle[]][] = [
  [/\b(suvs?|sport utility)\b/, ["SUV"]],
  [/\b(crossovers?|cuv)\b/, ["CROSSOVER"]],
  [/\b(sedans?|saloon)\b/, ["SEDAN"]],
  [/\b(trucks?|pickups?|pick up)\b/, ["TRUCK"]],
  [/\b(coupes?|sports? cars?)\b/, ["COUPE"]],
  [/\b(convertibles?|cabriolets?|cabrio|roadsters?|spyder|spider|drop top)\b/, ["CONVERTIBLE"]],
  [/\b(hatchbacks?|hatch)\b/, ["HATCHBACK"]],
  [/\b(vans?|minivans?)\b/, ["VAN"]],
  [/\b(wagons?|estate)\b/, ["WAGON"]],
  [/\b(family car|3 row|three row|7 seater|seven seater|8 seater)\b/, ["SUV", "VAN"]],
];

const FUEL_WORDS: [RegExp, FuelType][] = [
  [/\b(plug in|plugin|phev)\b/, "PLUG_IN_HYBRID"],
  [/\b(electric|ev|evs|bev)\b/, "ELECTRIC"],
  [/\b(diesel|tdi|duramax|powerstroke|power stroke|cummins|ecodiesel)\b/, "DIESEL"],
  [/\b(gas|gasoline|petrol)\b/, "GAS"],
];

const CONDITION_WORDS: [RegExp, VehicleCondition][] = [
  [/\b(certified|cpo)\b/, "CPO"],
  [/\b(used|pre owned|preowned|second hand)\b/, "USED"],
  [/\bnew\b/, "NEW"],
];

const MAKE_ALIASES: Record<string, string> = {
  chevy: "chevrolet",
  vw: "volkswagen",
  volks: "volkswagen",
  mercedes: "mercedes benz",
  merc: "mercedes benz",
  benz: "mercedes benz",
  beemer: "bmw",
  bimmer: "bmw",
};

/** Well-known makes the dealership may not carry, with what shoppers usually mean by them. */
const OTHER_MAKES: Record<string, { name: string; bodyStyles?: BodyStyle[]; fuelTypes?: FuelType[]; targetPrice: number; luxury?: boolean }> = {
  porsche: { name: "Porsche", bodyStyles: ["COUPE", "CONVERTIBLE", "SUV"], targetPrice: 95_000, luxury: true },
  ferrari: { name: "Ferrari", bodyStyles: ["COUPE", "CONVERTIBLE"], targetPrice: 250_000, luxury: true },
  lamborghini: { name: "Lamborghini", bodyStyles: ["COUPE", "CONVERTIBLE"], targetPrice: 250_000, luxury: true },
  mclaren: { name: "McLaren", bodyStyles: ["COUPE", "CONVERTIBLE"], targetPrice: 220_000, luxury: true },
  "aston martin": { name: "Aston Martin", bodyStyles: ["COUPE", "CONVERTIBLE"], targetPrice: 180_000, luxury: true },
  bentley: { name: "Bentley", bodyStyles: ["SEDAN", "COUPE", "SUV"], targetPrice: 200_000, luxury: true },
  "rolls royce": { name: "Rolls-Royce", bodyStyles: ["SEDAN", "SUV"], targetPrice: 350_000, luxury: true },
  maserati: { name: "Maserati", bodyStyles: ["SEDAN", "SUV", "COUPE"], targetPrice: 95_000, luxury: true },
  "land rover": { name: "Land Rover", bodyStyles: ["SUV"], targetPrice: 85_000, luxury: true },
  "range rover": { name: "Range Rover", bodyStyles: ["SUV"], targetPrice: 100_000, luxury: true },
  jaguar: { name: "Jaguar", bodyStyles: ["SUV", "SEDAN"], targetPrice: 65_000, luxury: true },
  genesis: { name: "Genesis", bodyStyles: ["SEDAN", "SUV"], targetPrice: 55_000, luxury: true },
  cadillac: { name: "Cadillac", bodyStyles: ["SUV", "SEDAN"], targetPrice: 65_000, luxury: true },
  lincoln: { name: "Lincoln", bodyStyles: ["SUV"], targetPrice: 60_000, luxury: true },
  volvo: { name: "Volvo", bodyStyles: ["SUV", "SEDAN", "WAGON"], targetPrice: 52_000 },
  acura: { name: "Acura", bodyStyles: ["SUV", "SEDAN"], targetPrice: 45_000 },
  infiniti: { name: "Infiniti", bodyStyles: ["SUV", "SEDAN"], targetPrice: 50_000 },
  "alfa romeo": { name: "Alfa Romeo", bodyStyles: ["SEDAN", "SUV"], targetPrice: 48_000 },
  buick: { name: "Buick", bodyStyles: ["SUV", "CROSSOVER"], targetPrice: 35_000 },
  chrysler: { name: "Chrysler", bodyStyles: ["VAN", "SEDAN"], targetPrice: 42_000 },
  dodge: { name: "Dodge", bodyStyles: ["COUPE", "SUV", "SEDAN"], targetPrice: 40_000 },
  mitsubishi: { name: "Mitsubishi", bodyStyles: ["SUV", "CROSSOVER"], targetPrice: 28_000 },
  mini: { name: "MINI", bodyStyles: ["HATCHBACK", "CONVERTIBLE"], targetPrice: 33_000 },
  fiat: { name: "Fiat", bodyStyles: ["HATCHBACK"], targetPrice: 25_000 },
  polestar: { name: "Polestar", fuelTypes: ["ELECTRIC"], bodyStyles: ["SEDAN", "SUV"], targetPrice: 55_000 },
  lucid: { name: "Lucid", fuelTypes: ["ELECTRIC"], bodyStyles: ["SEDAN", "SUV"], targetPrice: 80_000, luxury: true },
  rivian: { name: "Rivian", fuelTypes: ["ELECTRIC"], bodyStyles: ["TRUCK", "SUV"], targetPrice: 80_000 },
};

/** First words that are too generic to identify a model on their own ("Model Y", "Grand Cherokee"). */
const GENERIC_FIRST_WORDS = new Set(["model", "grand", "new", "super", "all", "the", "sport", "series", "class", "crew", "cargo"]);

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** "30k" → 30000, "30,000" → 30000, "30" (as a car budget) → 30000. */
function parseAmount(value: string, suffix: string | undefined, assumeThousandsBelow: number): number | undefined {
  const n = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (suffix) return Math.round(n * 1000);
  return n < assumeThousandsBelow ? Math.round(n * 1000) : Math.round(n);
}

function matchModels(text: string, vocabulary: SearchVocabulary, makeSlugs: Set<string>): VocabularyModel[] {
  const textCompact = compact(text);
  const matches: { model: VocabularyModel; strength: number }[] = [];
  for (const model of vocabulary.models) {
    const name = normalizeText(model.model);
    if (!name) continue;
    const shortAlpha = name.length <= 2 && !/\d/.test(name);
    let strength = 0;
    if (hasWords(text, name) && (!shortAlpha || makeSlugs.has(model.makeSlug))) strength = name.length + 10;
    else if (compact(name).length >= 4 && /\d/.test(name) && textCompact.includes(compact(name))) strength = name.length + 5; // "f150", "cx5"
    else {
      const first = name.split(" ")[0]!;
      if (name.includes(" ") && first.length >= 4 && !/^\d+$/.test(first) && !GENERIC_FIRST_WORDS.has(first) && hasWords(text, first)) {
        strength = first.length; // "silverado" → "Silverado 1500"
      }
    }
    if (strength > 0) matches.push({ model, strength });
  }
  if (matches.length === 0) return [];
  const best = Math.max(...matches.map((m) => m.strength));
  return matches.filter((m) => m.strength === best).map((m) => m.model);
}

export function parseSearchIntent(query: string, vocabulary: SearchVocabulary): SearchIntent {
  const raw = query.toLowerCase();
  const text = normalizeText(query);
  const intent: SearchIntent = { makes: [], models: [], bodyStyles: [], fuelTypes: [], conditions: [], luxury: false, terms: [], leftover: [] };

  // Words accounted for by some rule; whatever is left tells us the query was not fully understood.
  const explained = new Set<string>();
  const explain = (phrase: string) => normalizeText(phrase).split(" ").forEach((word) => word && explained.add(word));
  const explainMatches = (pattern: RegExp, source = text) => (source.match(new RegExp(pattern.source, "g")) ?? []).forEach(explain);

  // Makes (inventory makes first, then aliases, then well-known makes we may not carry).
  const aliased = ` ${text} `
    .replace(/ ([a-z]+) /g, (whole, word: string) => {
      if (!MAKE_ALIASES[word]) return whole;
      explained.add(word);
      return ` ${MAKE_ALIASES[word]} `;
    })
    .trim();
  for (const make of vocabulary.makes) {
    const name = normalizeText(make.name);
    if (hasWords(aliased, name)) {
      intent.makes.push({ name: make.name, slug: make.slug });
      explain(name);
    }
  }
  for (const [key, info] of Object.entries(OTHER_MAKES)) {
    if (hasWords(aliased, key) && !intent.makes.some((m) => normalizeText(m.name) === key)) {
      intent.makes.push({ name: info.name, slug: null });
      explain(key);
      intent.bodyStyles.push(...(info.bodyStyles ?? []));
      intent.fuelTypes.push(...(info.fuelTypes ?? []));
      intent.targetPrice ??= info.targetPrice;
      intent.luxury ||= Boolean(info.luxury);
    }
  }

  // Models (imply make, body style, fuel and a typical price).
  const makeSlugs = new Set(intent.makes.map((m) => m.slug).filter((s): s is string => Boolean(s)));
  intent.models = matchModels(aliased, vocabulary, makeSlugs).filter((m) => makeSlugs.size === 0 || makeSlugs.has(m.makeSlug));
  for (const model of intent.models) {
    if (!intent.makes.some((m) => m.slug === model.makeSlug)) intent.makes.push({ name: model.make, slug: model.makeSlug });
    const name = normalizeText(model.model);
    for (const word of aliased.split(" ")) {
      if (hasWords(name, word) || (word.length >= 3 && compact(name) === word)) explained.add(word);
    }
  }
  if (intent.models.length) {
    intent.targetPrice = intent.models.reduce((sum, m) => sum + m.avgPrice, 0) / intent.models.length;
  }

  // Body style, fuel and condition words.
  for (const [pattern, bodies] of BODY_WORDS) {
    if (pattern.test(text)) {
      intent.bodyStyles.push(...bodies);
      explainMatches(pattern);
    }
  }
  const fuelText = text.replace(/\b(plug in|plugin) hybrids?\b/g, "plug in");
  for (const [pattern, fuel] of FUEL_WORDS) {
    if (pattern.test(fuelText)) {
      intent.fuelTypes.push(fuel);
      explainMatches(pattern, fuelText);
    }
  }
  if (/\bhybrids?\b/.test(fuelText)) intent.fuelTypes.push("HYBRID");
  explainMatches(/\b(plug in |plugin )?hybrids?\b/);
  for (const [pattern, condition] of CONDITION_WORDS) {
    if (pattern.test(text) && !(condition === "USED" && intent.conditions.includes("CPO"))) intent.conditions.push(condition);
    explainMatches(pattern);
  }
  if (/\b(luxury|premium|executive)\b/.test(text)) intent.luxury = true;
  explainMatches(/\b(luxury|premium|executive|cheap|cheapest|budget|affordable|economical)\b/);

  // Year, budget and monthly payment.
  const year = text.match(/\b(19[89]\d|20[0-4]\d)\b/);
  if (year) intent.year = Number(year[1]);
  const monthly = raw.match(/\$?\s*(\d[\d,]*)\s*(?:\/\s*mo(?:nth)?|a month|per month|monthly|mo\b)/);
  if (monthly) intent.monthlyMax = parseAmount(monthly[1]!, undefined, 0);
  const rest = monthly ? raw.replace(monthly[0], " ") : raw;
  const budget =
    rest.match(/(?:under|below|less than|max|up to|<)\s*\$?\s*(\d[\d,.]*)\s*(k|thousand)?/) ?? rest.match(/\$\s*(\d[\d,.]*)\s*(k|thousand)?/);
  if (budget) {
    const amount = Number(budget[1]!.replace(/,/g, ""));
    if (budget[2] || amount < 300) intent.priceMax = parseAmount(budget[1]!, budget[2] ?? "k", 0); // "30k", "under 30"
    else if (amount < 1000) intent.monthlyMax ??= Math.round(amount); // "under 450" usually means per month
    else intent.priceMax = Math.round(amount);
  }
  if (!intent.priceMax && /\b(cheap|cheapest|budget|affordable|economical)\b/.test(text)) intent.priceMax = 20_000;
  for (const word of text.split(" ")) if (/^\d+k?$/.test(word) && (intent.year || intent.priceMax || intent.monthlyMax)) explained.add(word);

  // De-duplicate and describe.
  intent.bodyStyles = [...new Set(intent.bodyStyles)];
  intent.fuelTypes = [...new Set(intent.fuelTypes)];
  intent.conditions = [...new Set(intent.conditions)];

  if (intent.models.length) {
    const names = [...new Set(intent.models.map((m) => `${m.make} ${m.model}`))];
    intent.terms.push(...names.slice(0, 2));
    for (const make of intent.makes) if (!intent.models.some((m) => m.makeSlug === make.slug)) intent.terms.push(make.name);
  } else {
    intent.terms.push(...intent.makes.map((m) => m.name));
  }
  if (intent.year) intent.terms.push(String(intent.year));
  intent.terms.push(...intent.conditions.map((c) => conditionLabel(c)));
  intent.terms.push(...intent.fuelTypes.map((f) => fuelLabel(f)));
  if (!intent.models.length) intent.terms.push(...intent.bodyStyles.map((b) => bodyLabel(b)));
  if (intent.luxury) intent.terms.push("Luxury");
  if (intent.priceMax) intent.terms.push(`Under ${money(intent.priceMax)}`);
  if (intent.monthlyMax) intent.terms.push(`Under ${money(intent.monthlyMax)}/mo`);
  intent.terms = [...new Set(intent.terms)];
  intent.leftover = text.split(" ").filter((word) => word && !explained.has(word) && !STOP_WORDS.has(word));

  return intent;
}

/** True when the query told us something we can search on. */
export function hasSearchableIntent(intent: SearchIntent): boolean {
  return Boolean(
    intent.makes.length ||
      intent.models.length ||
      intent.bodyStyles.length ||
      intent.fuelTypes.length ||
      intent.conditions.length ||
      intent.year ||
      intent.priceMax ||
      intent.monthlyMax ||
      intent.luxury,
  );
}
