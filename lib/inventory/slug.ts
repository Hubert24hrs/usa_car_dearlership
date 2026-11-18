/**
 * URL slug helpers. Client-safe; also used by middleware (edge runtime).
 *
 * Vehicle detail URLs look like:
 *   /inventory/2025-toyota-rav4-hybrid-xse-2t3e6rfv8sw123456
 * i.e. a readable prefix followed by the full lowercase VIN. The trailing VIN
 * is what distinguishes a VDP from SEO browse URLs such as /inventory/electric/suv.
 */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Matches "<anything>-<17-char VIN>" (lowercase, no i/o/q). */
export const VEHICLE_SLUG_REGEX = /^[a-z0-9-]+-[a-hj-npr-z0-9]{17}$/;

export function vehicleSlug(v: { year: number; make: string; model: string; trim?: string | null; vin: string }): string {
  const prefix = slugify([v.year, v.make, v.model, v.trim ?? ""].join(" "));
  return `${prefix}-${v.vin.toLowerCase()}`;
}

export function isVehicleSlug(segment: string): boolean {
  return VEHICLE_SLUG_REGEX.test(segment);
}

export function vinFromSlug(slug: string): string | null {
  if (!isVehicleSlug(slug)) return null;
  return slug.slice(-17).toUpperCase();
}
