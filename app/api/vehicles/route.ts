import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cachedFinanceAssumptions } from "@/lib/inventory/cached";
import { getVehicleCardsByIds } from "@/lib/inventory/vehicles";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

/** Public vehicle cards by id (saved vehicles, recently viewed). display_* only. */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(`vehicles:${getClientIp(request.headers)}`, LIMITS.api);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => z.uuid().safeParse(id).success)
    .slice(0, 60);
  const [vehicles, finance] = await Promise.all([getVehicleCardsByIds(ids), cachedFinanceAssumptions()]);
  return NextResponse.json({ vehicles, finance }, { headers: { "Cache-Control": "private, max-age=30" } });
}
