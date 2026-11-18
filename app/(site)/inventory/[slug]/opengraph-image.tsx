import { ImageResponse } from "next/og";
import { cachedVehicleBySlug } from "@/lib/inventory/cached";
import { formatMileage, formatPrice, vehicleTitle } from "@/lib/format";
import { vehiclePlaceholderSvg } from "@/lib/placeholder";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vehicle for sale";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await cachedVehicleBySlug(slug.toLowerCase());
  const title = v ? vehicleTitle(v) : "Vehicle for sale";
  // Prefer the listing's own photo; fall back to generated artwork.
  const photo = v?.images.find((src) => /^https:\/\/.+\.(png|jpe?g|webp)(\?|$)/i.test(src));
  const art = photo
    ? photo
    : v
      ? `data:image/svg+xml;base64,${Buffer.from(vehiclePlaceholderSvg({ body: v.bodyStyle, color: "#c9441f", variant: 1 })).toString("base64")}`
      : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b1f3a", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, width: 560 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Prestige Auto Group</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
            {v && (
              <div style={{ marginTop: 18, fontSize: 30, color: "#cbd5e1" }}>
                {formatMileage(v.mileage)} · {v.location.city}, {v.location.state}
              </div>
            )}
          </div>
          {v ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ fontSize: 64, fontWeight: 800 }}>{formatPrice(v.displayPrice)}</div>
              <div style={{ fontSize: 28, color: "#fda48a" }}>Est. {formatPrice(v.displayMonthlyPayment)}/mo*</div>
            </div>
          ) : (
            <div />
          )}
        </div>
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} width={640} height={427} style={{ marginTop: 100, objectFit: "cover" }} alt="" />
        )}
      </div>
    ),
    size,
  );
}
