/**
 * Cached data access for pages (Next.js data cache, tag-invalidated).
 * Imports / admin edits call revalidateTag(CACHE_TAGS.inventory).
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { getDealerProfile, getFinanceAssumptions } from "@/lib/settings";
import { DEFAULT_DEALER_PROFILE } from "@/lib/site.config";
import { DEFAULT_FINANCE_ASSUMPTIONS } from "@/lib/pricing.config";
import { filtersCacheKey, type InventoryFilters } from "./filters";
import { countInventory, searchInventory } from "./search";
import {
  getBodyStyleShowcase,
  getFeaturedVehicles,
  getInventoryStats,
  getJustArrived,
  getLocations,
  getPublishedReviews,
  getSimilarVehicles,
  getVehicleBySlug,
} from "./vehicles";

export const CACHE_TAGS = {
  inventory: "inventory",
  settings: "settings",
  locations: "locations",
  reviews: "reviews",
} as const;

const INVENTORY_TTL = 300;

export const cachedSearchInventory = (filters: InventoryFilters) =>
  unstable_cache(() => searchInventory(filters), ["search", filtersCacheKey(filters)], {
    tags: [CACHE_TAGS.inventory, CACHE_TAGS.locations],
    revalidate: INVENTORY_TTL,
  })();

export const cachedCountInventory = (filters: InventoryFilters) =>
  unstable_cache(() => countInventory(filters), ["count", filtersCacheKey(filters)], {
    tags: [CACHE_TAGS.inventory],
    revalidate: INVENTORY_TTL,
  })();

export const cachedVehicleBySlug = (slug: string) =>
  unstable_cache(() => getVehicleBySlug(slug), ["vehicle", slug], {
    tags: [CACHE_TAGS.inventory, `vehicle:${slug}`],
    revalidate: INVENTORY_TTL,
  })();

export const cachedSimilarVehicles = (v: Parameters<typeof getSimilarVehicles>[0]) =>
  unstable_cache(() => getSimilarVehicles(v), ["similar", v.id], {
    tags: [CACHE_TAGS.inventory],
    revalidate: INVENTORY_TTL,
  })();

export const cachedFeaturedVehicles = unstable_cache(() => getFeaturedVehicles(12), ["featured"], {
  tags: [CACHE_TAGS.inventory],
  revalidate: INVENTORY_TTL,
});

export const cachedJustArrived = unstable_cache(() => getJustArrived(12), ["just-arrived"], {
  tags: [CACHE_TAGS.inventory],
  revalidate: INVENTORY_TTL,
});

export const cachedInventoryStats = unstable_cache(() => getInventoryStats(), ["inventory-stats"], {
  tags: [CACHE_TAGS.inventory],
  revalidate: INVENTORY_TTL,
});

export const cachedBodyStyleShowcase = unstable_cache(() => getBodyStyleShowcase(), ["body-style-showcase"], {
  tags: [CACHE_TAGS.inventory],
  revalidate: INVENTORY_TTL,
});

export const cachedLocations = unstable_cache(() => getLocations(), ["locations"], {
  tags: [CACHE_TAGS.locations],
  revalidate: 3600,
});

export const cachedReviews = unstable_cache(() => getPublishedReviews(9), ["reviews"], {
  tags: [CACHE_TAGS.reviews],
  revalidate: 3600,
});

/** Settings never break rendering: fall back to code defaults if the DB is unreachable. */
export const cachedDealerProfile = unstable_cache(
  async () => getDealerProfile().catch(() => DEFAULT_DEALER_PROFILE),
  ["dealer-profile"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 },
);

export const cachedFinanceAssumptions = unstable_cache(
  async () => getFinanceAssumptions().catch(() => DEFAULT_FINANCE_ASSUMPTIONS),
  ["finance-assumptions"],
  { tags: [CACHE_TAGS.settings], revalidate: 3600 },
);
