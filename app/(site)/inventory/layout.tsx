import { MobileFiltersProvider } from "@/components/inventory/mobile-filters-state";

/** Shared by /inventory, the SEO browse pages and vehicle pages; persists across their navigations. */
export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <MobileFiltersProvider>{children}</MobileFiltersProvider>;
}
