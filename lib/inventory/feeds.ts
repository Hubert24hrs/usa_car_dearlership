/**
 * Scheduled feed sync: download a provider export (HomeNet / vAuto /
 * Dealer.com / CDK-style), map it with the provider adapter and run it through
 * the import pipeline as a full snapshot (missing units are marked sold).
 */
import { prisma } from "@/lib/db";
import type { FeedSource } from "@/lib/generated/prisma/client";
import { afterInventoryChange } from "./after-change";
import { getAdapter } from "./importer/adapters";
import { detectFormat, parseInventoryFile } from "./importer/parse";
import { runImport, type ImportSummary } from "./importer/pipeline";

const MAX_FEED_BYTES = 25 * 1024 * 1024;

export function isAllowedFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return process.env.NODE_ENV !== "production" && parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function syncFeedSource(feed: FeedSource, triggeredBy: string): Promise<ImportSummary> {
  try {
    if (!isAllowedFeedUrl(feed.url)) throw new Error("Feed URL must use https://");
    const headers: Record<string, string> = { Accept: "text/csv, application/json;q=0.9, */*;q=0.5" };
    const credential = feed.authEnvVar ? process.env[feed.authEnvVar] : undefined;
    if (credential) headers.Authorization = credential.includes(" ") ? credential : `Bearer ${credential}`;

    const response = await fetch(feed.url, { headers, cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Feed responded ${response.status} ${response.statusText}`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_FEED_BYTES) throw new Error("Feed is larger than 25 MB");
    const text = await response.text();
    if (text.length > MAX_FEED_BYTES) throw new Error("Feed is larger than 25 MB");

    const adapter = getAdapter(feed.provider);
    const format = detectFormat(new URL(feed.url).pathname, text) ?? adapter.format;
    const parsed = parseInventoryFile(text, format);
    if (parsed.records.length === 0) throw new Error(parsed.errors[0]?.message ?? "Feed contained no vehicles");

    const summary = await runImport(
      parsed.records,
      {
        source: "FEED",
        provider: feed.provider,
        sourceRef: `feed:${feed.id}`,
        feedSourceId: feed.id,
        markMissingAsSold: feed.markMissingAsSold,
        defaultLocationId: feed.locationId ?? undefined,
        fileName: feed.url,
        triggeredBy,
      },
      { onCommitted: (s) => afterInventoryChange({ vins: s.vins }) },
    );
    await prisma.feedSource.update({
      where: { id: feed.id },
      data: {
        lastRunAt: new Date(),
        lastStatus: summary.status,
        lastMessage: `${summary.created} new · ${summary.updated} updated · ${summary.markedSold} sold · ${summary.failed} failed`,
      },
    });
    return summary;
  } catch (error) {
    const message = (error as Error).message.slice(0, 500);
    await prisma.feedSource.update({
      where: { id: feed.id },
      data: { lastRunAt: new Date(), lastStatus: "FAILED", lastMessage: message },
    });
    throw error;
  }
}

export async function syncAllFeeds(triggeredBy: string) {
  const feeds = await prisma.feedSource.findMany({ where: { enabled: true } });
  const results: { feed: string; ok: boolean; message: string }[] = [];
  for (const feed of feeds) {
    try {
      const summary = await syncFeedSource(feed, triggeredBy);
      results.push({ feed: feed.name, ok: summary.status !== "FAILED", message: `${summary.created} new, ${summary.updated} updated` });
    } catch (error) {
      results.push({ feed: feed.name, ok: false, message: (error as Error).message });
    }
  }
  return results;
}
