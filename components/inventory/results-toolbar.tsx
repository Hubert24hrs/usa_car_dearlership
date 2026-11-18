"use client";

import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SORT_OPTIONS, type SortKey } from "@/lib/inventory/constants";
import { activeFilterChips, clearFilters, countActiveFilters, withFilters, type ChipLabels } from "@/lib/inventory/filters";
import type { InventoryFacets } from "@/lib/inventory/search";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FiltersPanel } from "./filters-panel";
import { useInventoryNav } from "./inventory-nav";

export function SortSelect() {
  const { filters, navigate } = useInventoryNav();
  const options = SORT_OPTIONS.filter((o) => o.value !== "relevance" || filters.q);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">Sort by</span>
      <select
        value={filters.sort}
        onChange={(e) => navigate(withFilters(filters, { sort: e.target.value as SortKey }))}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm font-medium"
        aria-label="Sort vehicles"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ViewToggle() {
  const { filters, navigate } = useInventoryNav();
  return (
    <div className="hidden items-center rounded-lg border p-0.5 sm:flex" role="group" aria-label="Results layout">
      {(["grid", "list"] as const).map((view) => {
        const Icon = view === "grid" ? LayoutGrid : List;
        const active = filters.view === view;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={active}
            aria-label={`${view} view`}
            onClick={() => navigate({ ...filters, view })}
            className={cn("rounded-md p-1.5 text-muted-foreground transition-colors", active && "bg-secondary text-foreground")}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export function MobileFilters({ facets, total }: { facets: InventoryFacets; total: number }) {
  const { filters, isPending } = useInventoryNav();
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontal /> Filters{active ? ` (${active})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-3xl p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Filter vehicles</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <FiltersPanel facets={facets} />
        </div>
        <SheetFooter className="border-t p-3">
          <Button className="w-full bg-cta text-cta-foreground hover:bg-cta-hover" size="lg" onClick={() => setOpen(false)}>
            {isPending ? "Updating…" : `Show ${formatNumber(total)} results`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function FilterChips({ labels }: { labels: ChipLabels }) {
  const { filters, navigate } = useInventoryNav();
  const chips = activeFilterChips(filters, labels);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => navigate(chip.next)}
          className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium hover:bg-accent"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={() => navigate(clearFilters(filters))} className="text-xs font-medium text-primary hover:underline">
        Clear all
      </button>
    </div>
  );
}
