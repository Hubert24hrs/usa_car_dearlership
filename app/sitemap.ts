import type { MetadataRoute } from "next";
import { BODY_STYLES, CONDITIONS, FUEL_TYPES } from "@/lib/inventory/constants";
import { getInventoryStats, getSitemapVehicles } from "@/lib/inventory/vehicles";
import { absoluteUrl } from "@/lib/site.config";

export const revalidate = 3600;

const STATIC_PAGES = [
  "/",
  "/inventory",
  "/new",
  "/used",
  "/electric-hybrid",
  "/finance",
  "/sell-or-trade",
  "/service",
  "/locations",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/accessibility",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" || path === "/inventory" ? "hourly" : "weekly",
    priority: path === "/" ? 1 : path === "/inventory" ? 0.9 : 0.6,
  }));

  // SEO browse pages: fuel, body, condition, fuel+body, make, make+model.
  for (const c of CONDITIONS) entries.push({ url: absoluteUrl(`/inventory/${c.slug}`), changeFrequency: "daily", priority: 0.7 });
  for (const f of FUEL_TYPES) {
    entries.push({ url: absoluteUrl(`/inventory/${f.slug}`), changeFrequency: "daily", priority: 0.7 });
    for (const b of BODY_STYLES) entries.push({ url: absoluteUrl(`/inventory/${f.slug}/${b.slug}`), changeFrequency: "daily", priority: 0.5 });
  }
  for (const b of BODY_STYLES) entries.push({ url: absoluteUrl(`/inventory/${b.slug}`), changeFrequency: "daily", priority: 0.6 });

  try {
    const [stats, vehicles] = await Promise.all([getInventoryStats(), getSitemapVehicles()]);
    for (const make of stats.makes) {
      entries.push({ url: absoluteUrl(`/inventory/${make.slug}`), changeFrequency: "daily", priority: 0.6 });
      for (const model of make.models) {
        entries.push({ url: absoluteUrl(`/inventory/${make.slug}/${model.slug}`), changeFrequency: "daily", priority: 0.5 });
      }
    }
    for (const v of vehicles) {
      entries.push({ url: absoluteUrl(`/inventory/${v.slug}`), lastModified: v.updatedAt, changeFrequency: "daily", priority: 0.8 });
    }
  } catch (error) {
    console.warn("[sitemap] database unavailable:", (error as Error).message);
  }
  return entries;
}
