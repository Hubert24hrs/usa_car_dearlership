"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useTransition } from "react";
import { buildInventoryHref, type InventoryFilters } from "@/lib/inventory/filters";
import { cn } from "@/lib/utils";

type InventoryNavContextValue = {
  filters: InventoryFilters;
  isPending: boolean;
  navigate: (next: InventoryFilters, opts?: { scroll?: boolean }) => void;
};

const InventoryNavContext = createContext<InventoryNavContextValue | null>(null);

/**
 * Holds the current filters and performs URL navigation inside a transition so
 * the server-rendered results/facets refresh while the UI shows a pending state.
 */
export function InventoryNavProvider({ filters, children }: { filters: InventoryFilters; children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = useCallback(
    (next: InventoryFilters, opts: { scroll?: boolean } = {}) => {
      startTransition(() => {
        router.push(buildInventoryHref(next), { scroll: opts.scroll ?? false });
      });
    },
    [router],
  );
  // Signals that the filter controls are interactive (used by end-to-end tests).
  useEffect(() => {
    document.documentElement.dataset.inventoryReady = "true";
    return () => {
      delete document.documentElement.dataset.inventoryReady;
    };
  }, []);
  return <InventoryNavContext.Provider value={{ filters, isPending, navigate }}>{children}</InventoryNavContext.Provider>;
}

export function useInventoryNav(): InventoryNavContextValue {
  const ctx = useContext(InventoryNavContext);
  if (!ctx) throw new Error("useInventoryNav must be used inside <InventoryNavProvider>");
  return ctx;
}

/** Dims results and announces loading while a filter change is in flight. */
export function PendingRegion({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isPending } = useInventoryNav();
  return (
    <div aria-busy={isPending} className={cn("transition-opacity duration-200", isPending && "pointer-events-none opacity-50", className)}>
      {children}
    </div>
  );
}
