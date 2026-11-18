import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { cachedDealerProfile, cachedFinanceAssumptions } from "@/lib/inventory/cached";
import { PRICING_CONFIG } from "@/lib/pricing.config";

export const metadata: Metadata = { title: "Terms of use & pricing disclosures", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const [dealer, finance] = await Promise.all([cachedDealerProfile(), cachedFinanceAssumptions()]);
  return (
    <>
      <PageHeader title="Terms of use" crumbs={[{ name: "Terms", href: "/terms" }]} description="Template — have counsel review and customize before launch." />
      <div className="container-page py-12">
        <article className="prose-legal">
          <h2>Use of this site</h2>
          <p>
            By using this website you agree to these terms. Content is provided for general information. We may update the site
            and these terms at any time.
          </p>
          <h2 id="pricing">Pricing, payment & availability disclosures</h2>
          <ul>
            <li>{PRICING_CONFIG.disclaimers.priceExcludes}</li>
            <li>
              Estimated monthly payments are calculated using a {finance.termMonths}-month term at {finance.aprPercent}% APR with the
              down payment shown on each listing. {PRICING_CONFIG.disclaimers.paymentEstimate}
            </li>
            <li>{PRICING_CONFIG.disclaimers.calculator}</li>
            <li>
              While we strive for accuracy, errors in pricing, specifications, photos or availability may occur. Vehicle
              information is provided by third-party data sources and should be verified with the dealership. Mileage of used
              vehicles is as displayed on the odometer at the time of listing.
            </li>
            <li>Manufacturer incentives and rebates are subject to change, may vary by region and not all buyers will qualify.</li>
            <li>EPA fuel-economy and range estimates are for comparison purposes only; actual results will vary.</li>
          </ul>
          <h2>Communications</h2>
          <p>
            If you provide your phone number and consent, you agree to receive calls and text messages about your inquiry, which
            may be sent using automated technology. Consent is not a condition of purchase. Reply STOP to opt out of texts.
          </p>
          <h2>Intellectual property</h2>
          <p>All site content is owned by or licensed to {dealer.legalName}. Vehicle manufacturer names and model names are trademarks of their respective owners.</p>
          <h2>Limitation of liability</h2>
          <p>To the extent permitted by law, we are not liable for indirect or consequential damages arising from use of this site.</p>
          <h2>Contact</h2>
          <p>
            {dealer.legalName} · {dealer.address} · Dealer license {dealer.licenseNumber}
          </p>
        </article>
      </div>
    </>
  );
}
