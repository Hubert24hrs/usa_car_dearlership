"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getConsent, setConsent, type ConsentState } from "@/lib/analytics";

export function PrivacyChoices() {
  const [consent, setConsentState] = useState<ConsentState>("unset");
  const [gpc, setGpc] = useState(false);
  useEffect(() => {
    setConsentState(getConsent());
    setGpc(Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl));
  }, []);
  const optedOut = consent !== "granted";
  return (
    <section aria-labelledby="opt-out" className="rounded-2xl border bg-card p-6">
      <h2 id="opt-out" className="mb-2 text-xl font-semibold">
        Sale / sharing & optional cookies
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        When switched off, we won&apos;t load advertising pixels or optional analytics on this browser.
      </p>
      {gpc && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-ev-soft p-3 text-sm text-ev-strong">
          <ShieldCheck className="size-4" aria-hidden="true" /> Global Privacy Control detected. You are opted out automatically.
        </p>
      )}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-4">
        <label htmlFor="consent-toggle" className="text-sm font-medium">
          Allow optional analytics & advertising cookies
        </label>
        <Switch
          id="consent-toggle"
          checked={!optedOut}
          disabled={gpc}
          onCheckedChange={(checked) => {
            setConsent(checked ? "granted" : "denied");
            setConsentState(checked ? "granted" : "denied");
            toast.success(checked ? "Preferences saved" : "You've opted out of sale/sharing on this browser", {
              description: checked ? undefined : "Reload the page to fully remove any loaded scripts.",
            });
          }}
        />
      </div>
    </section>
  );
}
