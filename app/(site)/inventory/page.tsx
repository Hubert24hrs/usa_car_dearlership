import type { Metadata } from "next";
import { InventoryView } from "@/components/inventory/inventory-view";
import { buildInventoryHref, countActiveFilters, describeFilters, parseFilters } from "@/lib/inventory/filters";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { filters } = parseFilters(await searchParams);
  const title = filters.q ? `Search results for “${filters.q}”` : describeFilters(filters);
  const canonical = buildInventoryHref({ ...filters, page: 1, view: "grid", sort: "featured" }, { includePage: false });
  // Index clean facet pages; keep keyword searches and deep combinations out of the index.
  const indexable = !filters.q && countActiveFilters(filters) <= 3;
  return {
    title: `${title} for sale`,
    description: `Browse ${title.toLowerCase()} with transparent pricing, estimated monthly payments and free vehicle history highlights.`,
    alternates: { canonical },
    robots: { index: indexable, follow: true },
  };
}

export default async function InventoryPage({ searchParams }: Props) {
  const { filters } = parseFilters(await searchParams);
  return <InventoryView filters={filters} />;
}
