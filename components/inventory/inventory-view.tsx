import { SearchX } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import {
  cachedCountInventory,
  cachedFeaturedVehicles,
  cachedFinanceAssumptions,
  cachedSearchInventory,
} from "@/lib/inventory/cached";
import { activeFilterChips, buildInventoryHref, describeFilters, type InventoryFilters } from "@/lib/inventory/filters";
import type { InventorySearchResult } from "@/lib/inventory/search";
import { formatNumber } from "@/lib/format";
import type { FinanceAssumptions } from "@/lib/pricing.config";
import { itemListJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { FiltersPanel } from "./filters-panel";
import { InventoryNavProvider, PendingRegion } from "./inventory-nav";
import { Pagination } from "./pagination";
import { FilterChips, MobileFilters, SortSelect, ViewToggle } from "./results-toolbar";
import { SaveSearchDialog } from "./save-search-dialog";

async function EmptyState({ filters, result, finance }: { filters: InventoryFilters; result: InventorySearchResult; finance: FinanceAssumptions }) {
  // Suggest relaxing one filter at a time, showing how many vehicles each would return.
  const chips = activeFilterChips(filters, result.labels).slice(0, 8);
  const suggestions = (
    await Promise.all(chips.map(async (chip) => ({ chip, count: await cachedCountInventory({ ...chip.next, page: 1 }) })))
  )
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const similar = (await cachedFeaturedVehicles()).slice(0, 4);

  return (
    <div className="space-y-10">
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold">No exact matches</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Try removing a filter below, or save this search and we&apos;ll email you when a match arrives.
        </p>
        {suggestions.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map(({ chip, count }) => (
              <li key={chip.id}>
                <Link
                  href={buildInventoryHref(chip.next)}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Remove “{chip.label}” <span className="text-muted-foreground">({formatNumber(count)})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <SaveSearchDialog defaultName={describeFilters(filters, result.labels)} />
        </div>
      </div>
      {similar.length > 0 && (
        <section aria-labelledby="similar-heading">
          <h2 id="similar-heading" className="mb-4 text-lg font-semibold">
            You might also like
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {similar.map((v) => (
              <VehicleCard key={v.id} vehicle={v} finance={finance} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function InventoryView({ filters, heading, intro }: { filters: InventoryFilters; heading?: string; intro?: React.ReactNode }) {
  const [result, finance] = await Promise.all([cachedSearchInventory(filters), cachedFinanceAssumptions()]);
  const title = heading ?? describeFilters(filters, result.labels);
  const firstResult = (result.page - 1) * result.pageSize + 1;
  const lastResult = Math.min(result.total, result.page * result.pageSize);

  return (
    <InventoryNavProvider filters={filters}>
      <div className="container-page py-6 md:py-8">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Inventory", href: "/inventory" },
            ...(title !== "All vehicles" ? [{ name: title, href: buildInventoryHref({ ...filters, page: 1 }, { includePage: false }) }] : []),
          ]}
          className="mb-4"
        />
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {result.total > 0
                ? `Showing ${formatNumber(firstResult)} to ${formatNumber(lastResult)} of ${formatNumber(result.total)} vehicles`
                : "0 vehicles"}
            </p>
            {intro}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MobileFilters facets={result.facets} total={result.total} />
            <SaveSearchDialog defaultName={title} />
            <SortSelect />
            <ViewToggle />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-6 pr-2">
              <FiltersPanel facets={result.facets} />
            </div>
          </aside>
          <section aria-label="Search results" className="min-w-0 space-y-5">
            <FilterChips labels={result.labels} />
            <PendingRegion>
              {result.vehicles.length === 0 ? (
                <EmptyState filters={filters} result={result} finance={finance} />
              ) : (
                <div
                  className={cn(
                    "grid gap-5",
                    filters.view === "list" ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3",
                  )}
                >
                  {result.vehicles.map((vehicle, index) => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} finance={finance} view={filters.view} priority={index < 3} />
                  ))}
                </div>
              )}
              <Pagination filters={filters} page={result.page} pageCount={result.pageCount} />
            </PendingRegion>
          </section>
        </div>
      </div>
      <JsonLd data={itemListJsonLd(result.vehicles, title)} />
    </InventoryNavProvider>
  );
}
