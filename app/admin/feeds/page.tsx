import type { Metadata } from "next";
import { FeedManager } from "@/components/admin/feed-manager";
import { requirePagePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/site.config";

export const metadata: Metadata = { title: "Inventory feeds" };

export default async function FeedsPage() {
  await requirePagePermission("feeds:manage");
  const [feeds, locations] = await Promise.all([
    prisma.feedSource.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.location.findMany({ select: { id: true, name: true } }),
  ]);
  const syncUrl = absoluteUrl("/api/inventory/sync");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory feeds</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Pull the dealership&apos;s own inventory from HomeNet, vAuto, Dealer.com or CDK-style exports. Enabled feeds sync daily via
          Vercel Cron; use “Run now” for an immediate sync.
        </p>
      </div>
      <FeedManager
        locations={locations}
        feeds={feeds.map((f) => ({
          id: f.id,
          name: f.name,
          provider: f.provider,
          url: f.url,
          authEnvVar: f.authEnvVar,
          locationId: f.locationId,
          enabled: f.enabled,
          markMissingAsSold: f.markMissingAsSold,
          lastRunAt: f.lastRunAt?.toISOString() ?? null,
          lastStatus: f.lastStatus,
          lastMessage: f.lastMessage,
        }))}
      />
      <section className="space-y-2 rounded-2xl border bg-card p-5 text-sm">
        <h2 className="font-semibold">Push API</h2>
        <p className="text-muted-foreground">Integrations can push snapshots directly (Bearer INVENTORY_SYNC_SECRET or CRON_SECRET):</p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">{`POST ${syncUrl}
Authorization: Bearer <secret>
Content-Type: application/json

{ "provider": "HOMENET", "sourceRef": "main-lot", "markMissingAsSold": true, "vehicles": [ { "vin": "…", "base_price": 25000, … } ] }

# or CSV:
POST ${syncUrl}?provider=VAUTO&sourceRef=vauto-main
Content-Type: text/csv`}</pre>
      </section>
    </div>
  );
}
