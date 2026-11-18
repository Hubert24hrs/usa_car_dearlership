"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  clearFilters,
  countActiveFilters,
  toggleListValue,
  withFilters,
  type InventoryFilters,
  type ListFilterKey,
} from "@/lib/inventory/filters";
import { MONTHLY_BUDGET_BANDS } from "@/lib/inventory/constants";
import type { FacetOption, InventoryFacets, RangeBounds } from "@/lib/inventory/search";
import { formatNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useInventoryNav } from "./inventory-nav";

function CheckboxFacet({
  facetKey,
  options,
  selected,
  limit = 8,
  searchable = false,
  label,
}: {
  facetKey: ListFilterKey;
  options: FacetOption[];
  selected: string[];
  limit?: number;
  searchable?: boolean;
  label: string;
}) {
  const { filters, navigate } = useInventoryNav();
  // The panel renders twice (desktop sidebar + mobile sheet), so ids must be unique per instance.
  const baseId = useId();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  // Always show selected values, even if their count dropped to zero.
  const merged: FacetOption[] = useMemo(() => {
    const missing = selected.filter((v) => !options.some((o) => o.value === v)).map((v): FacetOption => ({ value: v, label: v, count: 0 }));
    return [...options, ...missing];
  }, [options, selected]);
  const filtered = query ? merged.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : merged;
  const visible = expanded || query ? filtered : filtered.slice(0, limit);

  if (merged.length === 0) return <p className="text-sm text-muted-foreground">No options for current filters.</p>;

  return (
    <div className="space-y-2">
      {searchable && merged.length > limit && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}`}
          aria-label={`Search ${label.toLowerCase()}`}
          className="h-8"
        />
      )}
      <ul className="space-y-1.5">
        {visible.map((option) => {
          const id = `${baseId}-${facetKey}-${option.value.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          const checked = selected.includes(option.value);
          return (
            <li key={option.value} className="flex items-center gap-2.5">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={() => navigate(toggleListValue(filters, facetKey, option.value as never))}
              />
              <label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm">
                <span className={cn(checked && "font-medium")}>
                  {option.hex && (
                    <span
                      className="mr-2 inline-block size-3.5 rounded-full border align-[-2px]"
                      style={{ backgroundColor: option.hex }}
                      aria-hidden="true"
                    />
                  )}
                  {option.label}
                </span>
                <span className="tabular-nums text-xs text-muted-foreground">{formatNumber(option.count)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {!query && filtered.length > limit && (
        <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${filtered.length}`}
        </button>
      )}
    </div>
  );
}

function RangeFacet({
  label,
  bounds,
  min,
  max,
  step,
  format,
  onCommit,
}: {
  label: string;
  bounds: RangeBounds;
  min?: number;
  max?: number;
  step: number;
  format: (n: number) => string;
  onCommit: (min: number | undefined, max: number | undefined) => void;
}) {
  const lo = Math.floor((bounds.min ?? 0) / step) * step;
  const hi = Math.ceil((bounds.max ?? 0) / step) * step;
  const [value, setValue] = useState<[number, number]>([min ?? lo, max ?? hi]);
  useEffect(() => setValue([min ?? lo, max ?? hi]), [min, max, lo, hi]);
  if (bounds.min === null || bounds.max === null || hi <= lo) {
    return <p className="text-sm text-muted-foreground">Not available for current results.</p>;
  }
  const commit = ([a, b]: [number, number]) => onCommit(a <= lo ? undefined : a, b >= hi ? undefined : b);
  return (
    <div className="space-y-4 px-1">
      <Slider
        min={lo}
        max={hi}
        step={step}
        value={value}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => setValue([v[0]!, v[1]!])}
        onValueCommit={(v) => commit([v[0]!, v[1]!])}
        aria-label={label}
      />
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-md bg-muted px-2 py-1 tabular-nums">{format(value[0])}</span>
        <span className="text-muted-foreground">to</span>
        <span className="rounded-md bg-muted px-2 py-1 tabular-nums">
          {format(value[1])}
          {value[1] >= hi ? "+" : ""}
        </span>
      </div>
    </div>
  );
}

function SelectFacet({
  value,
  options,
  onChange,
  label,
}: {
  value?: number;
  options: { value: number; label: string }[];
  onChange: (v: number | undefined) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="">Any</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function KeywordSearch() {
  const { filters, navigate } = useInventoryNav();
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(withFilters(filters, { q: q.trim(), sort: q.trim() ? "relevance" : filters.sort === "relevance" ? "featured" : filters.sort }));
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Make, model, feature, VIN…"
        aria-label="Search inventory"
        className="h-10 pl-9 pr-9"
        maxLength={100}
      />
      {q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQ("");
            navigate(withFilters(filters, { q: "", sort: filters.sort === "relevance" ? "featured" : filters.sort }));
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}

const MILEAGE_OPTIONS = [10_000, 25_000, 50_000, 75_000, 100_000, 150_000].map((v) => ({ value: v, label: `Under ${formatNumber(v)} mi` }));
const RANGE_OPTIONS = [150, 200, 250, 300, 350].map((v) => ({ value: v, label: `${v}+ miles` }));
const MPG_OPTIONS = [20, 25, 30, 35, 40, 50].map((v) => ({ value: v, label: `${v}+ MPG` }));

export function FiltersPanel({ facets, onApplied }: { facets: InventoryFacets; onApplied?: () => void }) {
  const { filters, navigate: rawNavigate } = useInventoryNav();
  const navigate = (next: InventoryFilters) => {
    rawNavigate(next);
    onApplied?.();
  };
  const active = countActiveFilters(filters);
  const showEv = facets.ranges.range.max !== null;
  const showMpg = facets.ranges.mpg.max !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Filters{active ? ` (${active})` : ""}</h2>
        {active > 0 && (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate(clearFilters(filters))}>
            Clear all
          </Button>
        )}
      </div>
      <KeywordSearch />
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly budget</p>
        <div className="flex flex-wrap gap-1.5">
          {MONTHLY_BUDGET_BANDS.map((band) => {
            const selected = filters.monthlyMin === band.min && filters.monthlyMax === band.max;
            return (
              <button
                key={band.label}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  navigate(withFilters(filters, selected ? { monthlyMin: undefined, monthlyMax: undefined } : { monthlyMin: band.min, monthlyMax: band.max }))
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                {band.label}
              </button>
            );
          })}
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["condition", "make", "price", "fuel", "body"]} className="w-full">
        <AccordionItem value="condition">
          <AccordionTrigger>Condition</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="condition" label="Condition" options={facets.condition} selected={filters.condition} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="make">
          <AccordionTrigger>Make & model</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <CheckboxFacet facetKey="make" label="Makes" options={facets.make} selected={filters.make} searchable limit={10} />
            {filters.make.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</p>
                <CheckboxFacet facetKey="model" label="Models" options={facets.model} selected={filters.model} searchable />
              </div>
            )}
            {filters.model.length === 1 && facets.trim.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trim</p>
                <CheckboxFacet facetKey="trim" label="Trims" options={facets.trim} selected={filters.trim} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="price">
          <AccordionTrigger>Price & payment</AccordionTrigger>
          <AccordionContent className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium">Price</p>
              <RangeFacet
                label="Price range"
                bounds={facets.ranges.price}
                min={filters.priceMin}
                max={filters.priceMax}
                step={1000}
                format={formatPrice}
                onCommit={(min, max) => navigate(withFilters(filters, { priceMin: min, priceMax: max }))}
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium">Est. monthly payment</p>
              <RangeFacet
                label="Monthly payment range"
                bounds={facets.ranges.monthly}
                min={filters.monthlyMin}
                max={filters.monthlyMax}
                step={25}
                format={(n) => `${formatPrice(n)}/mo`}
                onCommit={(min, max) => navigate(withFilters(filters, { monthlyMin: min, monthlyMax: max }))}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="fuel">
          <AccordionTrigger>Fuel type</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="fuel" label="Fuel type" options={facets.fuel} selected={filters.fuel} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="body">
          <AccordionTrigger>Body style</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="body" label="Body style" options={facets.body} selected={filters.body} limit={9} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="year">
          <AccordionTrigger>Year</AccordionTrigger>
          <AccordionContent>
            <RangeFacet
              label="Model year range"
              bounds={facets.ranges.year}
              min={filters.yearMin}
              max={filters.yearMax}
              step={1}
              format={String}
              onCommit={(min, max) => navigate(withFilters(filters, { yearMin: min, yearMax: max }))}
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="mileage">
          <AccordionTrigger>Mileage</AccordionTrigger>
          <AccordionContent>
            <SelectFacet
              label="Maximum mileage"
              value={filters.mileageMax}
              options={MILEAGE_OPTIONS}
              onChange={(v) => navigate(withFilters(filters, { mileageMax: v }))}
            />
          </AccordionContent>
        </AccordionItem>
        {(showEv || filters.rangeMin !== undefined) && (
          <AccordionItem value="range">
            <AccordionTrigger>EV range</AccordionTrigger>
            <AccordionContent>
              <SelectFacet
                label="Minimum electric range"
                value={filters.rangeMin}
                options={RANGE_OPTIONS}
                onChange={(v) => navigate(withFilters(filters, { rangeMin: v }))}
              />
            </AccordionContent>
          </AccordionItem>
        )}
        {(showMpg || filters.mpgMin !== undefined) && (
          <AccordionItem value="mpg">
            <AccordionTrigger>Fuel economy</AccordionTrigger>
            <AccordionContent>
              <SelectFacet
                label="Minimum combined MPG"
                value={filters.mpgMin}
                options={MPG_OPTIONS}
                onChange={(v) => navigate(withFilters(filters, { mpgMin: v }))}
              />
            </AccordionContent>
          </AccordionItem>
        )}
        <AccordionItem value="drivetrain">
          <AccordionTrigger>Drivetrain</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="drivetrain" label="Drivetrain" options={facets.drivetrain} selected={filters.drivetrain} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="transmission">
          <AccordionTrigger>Transmission</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="transmission" label="Transmission" options={facets.transmission} selected={filters.transmission} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="extColor">
          <AccordionTrigger>Exterior color</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="extColor" label="Exterior color" options={facets.extColor} selected={filters.extColor} limit={14} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="intColor">
          <AccordionTrigger>Interior color</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="intColor" label="Interior color" options={facets.intColor} selected={filters.intColor} limit={14} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="feature">
          <AccordionTrigger>Features</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="feature" label="Features" options={facets.feature} selected={filters.feature} searchable limit={10} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="location">
          <AccordionTrigger>Location</AccordionTrigger>
          <AccordionContent>
            <CheckboxFacet facetKey="location" label="Locations" options={facets.location} selected={filters.location} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
