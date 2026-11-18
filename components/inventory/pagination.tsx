import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buildInventoryHref, type InventoryFilters } from "@/lib/inventory/filters";
import { cn } from "@/lib/utils";

function pageWindow(page: number, pageCount: number): (number | "…")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Crawlable numbered pagination (real links, not buttons). */
export function Pagination({ filters, page, pageCount }: { filters: InventoryFilters; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => buildInventoryHref({ ...filters, page: p });
  const linkClass = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors hover:bg-accent";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={linkClass}>
          <ChevronLeft className="size-4" aria-hidden="true" /> <span className="sr-only sm:not-sr-only">Previous</span>
        </Link>
      ) : null}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(linkClass, p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className={linkClass}>
          <span className="sr-only sm:not-sr-only">Next</span> <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
