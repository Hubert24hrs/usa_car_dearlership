/**
 * Feed adapters for common dealer inventory providers.
 *
 * Each adapter receives a raw record exactly as the provider exports it and
 * returns a record keyed by canonical field names. Generic aliasing
 * (headers.ts) handles most columns; adapters only encode provider-specific
 * semantics (N/U codes, certified flags, list separators…).
 *
 * NOTE: Provider export layouts are configurable per rooftop. These mappings
 * cover the common default layouts — verify against your actual feed spec and
 * extend `columnOverrides` as needed.
 */
import type { FeedProvider } from "@/lib/generated/prisma/enums";
import { canonicalizeRecord } from "./headers";
import { normalizeBoolean, toStringList, URL_LIST_SEPARATORS } from "../normalize";

export type RawRecord = Record<string, unknown>;
export type FeedAdapter = {
  provider: FeedProvider;
  label: string;
  /** Typical export format */
  format: "csv" | "json";
  map: (record: RawRecord) => RawRecord;
};

function pick(record: RawRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    for (const [k, v] of Object.entries(record)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === key.toLowerCase().replace(/[^a-z0-9]/g, "")) {
        if (v !== undefined && v !== null && v !== "") return v;
      }
    }
  }
  return undefined;
}

/** Apply certified flags / one-letter condition codes on top of generic mapping. */
function withCondition(mapped: RawRecord, record: RawRecord, certifiedKeys: string[], conditionKeys: string[]): RawRecord {
  const certified = normalizeBoolean(pick(record, ...certifiedKeys));
  const code = String(pick(record, ...conditionKeys) ?? "").trim().toUpperCase();
  if (certified) mapped.condition = "CPO";
  else if (code === "N") mapped.condition = "New";
  else if (code === "U") mapped.condition = "Used";
  return mapped;
}

function withImages(mapped: RawRecord, record: RawRecord, keys: string[]): RawRecord {
  const raw = pick(record, ...keys);
  if (raw !== undefined) mapped.images = toStringList(raw, URL_LIST_SEPARATORS);
  return mapped;
}

export const ADAPTERS: Record<FeedProvider, FeedAdapter> = {
  HOMENET: {
    provider: "HOMENET",
    label: "HomeNet (IOL) export",
    format: "csv",
    map: (record) => {
      const mapped = canonicalizeRecord(record);
      withCondition(mapped, record, ["Certified"], ["Type"]);
      withImages(mapped, record, ["ImageList", "Image_List", "Photos"]);
      const price = pick(record, "SellingPrice", "InternetPrice", "Price");
      if (price !== undefined) mapped.base_price = price;
      return mapped;
    },
  },
  VAUTO: {
    provider: "VAUTO",
    label: "vAuto inventory export",
    format: "csv",
    map: (record) => {
      const mapped = canonicalizeRecord(record);
      withCondition(mapped, record, ["Certified", "CPO"], ["New/Used", "NewUsed"]);
      withImages(mapped, record, ["Photo Url List", "PhotoUrlList", "Photos"]);
      const odometer = pick(record, "Odometer");
      if (odometer !== undefined) mapped.mileage = odometer;
      return mapped;
    },
  },
  DEALERCOM: {
    provider: "DEALERCOM",
    label: "Dealer.com inventory feed",
    format: "json",
    map: (record) => {
      const mapped = canonicalizeRecord(record);
      withCondition(mapped, record, ["certified", "isCertified"], ["condition"]);
      withImages(mapped, record, ["images", "imageUrls", "photos"]);
      const price = pick(record, "internetPrice", "finalPrice", "price");
      if (price !== undefined) mapped.base_price = price;
      return mapped;
    },
  },
  CDK: {
    provider: "CDK",
    label: "CDK Global inventory extract",
    format: "csv",
    map: (record) => {
      const mapped = canonicalizeRecord(record);
      withCondition(mapped, record, ["CertifiedFlag", "Certified"], ["NewUsed", "N/U", "NU"]);
      withImages(mapped, record, ["Photos", "PhotoURLs", "ImageURLs"]);
      const price = pick(record, "ListPrice", "InternetPrice", "Price");
      if (price !== undefined) mapped.base_price = price;
      return mapped;
    },
  },
  GENERIC_CSV: {
    provider: "GENERIC_CSV",
    label: "Generic CSV (spec column names)",
    format: "csv",
    map: (record) => canonicalizeRecord(record),
  },
  GENERIC_JSON: {
    provider: "GENERIC_JSON",
    label: "Generic JSON (spec schema)",
    format: "json",
    map: (record) => canonicalizeRecord(record),
  },
};

export function getAdapter(provider: FeedProvider | null | undefined): FeedAdapter {
  return ADAPTERS[provider ?? "GENERIC_JSON"];
}
