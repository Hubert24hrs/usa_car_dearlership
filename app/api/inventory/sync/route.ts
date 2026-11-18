import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { afterInventoryChange } from "@/lib/inventory/after-change";
import { syncAllFeeds } from "@/lib/inventory/feeds";
import { parseCsv } from "@/lib/inventory/importer/parse";
import { runImport } from "@/lib/inventory/importer/pipeline";
import { hasValidBearer } from "@/lib/security";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const secrets = () => [process.env.INVENTORY_SYNC_SECRET, process.env.CRON_SECRET];

/**
 * GET  — pull mode (Vercel Cron): sync every enabled feed source.
 * POST — push mode: a provider/integration posts a snapshot directly.
 *        JSON: { provider?, sourceRef?, markMissingAsSold?, vehicles: [...] }
 *        CSV:  text/csv body (?provider=HOMENET&sourceRef=homenet-main)
 * Both require `Authorization: Bearer <INVENTORY_SYNC_SECRET or CRON_SECRET>`.
 */
export async function GET(request: NextRequest) {
  if (!hasValidBearer(request, ...secrets())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await syncAllFeeds("cron");
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}

const PROVIDERS = ["HOMENET", "VAUTO", "DEALERCOM", "CDK", "GENERIC_CSV", "GENERIC_JSON"] as const;
const pushSchema = z.object({
  provider: z.enum(PROVIDERS).optional(),
  sourceRef: z.string().trim().min(1).max(80).default("push"),
  markMissingAsSold: z.boolean().default(false),
  vehicles: z.array(z.record(z.string(), z.unknown())).max(20_000),
});

export async function POST(request: NextRequest) {
  if (!hasValidBearer(request, ...secrets())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentType = request.headers.get("content-type") ?? "";
  let payload: z.infer<typeof pushSchema>;

  if (contentType.includes("text/csv")) {
    const parsed = parseCsv(await request.text());
    const params = request.nextUrl.searchParams;
    payload = pushSchema.parse({
      provider: params.get("provider") ?? "GENERIC_CSV",
      sourceRef: params.get("sourceRef") ?? "push-csv",
      markMissingAsSold: params.get("markMissingAsSold") === "true",
      vehicles: parsed.records,
    });
  } else {
    const body = pushSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Invalid payload", issues: body.error.issues.slice(0, 10) }, { status: 400 });
    payload = body.data;
  }

  const summary = await runImport(
    payload.vehicles,
    {
      source: "FEED",
      provider: payload.provider,
      sourceRef: `push:${payload.sourceRef}`,
      markMissingAsSold: payload.markMissingAsSold,
      triggeredBy: "api-push",
      fileName: `push:${payload.sourceRef}`,
    },
    { onCommitted: (s) => afterInventoryChange({ vins: s.vins }) },
  );
  const { vins: _vins, ...rest } = summary;
  return NextResponse.json({ ...rest, errors: rest.errors.slice(0, 100), warnings: rest.warnings.slice(0, 100) }, { status: summary.status === "FAILED" ? 422 : 200 });
}
