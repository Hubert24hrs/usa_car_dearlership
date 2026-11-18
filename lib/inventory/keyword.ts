/**
 * Keyword search providers.
 *
 *  • postgres (default): full-text search over vehicles.search_text using
 *    to_tsvector/to_tsquery with prefix matching ("cam" → Camry) and English
 *    stemming ("trucks" → truck). Zero extra infrastructure.
 *  • meilisearch (optional): typo-tolerant search for very large inventories.
 *    Enable with SEARCH_DRIVER=meilisearch + MEILISEARCH_HOST. Falls back to
 *    Postgres automatically if Meilisearch is unreachable.
 *
 * Providers return a Map of vehicle id → relevance score (higher = better).
 */
import { prisma } from "@/lib/db";

export type KeywordMatches = Map<string, number>;

/** Turn free text into a safe prefix tsquery: "toyota cam" → "toyota:* & cam:*". */
export function toPrefixTsQuery(q: string): string | null {
  const tokens = q
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 8);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

async function postgresMatches(q: string): Promise<KeywordMatches> {
  const tsquery = toPrefixTsQuery(q);
  if (!tsquery) return new Map();
  const rows = await prisma.$queryRaw<{ id: string; rank: number }[]>`
    SELECT id::text AS id,
           ts_rank(to_tsvector('english', search_text), to_tsquery('english', ${tsquery})) AS rank
    FROM vehicles
    WHERE to_tsvector('english', search_text) @@ to_tsquery('english', ${tsquery})
    ORDER BY rank DESC
    LIMIT 5000`;
  return new Map(rows.map((r) => [r.id, Number(r.rank)]));
}

async function meilisearchMatches(q: string): Promise<KeywordMatches> {
  const host = process.env.MEILISEARCH_HOST!.replace(/\/$/, "");
  const index = process.env.MEILISEARCH_INDEX ?? "vehicles";
  const response = await fetch(`${host}/indexes/${encodeURIComponent(index)}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MEILISEARCH_API_KEY ? { Authorization: `Bearer ${process.env.MEILISEARCH_API_KEY}` } : {}),
    },
    body: JSON.stringify({ q, limit: 1000, attributesToRetrieve: ["id"] }),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`Meilisearch responded ${response.status}`);
  const json = (await response.json()) as { hits: { id: string }[] };
  const total = json.hits.length;
  return new Map(json.hits.map((hit, index) => [hit.id, total - index]));
}

export async function keywordMatches(q: string): Promise<KeywordMatches> {
  if (process.env.SEARCH_DRIVER === "meilisearch" && process.env.MEILISEARCH_HOST) {
    try {
      return await meilisearchMatches(q);
    } catch (error) {
      console.warn("[search] Meilisearch unavailable, falling back to Postgres:", (error as Error).message);
    }
  }
  return postgresMatches(q);
}

/**
 * Push vehicles to Meilisearch after imports/edits (no-op unless enabled).
 * Documents contain public fields only.
 */
export async function syncMeilisearch(vins?: string[]): Promise<void> {
  if (process.env.SEARCH_DRIVER !== "meilisearch" || !process.env.MEILISEARCH_HOST) return;
  const host = process.env.MEILISEARCH_HOST.replace(/\/$/, "");
  const index = process.env.MEILISEARCH_INDEX ?? "vehicles";
  const vehicles = await prisma.vehicle.findMany({
    where: vins ? { vin: { in: vins } } : undefined,
    select: { id: true, vin: true, year: true, make: true, model: true, trim: true, searchText: true, status: true },
  });
  await fetch(`${host}/indexes/${encodeURIComponent(index)}/documents?primaryKey=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MEILISEARCH_API_KEY ? { Authorization: `Bearer ${process.env.MEILISEARCH_API_KEY}` } : {}),
    },
    body: JSON.stringify(vehicles),
  }).catch((error: Error) => console.warn("[search] Meilisearch sync failed:", error.message));
}
