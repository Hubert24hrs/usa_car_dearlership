import type { NextConfig } from "next";

/** Remote image hosts allowed for next/image optimization. */
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "res.cloudinary.com" },
  { protocol: "https", hostname: "**.amazonaws.com" },
  { protocol: "https", hostname: "**.r2.dev" },
  { protocol: "https", hostname: "**.cloudfront.net" },
];
if (process.env.S3_PUBLIC_URL) {
  try {
    remotePatterns.push({ protocol: "https", hostname: new URL(process.env.S3_PUBLIC_URL).hostname });
  } catch {
    // ignore malformed URL — surfaced by the storage driver at upload time
  }
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Static (no nonces) so pages stay statically
 * renderable/ISR-cacheable. Third-party origins are limited to the optional
 * analytics providers, OpenStreetMap embeds and video hosts.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src https://www.openstreetmap.org https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the project root: a stray lockfile in a parent folder (e.g. the home
  // directory) would otherwise make Next.js treat that folder as the workspace.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // Large CSV/JSON inventory uploads go through server actions.
    serverActions: { bodySizeLimit: "15mb" },
    optimizePackageImports: ["lucide-react", "radix-ui", "motion"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/placeholder/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/inventory/browse", destination: "/inventory", permanent: true },
      { source: "/inventory/browse/:path*", destination: "/inventory/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
