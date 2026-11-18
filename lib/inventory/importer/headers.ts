/**
 * Column/key aliasing for CSV & JSON imports. Every incoming key is normalized
 * ("Stock #" → "stock_#") and mapped to our canonical snake_case field names
 * from the inventory spec.
 */

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2") // camelCase → camel_Case
    .toLowerCase()
    .replace(/[^a-z0-9#/]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Canonical field name ← list of known aliases (already normalized). */
const ALIASES: Record<string, string[]> = {
  vin: ["vin", "vin_number", "vehicle_identification_number", "vin#"],
  stock_number: ["stock_number", "stock", "stock_#", "stock_no", "stockno", "stock_num", "stocknumber"],
  condition: ["condition", "new/used", "new_used", "newused", "type", "vehicle_condition", "inventory_type"],
  certified: ["certified", "is_certified", "cpo"],
  year: ["year", "model_year", "yr"],
  make: ["make", "manufacturer", "brand"],
  model: ["model", "model_name"],
  trim: ["trim", "series", "trim_level", "style"],
  body_style: ["body_style", "body", "bodystyle", "body_type", "vehicle_type"],
  fuel_type: ["fuel_type", "fuel", "fueltype", "engine_fuel_type"],
  ev_range_miles: ["ev_range_miles", "ev_range", "electric_range", "range_miles", "range"],
  ev_battery_kwh: ["ev_battery_kwh", "battery_kwh", "battery_capacity", "battery_capacity_kwh"],
  ev_dc_fast_charge_min: ["ev_dc_fast_charge_min", "dc_fast_charge_min", "fast_charge_minutes", "dc_fast_charge_time"],
  ev_charge_port: ["ev_charge_port", "charge_port", "charging_port", "connector"],
  // Note: bare "city"/"hwy" are intentionally NOT aliases (ambiguous with addresses).
  mpg_city: ["mpg_city", "city_mpg", "citympg"],
  mpg_highway: ["mpg_highway", "highway_mpg", "hwy_mpg", "highwaympg"],
  mpg_combined: ["mpg_combined", "combined_mpg", "combinedmpg", "mpg"],
  engine: ["engine", "engine_description", "enginedescription", "engine_desc"],
  transmission: ["transmission", "transmission_description", "trans", "transmission_desc"],
  drivetrain: ["drivetrain", "drive_train", "drive_type", "drivetype", "drive", "driveline"],
  mileage: ["mileage", "miles", "odometer", "odometer_reading"],
  exterior_color: ["exterior_color", "ext_color", "exteriorcolor", "color", "colour", "exterior_colour", "ext_color_generic"],
  interior_color: ["interior_color", "int_color", "interiorcolor", "interior_colour"],
  features: ["features", "options", "equipment", "installed_options", "option_list", "highlights"],
  safety_features: ["safety_features", "safety", "safety_equipment"],
  description: ["description", "comments", "dealer_comments", "vehicle_description", "notes"],
  base_price: ["base_price", "price", "selling_price", "sellingprice", "internet_price", "internetprice", "list_price", "listprice", "sale_price"],
  base_down_payment: ["base_down_payment", "down_payment", "downpayment"],
  base_monthly_payment: ["base_monthly_payment", "monthly_payment", "monthlypayment", "payment"],
  images: ["images", "image_urls", "imagelist", "image_list", "photo_url_list", "photos", "photo_urls", "image_url", "pictures"],
  spin_images: ["spin_images", "spin_frames", "images_360", "360_images"],
  video_url: ["video_url", "video", "videourl"],
  carfax_url: ["carfax_url", "carfax", "carfax_link", "history_report_url", "vehicle_history_url"],
  status: ["status", "vehicle_status", "availability"],
  location: ["location", "location_slug", "store", "lot", "dealer_location"],
  location_id: ["location_id"],
  is_featured: ["is_featured", "featured"],
  is_demo: ["is_demo", "demo"],
  // Display values are ALWAYS recomputed — accepted only so they can be ignored.
  display_price: ["display_price"],
  display_down_payment: ["display_down_payment"],
  display_monthly_payment: ["display_monthly_payment"],
};

const LOOKUP = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(ALIASES)) {
  for (const alias of aliases) LOOKUP.set(alias, canonical);
}

export function canonicalKey(header: string): string | null {
  return LOOKUP.get(normalizeHeader(header)) ?? null;
}

/**
 * Map a flat record's keys to canonical names. Unknown keys are dropped.
 * Nested objects from JSON (`ev_specs`, `mpg`) are flattened first.
 */
export function canonicalizeRecord(input: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const normalized = normalizeHeader(key);
    if ((normalized === "ev_specs" || normalized === "mpg") && value && typeof value === "object" && !Array.isArray(value)) {
      for (const [innerKey, innerValue] of Object.entries(value as Record<string, unknown>)) {
        const prefix = normalized === "ev_specs" ? "ev_" : "mpg_";
        const inner = normalizeHeader(innerKey);
        flat[inner.startsWith(prefix) ? inner : `${prefix}${inner}`] = innerValue;
      }
    } else {
      flat[key] = value;
    }
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const canonical = canonicalKey(key);
    if (canonical && !(canonical in result && (value === "" || value === null || value === undefined))) {
      result[canonical] = value;
    }
  }
  return result;
}
