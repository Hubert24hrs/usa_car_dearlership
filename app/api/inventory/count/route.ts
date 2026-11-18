import { NextResponse, type NextRequest } from "next/server";
import { cachedCountInventory } from "@/lib/inventory/cached";
import { parseFilters } from "@/lib/inventory/filters";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

/** Live result count for the homepage quick search ("Search 1,248 vehicles"). */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(`count:${getClientIp(request.headers)}`, LIMITS.api);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { filters } = parseFilters(request.nextUrl.searchParams);
  const count = await cachedCountInventory(filters);
  return NextResponse.json({ count }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
