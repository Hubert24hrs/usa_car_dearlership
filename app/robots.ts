import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site.config";

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deployments must not be indexed; only the production domain should be.
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account", "/saved", "/compare", "/unsubscribe", "/inventory?q=", "/search"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
