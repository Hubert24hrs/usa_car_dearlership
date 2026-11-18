import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { cachedFinanceAssumptions } from "@/lib/inventory/cached";
import { resolveSearch } from "@/lib/inventory/smart-search";
import { POPULAR_SEARCHES } from "@/lib/site.config";

export const metadata: Metadata = {
  title: "Search cars",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Plain GET form: works without JavaScript and from the header search dialog. */
function SearchForm({ defaultValue }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" role="search" aria-label="Search cars" className="flex gap-2">
      <label htmlFor="search-page-q" className="sr-only">
        Search by make, model, year or VIN
      </label>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="search-page-q"
          name="q"
          defaultValue={defaultValue}
          placeholder="Search by make, model, year or VIN"
          maxLength={100}
          autoComplete="off"
          className="h-12 w-full rounded-xl border bg-background pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" className="h-12 bg-cta px-6 text-cta-foreground hover:bg-cta-hover">
        Search
      </Button>
    </form>
  );
}

function PopularSearches() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground">Popular searches</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {POPULAR_SEARCHES.map((term) => (
          <li key={term}>
            <Link href={`/search?q=${encodeURIComponent(term)}`} className="inline-block rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
              {term}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const outcome = await resolveSearch(Array.isArray(raw) ? raw[0] : raw);

  // In stock: go straight to the car (or to the list when several match).
  if (outcome.kind === "vehicle") redirect(`/inventory/${outcome.slug}`);
  if (outcome.kind === "matches") redirect(outcome.href);

  if (outcome.kind === "empty") {
    return (
      <>
        <PageHeader title="Find your next car" crumbs={[{ name: "Search", href: "/search" }]} description="Search by make, model, year or VIN. If it's in stock, we'll take you straight to it." />
        <div className="container-page max-w-3xl space-y-8 py-10">
          <SearchForm />
          <PopularSearches />
        </div>
      </>
    );
  }

  const finance = await cachedFinanceAssumptions();
  const heading = outcome.soldTitle ? `The ${outcome.soldTitle} has been sold` : `We don't have “${outcome.query}” in stock right now`;
  return (
    <>
      <PageHeader title="Similar cars in stock" crumbs={[{ name: "Search", href: "/search" }]} />
      <div className="container-page space-y-8 py-10">
        <div className="max-w-3xl">
          <SearchForm defaultValue={outcome.query} />
        </div>
        <section aria-labelledby="similar-heading" className="space-y-5">
          <div>
            <h2 id="similar-heading" className="text-2xl font-semibold">
              {heading}
            </h2>
            <p className="mt-1 text-muted-foreground">Here are the closest matches available today.</p>
            {outcome.terms.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Matched on:</span>
                {outcome.terms.map((term) => (
                  <span key={term} className="rounded-full bg-muted px-3 py-1">
                    {term}
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {outcome.vehicles.map((vehicle, index) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} finance={finance} priority={index < 4} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {outcome.browseHref && (
              <Button asChild variant="outline">
                <Link href={outcome.browseHref}>See all similar cars</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/inventory">Browse all inventory</Link>
            </Button>
          </div>
        </section>
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Can&apos;t find the exact car?</h2>
          <p className="mt-1 text-muted-foreground">Tell us what you&apos;re looking for and our team will find it for you.</p>
          <Button asChild className="mt-4 bg-cta text-cta-foreground hover:bg-cta-hover">
            <Link href="/contact">Ask us to find it</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
