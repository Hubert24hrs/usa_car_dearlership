import { NextResponse, type NextRequest } from "next/server";
import { runSavedSearchAlerts } from "@/lib/alerts";
import { hasValidBearer } from "@/lib/security";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Daily saved-search alert job (Vercel Cron sends Authorization: Bearer $CRON_SECRET). */
export async function GET(request: NextRequest) {
  if (!hasValidBearer(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runSavedSearchAlerts();
  return NextResponse.json({ ok: true, ...result });
}
