import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { DealerProfileForm, PricingSettingsForm } from "@/components/admin/settings-forms";
import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getDealerProfile, getFinanceAssumptions, getPricingMultipliers } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings & pricing" };

export default async function SettingsPage() {
  await requirePagePermission("settings:write");
  const [multipliers, finance, dealer, audit] = await Promise.all([
    getPricingMultipliers(),
    getFinanceAssumptions(),
    getDealerProfile(),
    prisma.auditLog.findMany({ where: { action: { startsWith: "settings" } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings & pricing</h1>
        <p className="text-sm text-muted-foreground">Changes apply immediately — no redeploy required.</p>
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-6" aria-labelledby="pricing-heading">
        <div>
          <h2 id="pricing-heading" className="text-lg font-semibold">
            Pricing multipliers & payment disclosure
          </h2>
          <p className="text-sm text-muted-foreground">
            Defaults live in <code className="rounded bg-muted px-1">lib/pricing.config.ts</code>. Saving here overrides them and re-prices every vehicle from its stored base_* values.
          </p>
        </div>
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          Compliance note: when the monthly multiplier differs from the price multiplier, the advertised payment may not equal the payment
          implied by the advertised price, APR and term. Truth-in-Lending advertising rules (Reg Z / Reg M) and state law require advertised
          payment terms to be accurate — have counsel review before launch.
        </p>
        <PricingSettingsForm initial={{ ...multipliers, ...finance }} />
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-6" aria-labelledby="dealer-heading">
        <h2 id="dealer-heading" className="text-lg font-semibold">
          Dealer profile
        </h2>
        <DealerProfileForm initial={dealer} />
      </section>

      <section className="rounded-2xl border bg-card p-6" aria-labelledby="audit-heading">
        <h2 id="audit-heading" className="mb-3 text-lg font-semibold">
          Recent settings changes
        </h2>
        <ul className="divide-y text-sm">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                {a.action} by {a.actor}
              </span>
              <span className="text-muted-foreground">{formatDate(a.createdAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </li>
          ))}
          {audit.length === 0 && <li className="py-2 text-muted-foreground">No changes yet.</li>}
        </ul>
      </section>
    </div>
  );
}
