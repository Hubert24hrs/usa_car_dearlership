import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InventorySkeleton } from "@/components/inventory/inventory-skeleton";
import { InventoryView } from "@/components/inventory/inventory-view";
import { cachedInventoryStats } from "@/lib/inventory/cached";
import { buildInventoryHref, describeFilters, parseFilters } from "@/lib/inventory/filters";

/**
 * SEO browse pages such as /inventory/electric/suv or /inventory/used/toyota/camry
 * (rewritten here by middleware.ts — the visible URL stays clean).
 */
type Props = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolve(props: Props) {
  const [{ segments }, sp] = await Promise.all([props.params, props.searchParams]);
  const { filters, unknownSegments } = parseFilters(sp, segments);
  if (unknownSegments.length > 0) notFound();
  // Unknown makes/models → 404 (prevents infinite crawlable URL space).
  if (filters.make.length || filters.model.length) {
    const stats = await cachedInventoryStats();
    const make = stats.makes.find((m) => m.slug === filters.make[0]);
    if (filters.make.length === 1 && !make) notFound();
    if (filters.model.length === 1 && make && !make.models.some((m) => m.slug === filters.model[0])) notFound();
    const labels = {
      makes: Object.fromEntries(stats.makes.map((m) => [m.slug, m.name])),
      models: Object.fromEntries(stats.makes.flatMap((m) => m.models.map((mo) => [mo.slug, mo.name]))),
    };
    return { filters, title: describeFilters(filters, labels) };
  }
  return { filters, title: describeFilters(filters) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { filters, title } = await resolve(props);
  return {
    title: `${title} for sale`,
    description: `Shop ${title.toLowerCase()} with transparent pricing, estimated payments, home delivery and a no-pressure return window.`,
    alternates: { canonical: buildInventoryHref({ ...filters, page: 1, view: "grid", sort: "featured" }, { includePage: false }) },
  };
}

/**
 * Validation (which may 404) runs before the Suspense boundary, so unknown
 * makes/models get a real 404 status. A route-level loading.tsx would start
 * streaming a 200 response before notFound() could run.
 */
export default async function BrowsePage(props: Props) {
  const { filters, title } = await resolve(props);
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryView filters={filters} heading={title} />
    </Suspense>
  );
}
