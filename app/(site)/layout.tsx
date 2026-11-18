import { ConsentBanner } from "@/components/analytics/consent-banner";
import { MobileCtaBar } from "@/components/layout/mobile-cta-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CompareTray } from "@/components/vehicle/compare-tray";
import { cachedDealerProfile } from "@/lib/inventory/cached";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const dealer = await cachedDealerProfile();
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <CompareTray />
      <MobileCtaBar phone={dealer.phone} smsPhone={dealer.smsPhone} />
      <ConsentBanner />
    </>
  );
}
