/**
 * Structured data (schema.org JSON-LD) builders. Public values only.
 */
import { bodyLabel, conditionLabel, drivetrainLabel, fuelLabel } from "@/lib/inventory/constants";
import type { PublicVehicleCard, PublicVehicleDetail } from "@/lib/inventory/public";
import type { PublicLocation, PublicReview } from "@/lib/inventory/vehicles";
import { vehicleTitle } from "@/lib/format";
import { absoluteUrl, SITE, type DealerProfile } from "@/lib/site.config";

const DAY_MAP: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function imageUrl(src: string) {
  return src.startsWith("http") ? src : absoluteUrl(src);
}

export function vehicleJsonLd(v: PublicVehicleDetail, dealer: DealerProfile) {
  return {
    "@context": "https://schema.org",
    "@type": ["Car", "Product"],
    name: vehicleTitle(v),
    url: absoluteUrl(`/inventory/${v.slug}`),
    image: v.images.slice(0, 8).map(imageUrl),
    description: v.description ?? undefined,
    sku: v.stockNumber,
    vehicleIdentificationNumber: v.vin,
    brand: { "@type": "Brand", name: v.make },
    manufacturer: { "@type": "Organization", name: v.make },
    model: v.model,
    vehicleConfiguration: v.trim || undefined,
    vehicleModelDate: String(v.year),
    modelDate: String(v.year),
    bodyType: bodyLabel(v.bodyStyle),
    color: v.exteriorColor,
    vehicleInteriorColor: v.interiorColor,
    fuelType: fuelLabel(v.fuelType),
    driveWheelConfiguration: drivetrainLabel(v.drivetrain, false),
    vehicleTransmission: v.transmission || undefined,
    vehicleEngine: v.engine ? { "@type": "EngineSpecification", name: v.engine } : undefined,
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileage, unitCode: "SMI" },
    itemCondition:
      v.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    fuelEfficiency: v.mpgCombined
      ? { "@type": "QuantitativeValue", value: v.mpgCombined, unitText: "MPG (combined)" }
      : undefined,
    offers: {
      "@type": "Offer",
      price: v.displayPrice,
      priceCurrency: "USD",
      availability:
        v.status === "SOLD"
          ? "https://schema.org/SoldOut"
          : v.status === "PENDING"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/InStock",
      itemCondition:
        v.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      url: absoluteUrl(`/inventory/${v.slug}`),
      seller: { "@type": "AutoDealer", name: dealer.name, telephone: dealer.phone },
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Condition", value: conditionLabel(v.condition) },
      ...(v.evRangeMiles ? [{ "@type": "PropertyValue", name: "Electric range", value: `${v.evRangeMiles} mi` }] : []),
    ],
  };
}

export function itemListJsonLd(vehicles: PublicVehicleCard[], name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: vehicles.length,
    itemListElement: vehicles.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/inventory/${v.slug}`),
      name: vehicleTitle(v),
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

/**
 * AutoDealer organization markup. Reviews are only included when they are
 * real (non-demo) — never publish placeholder reviews as structured data.
 */
export function dealerJsonLd(dealer: DealerProfile, locations: PublicLocation[], reviews: PublicReview[]) {
  const real = reviews.filter((r) => !r.isDemo);
  const average = real.length ? real.reduce((s, r) => s + r.rating, 0) / real.length : null;
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: dealer.name,
    legalName: dealer.legalName,
    url: SITE.url,
    telephone: dealer.phone,
    email: dealer.email,
    logo: absoluteUrl("/icon.svg"),
    department: locations.map((l) => ({
      "@type": "AutoDealer",
      name: l.name,
      telephone: l.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: [l.address1, l.address2].filter(Boolean).join(", "),
        addressLocality: l.city,
        addressRegion: l.state,
        postalCode: l.zip,
        addressCountry: "US",
      },
      geo: { "@type": "GeoCoordinates", latitude: l.latitude, longitude: l.longitude },
      openingHoursSpecification: l.salesHours
        .filter((h) => h.open && h.close)
        .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_MAP[h.day] ?? h.day, opens: h.open, closes: h.close })),
    })),
    ...(average !== null
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: real.length },
          review: real.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author },
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.body,
            datePublished: r.createdAt.slice(0, 10),
          })),
        }
      : {}),
  };
}

/** Serialize JSON-LD safely for a <script> tag (prevents </script> injection). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
