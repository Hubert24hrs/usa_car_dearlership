/**
 * Saved-search email alerts. Run daily by Vercel Cron (GET /api/alerts/run).
 * For each due search, finds vehicles that arrived since the last notice and
 * emails up to 10 of them.
 */
import { prisma } from "@/lib/db";
import { savedSearchAlertEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email";
import { vehicleTitle } from "@/lib/format";
import { parseFilters } from "@/lib/inventory/filters";
import { buildVehicleWhere } from "@/lib/inventory/query";
import { getDealerProfile, shouldShowDemoInventory } from "@/lib/settings";
import { absoluteUrl, DEFAULT_DEALER_PROFILE } from "@/lib/site.config";

const DAY = 86_400_000;

export function filtersFromSavedUrl(url: string) {
  const [path = "/inventory", query = ""] = url.split("?");
  const segments = path.split("/").filter(Boolean).slice(1);
  return parseFilters(new URLSearchParams(query), segments).filters;
}

export async function runSavedSearchAlerts(now = new Date(), batchSize = 200) {
  const searches = await prisma.savedSearch.findMany({
    where: {
      alertsEnabled: true,
      OR: [
        { frequency: "DAILY", OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lte: new Date(now.getTime() - DAY + 3_600_000) } }] },
        { frequency: "WEEKLY", OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lte: new Date(now.getTime() - 7 * DAY + 3_600_000) } }] },
      ],
    },
    orderBy: { lastNotifiedAt: "asc" },
    take: batchSize,
  });
  const dealer = await getDealerProfile().catch(() => DEFAULT_DEALER_PROFILE);
  const includeDemo = shouldShowDemoInventory();
  let sent = 0;

  for (const search of searches) {
    const since = search.lastNotifiedAt ?? search.createdAt;
    const filters = filtersFromSavedUrl(search.url);
    const vehicles = await prisma.vehicle.findMany({
      where: { AND: [buildVehicleWhere(filters, { includeDemo }), { createdAt: { gt: since } }] },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { year: true, make: true, model: true, trim: true, slug: true, displayPrice: true, displayMonthlyPayment: true, mileage: true },
    });
    if (vehicles.length > 0) {
      const unsubscribeUrl = absoluteUrl(`/api/unsubscribe?type=alert&token=${search.unsubscribeToken}`);
      const email = savedSearchAlertEmail(
        {
          name: search.name,
          searchUrl: absoluteUrl(search.url),
          unsubscribeUrl,
          vehicles: vehicles.map((v) => ({
            title: vehicleTitle(v),
            slug: v.slug,
            displayPrice: Number(v.displayPrice),
            displayMonthlyPayment: Number(v.displayMonthlyPayment),
            mileage: v.mileage,
          })),
        },
        dealer,
      );
      const result = await sendEmail({ to: search.email, unsubscribeUrl, ...email });
      if (result.ok) sent++;
    }
    await prisma.savedSearch.update({ where: { id: search.id }, data: { lastNotifiedAt: now } });
  }
  return { checked: searches.length, sent };
}
