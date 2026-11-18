/**
 * SEO browse URLs.
 *
 * /inventory/<vehicle-slug-ending-in-VIN>   → vehicle detail page (no rewrite)
 * /inventory/electric/suv                   → rewritten to /inventory/browse/electric/suv
 * /inventory/used/toyota/camry              → rewritten to /inventory/browse/used/toyota/camry
 *
 * The browse route parses the segments into filters; the visible URL stays
 * the clean canonical one. (Auth is enforced server-side in pages/actions,
 * never only in middleware.)
 */
import { NextResponse, type NextRequest } from "next/server";
import { isVehicleSlug } from "@/lib/inventory/slug";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "inventory"
  if (segments.length === 0) return NextResponse.next();
  if (segments[0] === "browse") return NextResponse.next(); // handled by redirects() in next.config
  if (segments.length === 1 && isVehicleSlug(segments[0]!.toLowerCase())) return NextResponse.next();
  if (segments.length > 5) return NextResponse.next(); // let it 404

  const url = request.nextUrl.clone();
  url.pathname = `/inventory/browse/${segments.join("/")}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/inventory/:path+"],
};
