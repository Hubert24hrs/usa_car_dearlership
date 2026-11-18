/**
 * Static site configuration and dealer-profile DEFAULTS.
 * Admins can override the dealer profile (name, phones, license number…) in
 * Admin → Settings; those values are stored in the `settings` table.
 *
 * All contact details below are placeholders (555-01xx numbers are reserved
 * for fictional use). Replace them before launch.
 */

export type DealerProfile = {
  name: string;
  legalName: string;
  /** State dealer license number — shown in the footer (required in many states). */
  licenseNumber: string;
  phone: string;
  smsPhone: string;
  email: string;
  address: string;
  /** Policies used in marketing copy — confirm with the dealership. */
  returnWindowDays: number;
  returnWindowMiles: number;
  inspectionPoints: number;
  /** Free home delivery radius around each store, in miles. */
  freeDeliveryMiles: number;
  /** Advertise discounted delivery to all 50 states. */
  nationwideDelivery: boolean;
};

export const DEFAULT_DEALER_PROFILE: DealerProfile = {
  name: "Prestige Auto Group",
  legalName: "Prestige Auto Group, LLC",
  licenseNumber: "DL-000000 (update in Admin → Settings)",
  phone: "(512) 555-0142",
  smsPhone: "(512) 555-0143",
  email: "hello@example.com",
  address: "100 Showroom Way, Austin, TX 78701",
  returnWindowDays: 7,
  returnWindowMiles: 400,
  inspectionPoints: 172,
  freeDeliveryMiles: 30,
  nationwideDelivery: true,
};

/** Suggested searches shown in the search dialog and on /search. */
export const POPULAR_SEARCHES = ["Toyota RAV4", "Tesla Model Y", "Ford F-150", "Honda Civic", "Electric SUV", "Hybrid under 30k", "Jeep Wrangler", "Minivan"];

/** Delivery promise shown across the site, e.g. "Free delivery within 30 miles". */
export function deliveryOffer(dealer: Pick<DealerProfile, "freeDeliveryMiles" | "nationwideDelivery">) {
  const local = `Free delivery within ${dealer.freeDeliveryMiles} miles`;
  const nationwide = dealer.nationwideDelivery ? "Discounted delivery to all 50 states" : null;
  return {
    local,
    nationwide,
    /** One line for banners: "Free delivery within 30 miles · Discounted delivery to all 50 states" */
    short: nationwide ? `${local} · ${nationwide}` : local,
    /** Sentence for body copy. */
    sentence: nationwide
      ? `Free delivery within ${dealer.freeDeliveryMiles} miles of our stores, and deeply discounted delivery to all 50 states.`
      : `Free delivery within ${dealer.freeDeliveryMiles} miles of our stores.`,
  };
}

export const SITE = {
  name: DEFAULT_DEALER_PROFILE.name,
  shortName: "Prestige Auto",
  description:
    "Shop new, used and certified pre-owned EVs, hybrids, gas and diesel vehicles with transparent pricing, multi-point inspections, a no-pressure return window, free local delivery and discounted delivery to all 50 states.",
  locale: "en_US",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  ogImage: "/opengraph-image",
  twitter: "@prestigeauto",
} as const;

/** Homepage hero artwork (AI-generated illustration via Higgsfield). Replace with the dealership's own photography. */
export const HERO_IMAGE = {
  src: "/hero-showroom.jpg",
  alt: "A modern dealership showroom at dusk with an electric SUV, a pickup truck and a sport sedan parked in front",
} as const;

export type NavItem = { label: string; href: string; description?: string };

export const MAIN_NAV: NavItem[] = [
  { label: "Shop New", href: "/new", description: "Latest models with factory warranty" },
  { label: "Shop Used", href: "/used", description: "Inspected used & certified pre-owned" },
  { label: "Electric & Hybrid", href: "/electric-hybrid", description: "EVs, hybrids and plug-ins" },
  { label: "Sell/Trade", href: "/sell-or-trade", description: "Get an instant trade-in estimate" },
  { label: "Finance", href: "/finance", description: "Pre-qualify with no impact to your score" },
  { label: "Service", href: "/service", description: "Book maintenance and repairs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const FOOTER_NAV: { title: string; links: NavItem[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "All inventory", href: "/inventory" },
      { label: "New vehicles", href: "/new" },
      { label: "Used vehicles", href: "/used" },
      { label: "Certified pre-owned", href: "/inventory/certified" },
      { label: "Electric vehicles", href: "/inventory/electric" },
      { label: "Hybrids", href: "/inventory/hybrid" },
      { label: "Compare vehicles", href: "/compare" },
    ],
  },
  {
    title: "Buy with confidence",
    links: [
      { label: "Get pre-qualified", href: "/finance" },
      { label: "Value your trade", href: "/sell-or-trade" },
      { label: "EV & hybrid guide", href: "/electric-hybrid" },
      { label: "Schedule service", href: "/service" },
      { label: "Saved vehicles", href: "/saved" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Locations & hours", href: "/locations" },
      { label: "Contact", href: "/contact" },
      { label: "Staff sign in", href: "/account/sign-in?callbackUrl=/admin" },
    ],
  },
];

export const LEGAL_NAV: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Do Not Sell or Share My Personal Information", href: "/privacy/choices" },
  { label: "Pricing & finance disclosures", href: "/terms#pricing" },
];

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits.length === 10 ? `1${digits}` : digits}`;
}

export function smsHref(phone: string, body?: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = `+${digits.length === 10 ? `1${digits}` : digits}`;
  return body ? `sms:${number}?&body=${encodeURIComponent(body)}` : `sms:${number}`;
}

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
