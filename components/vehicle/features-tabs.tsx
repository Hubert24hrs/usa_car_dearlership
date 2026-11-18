"use client";

import { Check, FileText, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FeaturesTabs({
  features,
  safety,
  description,
  carfaxUrl,
  condition,
}: {
  features: string[];
  safety: string[];
  description: string | null;
  carfaxUrl: string | null;
  condition: "NEW" | "USED" | "CPO";
}) {
  return (
    <section aria-label="Features and details" className="rounded-2xl border bg-card p-5 md:p-6">
      <Tabs defaultValue="features">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="features">Features ({features.length})</TabsTrigger>
          <TabsTrigger value="safety">Safety ({safety.length})</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {condition !== "NEW" && <TabsTrigger value="history">Vehicle history</TabsTrigger>}
        </TabsList>
        <TabsContent value="features">
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-ev-strong" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="safety">
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {safety.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="overview">
          <p className="text-sm leading-relaxed text-muted-foreground">{description ?? "Contact us for full details on this vehicle."}</p>
        </TabsContent>
        {condition !== "NEW" && (
          <TabsContent value="history" className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Every pre-owned vehicle includes a vehicle history report and a multi-point inspection before it&apos;s listed.
            </p>
            {carfaxUrl ? (
              <a
                href={carfaxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium hover:bg-accent"
              >
                <FileText className="size-4" aria-hidden="true" /> View vehicle history report
              </a>
            ) : (
              <p className="rounded-xl bg-muted/60 p-3">
                History report available on request. Use “Check availability” and we&apos;ll send it with your quote.
              </p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </section>
  );
}
