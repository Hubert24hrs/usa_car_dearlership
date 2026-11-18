import Link from "next/link";
import { cachedDealerProfile } from "@/lib/inventory/cached";
import { PRICING_CONFIG } from "@/lib/pricing.config";
import { shouldShowDemoInventory } from "@/lib/settings";
import { FOOTER_NAV, LEGAL_NAV, telHref } from "@/lib/site.config";
import { Logo } from "./logo";

export async function SiteFooter() {
  const dealer = await cachedDealerProfile();
  const year = new Date().getFullYear();
  return (
    <footer role="contentinfo" className="mt-20 border-t bg-card pb-24 md:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Transparent pricing on new, used and certified pre-owned electric, hybrid, gas and diesel vehicles — with
            home delivery and a no-pressure return window.
          </p>
          <address className="space-y-1 text-sm not-italic text-muted-foreground">
            <p>{dealer.address}</p>
            <p>
              <a href={telHref(dealer.phone)} className="font-medium text-foreground hover:underline">
                {dealer.phone}
              </a>{" "}
              ·{" "}
              <a href={`mailto:${dealer.email}`} className="hover:underline">
                {dealer.email}
              </a>
            </p>
          </address>
          <p className="text-xs text-muted-foreground">
            {dealer.legalName} · Dealer license <span className="font-medium text-foreground">{dealer.licenseNumber}</span>
          </p>
        </div>
        {FOOTER_NAV.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="mb-3 text-sm font-semibold">{section.title}</h2>
            <ul className="space-y-2 text-sm">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="container-page space-y-3 py-6 text-xs leading-relaxed text-muted-foreground">
          <p>{PRICING_CONFIG.disclaimers.priceExcludes}</p>
          <p>
            *Estimated monthly payments are for illustration only and are not an offer of credit. See each listing for
            the term, APR and down payment used. {PRICING_CONFIG.disclaimers.calculator}
          </p>
          {shouldShowDemoInventory() && (
            <p className="font-medium text-foreground">
              Demo mode: inventory, photos, reviews and locations shown are placeholder data for development and are
              not real offers.
            </p>
          )}
          <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
            <p>
              © {year} {dealer.legalName}. All rights reserved.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {LEGAL_NAV.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
