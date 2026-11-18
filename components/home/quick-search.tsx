"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FUEL_TYPES, type FuelType, type VehicleCondition } from "@/lib/inventory/constants";
import { buildInventoryHref, EMPTY_FILTERS, type InventoryFilters } from "@/lib/inventory/filters";
import type { InventoryStats } from "@/lib/inventory/vehicles";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRICE_OPTIONS = [20_000, 25_000, 30_000, 40_000, 50_000, 60_000, 75_000, 100_000];

export function QuickSearch({ makes, total }: { makes: InventoryStats["makes"]; total: number }) {
  const router = useRouter();
  const [condition, setCondition] = useState<"ALL" | "NEW" | "USED">("ALL");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [fuel, setFuel] = useState<FuelType | "">("");
  const [count, setCount] = useState<number | null>(total);
  const [loading, setLoading] = useState(false);

  const models = useMemo(() => makes.find((m) => m.slug === make)?.models ?? [], [makes, make]);

  const filters: InventoryFilters = useMemo(
    () => ({
      ...EMPTY_FILTERS,
      condition: (condition === "NEW" ? ["NEW"] : condition === "USED" ? ["USED", "CPO"] : []) as VehicleCondition[],
      make: make ? [make] : [],
      model: model ? [model] : [],
      priceMax: maxPrice === "" ? undefined : maxPrice,
      fuel: fuel ? [fuel] : [],
    }),
    [condition, make, model, maxPrice, fuel],
  );
  const href = buildInventoryHref(filters);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
      const params = new URLSearchParams(query);
      // Path facets → explicit params for the count API.
      if (filters.condition.length) params.set("condition", filters.condition.map((c) => (c === "CPO" ? "certified" : c.toLowerCase())).join(","));
      if (filters.make.length) params.set("make", filters.make.join(","));
      if (filters.model.length) params.set("model", filters.model.join(","));
      if (filters.fuel.length) params.set("fuel", FUEL_TYPES.find((f) => f.value === filters.fuel[0])!.slug);
      fetch(`/api/inventory/count?${params.toString()}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((json: { count: number } | null) => json && setCount(json.count))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [href, filters]);

  const selectClass =
    "h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground shadow-xs focus-visible:outline-2";

  return (
    <form
      role="search"
      aria-label="Quick vehicle search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(href);
      }}
      className="rounded-3xl bg-card p-4 text-card-foreground shadow-lift ring-1 ring-black/5 md:p-5"
    >
      <div className="mb-4 inline-flex rounded-full bg-muted p-1" role="group" aria-label="Condition">
        {(["ALL", "NEW", "USED"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={condition === value}
            onClick={() => setCondition(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              condition === value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "ALL" ? "All" : value === "NEW" ? "New" : "Used & CPO"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="qs-make">
          Make
        </label>
        <select
          id="qs-make"
          className={selectClass}
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
          }}
        >
          <option value="">Any make</option>
          {makes.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name} ({formatNumber(m.count)})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="qs-model">
          Model
        </label>
        <select id="qs-model" className={selectClass} value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}>
          <option value="">{make ? "Any model" : "Select a make first"}</option>
          {models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name} ({formatNumber(m.count)})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="qs-price">
          Maximum price
        </label>
        <select
          id="qs-price"
          className={selectClass}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">No max price</option>
          {PRICE_OPTIONS.map((p) => (
            <option key={p} value={p}>
              Under ${formatNumber(p)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="qs-fuel">
          Fuel type
        </label>
        <select id="qs-fuel" className={selectClass} value={fuel} onChange={(e) => setFuel(e.target.value as FuelType | "")}>
          <option value="">Any fuel type</option>
          {FUEL_TYPES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="lg" className="h-12 rounded-xl bg-cta px-6 text-base text-cta-foreground hover:bg-cta-hover sm:col-span-2 lg:col-span-1">
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          <span aria-live="polite">Search {count === null ? "" : formatNumber(count)} vehicles</span>
        </Button>
      </div>
    </form>
  );
}
