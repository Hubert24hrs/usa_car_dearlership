import type { NextRequest } from "next/server";
import type { BodyStyle } from "@/lib/generated/prisma/enums";
import { vehiclePlaceholderSvg } from "@/lib/placeholder";

const BODIES = new Set<BodyStyle>(["SEDAN", "SUV", "CROSSOVER", "TRUCK", "COUPE", "CONVERTIBLE", "HATCHBACK", "VAN", "WAGON"]);

/** Generated placeholder artwork for demo inventory (cached forever by URL). */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const body = (params.get("body") ?? "sedan").toUpperCase() as BodyStyle;
  const color = (params.get("color") ?? "64748b").replace(/[^0-9a-f]/gi, "").slice(0, 6);
  const variant = Number(params.get("v") ?? 0) || 0;
  const angleParam = params.get("angle");
  const angle = angleParam === null ? undefined : Math.max(0, Math.min(359, Number(angleParam) || 0));
  const label = (params.get("label") ?? "").slice(0, 60);

  const svg = vehiclePlaceholderSvg({
    body: BODIES.has(body) ? body : "SEDAN",
    color: color.length === 6 ? color : "64748b",
    variant,
    angle,
    label: label || undefined,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
