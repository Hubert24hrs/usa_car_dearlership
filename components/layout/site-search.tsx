"use client";

import { Loader2, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VehicleImage } from "@/components/vehicle/vehicle-image";
import { formatNumber, formatPrice } from "@/lib/format";
import { POPULAR_SEARCHES } from "@/lib/site.config";

type Suggestion = { slug: string; title: string; trim: string | null; price: number; monthly: number; image: string | null };
type Suggestions = { query: string; total: number; vehicles: Suggestion[] };

/**
 * Header search: a magnifier button that opens a search dialog with live
 * in-stock matches. Submitting goes to /search, which opens the car's page when
 * it's in stock and shows similar cars when it isn't. Without JavaScript the
 * button is a plain link to /search.
 */
export function SiteSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);

  // Ctrl/Cmd+K, or "/" when not typing, opens search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)));
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live suggestions, debounced.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) setData({ query: term, ...((await res.json()) as Omit<Suggestions, "query">) });
      } catch {
        // Aborted or offline: keep the previous suggestions.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const search = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <>
      <Button asChild variant="ghost" size="icon" className="rounded-full">
        <Link
          href="/search"
          aria-label="Search cars"
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <SearchIcon className="size-5" />
        </Link>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[8%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search cars</DialogTitle>
          <DialogDescription className="sr-only">
            Type a make, model, year or VIN. If the car is in stock you go straight to it; if not, we show similar cars.
          </DialogDescription>
          <form
            action="/search"
            method="get"
            role="search"
            className="flex items-center gap-2 border-b px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              search(q);
            }}
          >
            <SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              name="q"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search make, model, year or VIN"
              aria-label="Search cars"
              autoComplete="off"
              maxLength={100}
              className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
            <Button type="submit" size="sm" className="bg-cta text-cta-foreground hover:bg-cta-hover">
              Search
            </Button>
          </form>

          <div className="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
            {data && data.vehicles.length > 0 ? (
              <>
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {data.total === 1 ? "In stock now" : `${formatNumber(data.total)} in stock`}
                </p>
                <ul>
                  {data.vehicles.map((v) => (
                    <li key={v.slug}>
                      <Link
                        href={`/inventory/${v.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      >
                        <span className="relative h-12 w-18 shrink-0 overflow-hidden rounded-md bg-muted">
                          {v.image && <VehicleImage src={v.image} alt="" fill sizes="72px" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{v.title}</span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {[v.trim, formatPrice(v.price), `Est. ${formatPrice(v.monthly)}/mo`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {data.total > data.vehicles.length && (
                  <button type="button" onClick={() => search(q)} className="mt-1 w-full rounded-lg p-2 text-left text-sm font-medium text-primary hover:bg-muted">
                    See all {formatNumber(data.total)} matches
                  </button>
                )}
              </>
            ) : data && !loading ? (
              <div className="p-3 text-sm">
                <p className="font-medium">No exact match in stock for “{data.query}”.</p>
                <button type="button" onClick={() => search(q)} className="mt-1 font-medium text-primary hover:underline">
                  Show similar cars
                </button>
              </div>
            ) : (
              <div className="p-2">
                <p className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button key={term} type="button" onClick={() => search(term)} className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
