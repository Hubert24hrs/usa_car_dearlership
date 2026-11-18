import { Phone } from "lucide-react";
import Link from "next/link";
import { cachedDealerProfile } from "@/lib/inventory/cached";
import { MAIN_NAV, telHref } from "@/lib/site.config";
import { AccountMenu, DesktopNav, MobileNav, SavedLink, ThemeToggle } from "./header-actions";
import { Logo } from "./logo";

export async function SiteHeader() {
  const dealer = await cachedDealerProfile();
  const phoneHref = telHref(dealer.phone);
  return (
    <header role="banner" className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="hidden bg-brand text-brand-foreground md:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="text-white/85">
            Transparent pricing · {dealer.inspectionPoints}-point inspections · {dealer.returnWindowDays}-day return window ·
            Home delivery
          </p>
          <div className="flex items-center gap-4 text-white/85">
            <Link href="/locations" className="hover:text-white">
              Locations & hours
            </Link>
            <Link href="/finance" className="hover:text-white">
              Get pre-qualified
            </Link>
          </div>
        </div>
      </div>
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0 rounded-lg" aria-label={`${dealer.name} home`}>
          <Logo />
        </Link>
        <div className="flex flex-1 justify-center">
          <DesktopNav items={MAIN_NAV} />
        </div>
        <div className="flex items-center gap-1">
          <a
            href={phoneHref}
            className="mr-2 hidden items-center gap-2 rounded-full bg-cta px-4 py-2 text-sm font-semibold text-cta-foreground transition-colors hover:bg-cta-hover md:inline-flex"
          >
            <Phone className="size-4" aria-hidden="true" />
            <span>{dealer.phone}</span>
          </a>
          <SavedLink />
          <AccountMenu />
          <ThemeToggle />
          <MobileNav items={MAIN_NAV} phone={dealer.phone} phoneHref={phoneHref} />
        </div>
      </div>
    </header>
  );
}
