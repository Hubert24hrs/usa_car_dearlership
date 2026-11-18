import {
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  CircleDollarSign,
  Fuel,
  Leaf,
  PlugZap,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { LocationsMap } from "@/components/home/locations-map";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { QuickSearch } from "@/components/home/quick-search";
import { Section } from "@/components/home/section";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { VehicleImage } from "@/components/vehicle/vehicle-image";
import {
  cachedBodyStyleShowcase,
  cachedDealerProfile,
  cachedFeaturedVehicles,
  cachedFinanceAssumptions,
  cachedInventoryStats,
  cachedJustArrived,
  cachedLocations,
  cachedReviews,
} from "@/lib/inventory/cached";
import { BODY_STYLES, FUEL_TYPES, MONTHLY_BUDGET_BANDS } from "@/lib/inventory/constants";
import { buildInventoryHref, EMPTY_FILTERS } from "@/lib/inventory/filters";
import { formatNumber, formatPrice } from "@/lib/format";
import { placeholderUrl } from "@/lib/placeholder";
import { dealerJsonLd } from "@/lib/seo";
import { HERO_IMAGE } from "@/lib/site.config";
import { cn } from "@/lib/utils";

export const revalidate = 300;

const FUEL_ICONS = { ELECTRIC: BatteryCharging, HYBRID: Leaf, PLUG_IN_HYBRID: PlugZap, GAS: Fuel, DIESEL: Truck } as const;
const BODY_COLORS: Record<string, string> = {
  SUV: "1f3a68",
  SEDAN: "9d1b1b",
  TRUCK: "3f4347",
  CROSSOVER: "2d4a6e",
  COUPE: "c4561d",
  CONVERTIBLE: "b9bcbf",
  HATCHBACK: "14a44d",
  VAN: "eceae4",
  WAGON: "6e5236",
};

export default async function HomePage() {
  const [stats, featured, justArrived, finance, dealer, reviews, locations, bodyShowcase] = await Promise.all([
    cachedInventoryStats(),
    cachedFeaturedVehicles(),
    cachedJustArrived(),
    cachedFinanceAssumptions(),
    cachedDealerProfile(),
    cachedReviews(),
    cachedLocations(),
    cachedBodyStyleShowcase(),
  ]);
  const topMakes = [...stats.makes].sort((a, b) => b.count - a.count).slice(0, 18);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand text-brand-foreground" aria-labelledby="hero-heading">
        <VehicleImage src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} fill priority sizes="100vw" className="object-cover object-[center_60%]" />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,31,58,0.94)_0%,rgba(11,31,58,0.78)_45%,rgba(11,31,58,0.35)_100%)]"
          aria-hidden="true"
        />
        <div className="container-page relative grid items-center gap-10 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <BadgeCheck className="size-4 text-[#fda48a]" aria-hidden="true" /> {formatNumber(stats.total)} vehicles in stock
            </p>
            <h1 id="hero-heading" className="text-4xl font-bold leading-[1.05] md:text-6xl">
              Your next car, <span className="text-[#fda48a]">priced up front.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              New, used and certified EVs, hybrids, gas and diesel vehicles, with estimated payments on every listing,
              free delivery within {dealer.freeDeliveryMiles} miles and a {dealer.returnWindowDays}-day return window.
              {dealer.nationwideDelivery && " We also deliver to all 50 states at a deeply discounted rate."}
            </p>
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
          <div className="lg:col-span-2">
            <QuickSearch makes={stats.makes} total={stats.total} />
          </div>
        </div>
      </section>

      {/* ── Browse by fuel type ─────────────────────────────────────────── */}
      <Section id="fuel" eyebrow="Browse by fuel type" title="Electric, hybrid, gas or diesel" action={{ label: "EV & hybrid guide", href: "/electric-hybrid" }}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {FUEL_TYPES.map((fuel) => {
            const Icon = FUEL_ICONS[fuel.value];
            const green = fuel.value !== "GAS" && fuel.value !== "DIESEL";
            return (
              <Link
                key={fuel.value}
                href={`/inventory/${fuel.slug}`}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className={cn("flex size-11 items-center justify-center rounded-xl", green ? "bg-ev-soft text-ev-strong" : "bg-secondary")}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-semibold">{fuel.label}</span>
                <span className="text-sm text-muted-foreground">{formatNumber(stats.byFuel[fuel.value] ?? 0)} available</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Shop <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* ── Browse by body style ────────────────────────────────────────── */}
      <Section id="body" eyebrow="Browse by body style" title="Find the right shape for your life" className="pt-0 md:pt-0">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {BODY_STYLES.map((body) => (
            <Link
              key={body.value}
              href={`/inventory/${body.slug}`}
              className="group overflow-hidden rounded-2xl border bg-card transition hover:shadow-lift"
            >
              <div className="relative aspect-[3/2] bg-muted">
                <VehicleImage
                  src={bodyShowcase[body.value] ?? placeholderUrl({ body: body.value, color: BODY_COLORS[body.value] ?? "64748b", variant: 2 })}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, 50vw"
                  loading="lazy"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="font-semibold">{body.label}</span>
                <span className="text-xs text-muted-foreground">{formatNumber(stats.byBody[body.value] ?? 0)}</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Shop by budget ──────────────────────────────────────────────── */}
      <section className="bg-card py-14 md:py-20" aria-labelledby="budget-heading">
        <div className="container-page">
          <p className="eyebrow mb-2">Shop by budget</p>
          <h2 id="budget-heading" className="text-2xl font-bold md:text-3xl">
            Start with a monthly payment
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Estimated payments shown on every vehicle ({finance.termMonths} months at {finance.aprPercent}% APR with the listed down
            payment, with approved credit).
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
            {MONTHLY_BUDGET_BANDS.map((band) => (
              <Link
                key={band.label}
                href={buildInventoryHref({ ...EMPTY_FILTERS, monthlyMin: band.min, monthlyMax: band.max, sort: "monthly_asc" })}
                className="rounded-2xl border bg-background p-5 text-center transition hover:border-primary hover:shadow-soft"
              >
                <CircleDollarSign className="mx-auto mb-2 size-6 text-cta" aria-hidden="true" />
                <span className="block font-heading text-lg font-bold">{band.label}</span>
                <span className="text-xs text-muted-foreground">per month*</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured / just arrived ─────────────────────────────────────── */}
      <Section id="featured" eyebrow="Hand-picked" title="Featured vehicles" action={{ label: "View all inventory", href: "/inventory" }}>
        <div className="snap-carousel -mx-4 gap-5 px-4 pb-2" role="list" aria-label="Featured vehicles">
          {featured.map((v, i) => (
            <div key={v.id} role="listitem" className="w-[85%] shrink-0 snap-start sm:w-[45%] lg:w-[31%] xl:w-[23.5%]">
              <VehicleCard vehicle={v} finance={finance} priority={i < 2} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="just-arrived" eyebrow="Fresh on the lot" title="Just arrived" action={{ label: "See newest", href: "/inventory?sort=newest" }} className="pt-0 md:pt-0">
        <div className="snap-carousel -mx-4 gap-5 px-4 pb-2" role="list" aria-label="Recently arrived vehicles">
          {justArrived.map((v) => (
            <div key={v.id} role="listitem" className="w-[85%] shrink-0 snap-start sm:w-[45%] lg:w-[31%] xl:w-[23.5%]">
              <VehicleCard vehicle={v} finance={finance} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Top makes ───────────────────────────────────────────────────── */}
      <section className="border-y bg-card py-10" aria-labelledby="makes-heading">
        <div className="container-page">
          <h2 id="makes-heading" className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Shop top makes
          </h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {topMakes.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/inventory/${m.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 font-heading text-sm font-semibold transition hover:border-primary"
                >
                  {m.name} <span className="font-sans text-xs font-normal text-muted-foreground">{formatNumber(m.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Why buy from us ─────────────────────────────────────────────── */}
      <Section id="why" eyebrow="Why buy from us" title="A better way to buy a car">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CircleDollarSign, title: "Transparent pricing", text: "One clear price and an estimated payment on every vehicle. No haggling, no surprises." },
            { icon: ShieldCheck, title: `${dealer.inspectionPoints}-point inspection`, text: "Every pre-owned vehicle is inspected and reconditioned by certified technicians." },
            { icon: RotateCcw, title: `${dealer.returnWindowDays}-day return window`, text: `Love it or return it within ${dealer.returnWindowDays} days or ${formatNumber(dealer.returnWindowMiles)} miles. Terms apply.` },
            {
              icon: Truck,
              title: `Free delivery within ${dealer.freeDeliveryMiles} miles`,
              text: dealer.nationwideDelivery
                ? `Sign online and we'll deliver free within ${dealer.freeDeliveryMiles} miles of our stores. Anywhere else in the US, delivery is deeply discounted.`
                : `Sign online and we'll deliver free within ${dealer.freeDeliveryMiles} miles of our stores.`,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <item.icon className="mb-4 size-8 text-cta" aria-hidden="true" />
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Policy details are placeholders. Confirm return, inspection and delivery terms before launch.</p>
      </Section>

      {/* ── Finance + trade teasers ─────────────────────────────────────── */}
      <section className="container-page grid gap-5 pb-14 md:grid-cols-2 md:pb-20" aria-label="Financing and trade-in">
        <div className="relative overflow-hidden rounded-3xl bg-brand p-8 text-brand-foreground md:p-10">
          <CircleDollarSign className="mb-4 size-10 text-[#fda48a]" aria-hidden="true" />
          <h2 className="text-2xl font-bold md:text-3xl">Get pre-qualified in minutes</h2>
          <p className="mt-3 max-w-md text-white/80">See real terms without affecting your credit score. Then shop with your budget locked in.</p>
          <Button asChild size="lg" className="mt-6 bg-cta text-cta-foreground hover:bg-cta-hover">
            <Link href="/finance#prequalify">
              Start pre-qualification <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="relative overflow-hidden rounded-3xl border bg-card p-8 md:p-10">
          <RotateCcw className="mb-4 size-10 text-cta" aria-hidden="true" />
          <h2 className="text-2xl font-bold md:text-3xl">What&apos;s your car worth?</h2>
          <p className="mt-3 max-w-md text-muted-foreground">Enter your VIN or year, make and model for an instant trade-in estimate. Use it toward any vehicle.</p>
          <Button asChild size="lg" variant="outline" className="mt-6">
            <Link href="/sell-or-trade">
              Value my trade <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Reviews ─────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="bg-card py-14 md:py-20" aria-labelledby="reviews-heading">
          <div className="container-page">
            <p className="eyebrow mb-2">Customer reviews</p>
            <h2 id="reviews-heading" className="text-2xl font-bold md:text-3xl">
              What drivers say about us
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {reviews.slice(0, 6).map((review) => (
                <figure key={review.id} className="flex flex-col rounded-2xl border bg-background p-6">
                  <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`} role="img">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn("size-4", i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden="true" />
                    ))}
                  </div>
                  {review.title && <p className="mt-3 font-semibold">{review.title}</p>}
                  <blockquote className="mt-2 flex-1 text-sm text-muted-foreground">“{review.body}”</blockquote>
                  <figcaption className="mt-4 text-sm font-medium">
                    {review.author}
                    {review.isDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">Sample</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Locations ───────────────────────────────────────────────────── */}
      {locations.length > 0 && (
        <Section id="locations" eyebrow="Visit us" title="Our locations" action={{ label: "All locations & hours", href: "/locations" }}>
          <LocationsMap locations={locations} />
        </Section>
      )}

      {/* ── Service teaser + newsletter ─────────────────────────────────── */}
      <section className="container-page pb-6" aria-labelledby="newsletter-heading">
        <div className="grid items-center gap-8 rounded-3xl bg-brand p-8 text-brand-foreground md:grid-cols-2 md:p-12">
          <div>
            <h2 id="newsletter-heading" className="text-2xl font-bold md:text-3xl">
              Deal alerts & new arrivals
            </h2>
            <p className="mt-2 text-white/80">Be first to know about price drops starting at {stats.minMonthly ? `${formatPrice(stats.minMonthly)}/mo` : "great payments"}. Unsubscribe anytime.</p>
          </div>
          <div className="space-y-3">
            <NewsletterForm />
            <p className="flex items-center gap-2 text-xs text-white/70">
              <Wrench className="size-3.5" aria-hidden="true" /> Need service?{" "}
              <Link href="/service" className="font-semibold underline underline-offset-2">
                Book an appointment
              </Link>
            </p>
          </div>
        </div>
      </section>

      <JsonLd data={dealerJsonLd(dealer, locations, reviews)} />
    </>
  );
}
