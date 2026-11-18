import { NextResponse, type NextRequest } from "next/server";
import { suggestVehicles } from "@/lib/inventory/smart-search";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

/** Live suggestions for the header search box: in-stock cars matching what's typed. */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(`suggest:${getClientIp(request.headers)}`, LIMITS.api);
  if (!limited.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { total, vehicles } = await suggestVehicles(request.nextUrl.searchParams.get("q"));
  return NextResponse.json(
    {
      total,
      vehicles: vehicles.map((v) => ({
        slug: v.slug,
        title: `${v.year} ${v.make} ${v.model}`,
        trim: v.trim,
        price: v.displayPrice,
        monthly: v.displayMonthlyPayment,
        image: v.images[0] ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
