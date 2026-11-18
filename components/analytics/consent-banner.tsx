"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/analytics";

/**
 * Privacy-first consent banner: nothing beyond strictly necessary storage and
 * cookieless Vercel Analytics runs until the visitor chooses. Global Privacy
 * Control (GPC) is treated as an automatic opt-out of sale/sharing (CCPA).
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasTrackers = Boolean(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID);
    setVisible(hasTrackers && getConsent() === "unset");
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="no-print fixed inset-x-3 bottom-20 z-50 mx-auto max-w-2xl rounded-2xl border bg-card p-4 shadow-lift md:bottom-6"
    >
      <p className="text-sm text-muted-foreground">
        We use optional analytics and advertising cookies to improve our site and show relevant offers. You can change
        your choice anytime on our{" "}
        <Link href="/privacy/choices" className="font-medium text-primary underline underline-offset-2">
          privacy choices
        </Link>{" "}
        page.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setConsent("denied");
            setVisible(false);
          }}
        >
          Decline optional cookies
        </Button>
        <Button
          size="sm"
          className="bg-cta text-cta-foreground hover:bg-cta-hover"
          onClick={() => {
            setConsent("granted");
            setVisible(false);
          }}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
