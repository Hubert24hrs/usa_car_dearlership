/**
 * Generated placeholder vehicle artwork (SVG). Used for demo inventory and as
 * a fallback when a listing has no photos. Original artwork — no third-party
 * images. Served by /api/placeholder/vehicle.
 *
 * Each body style is a hand-tuned control polygon (x: 0–100 along the car,
 * y: height above ground) smoothed with a Catmull-Rom spline.
 */
import type { BodyStyle } from "@/lib/generated/prisma/enums";

type Pt = [number, number];
type Shape = {
  outline: Pt[];
  windows: Pt[];
  wheels: [number, number];
  wheelRadius: number;
  /** extra decorative polylines (bed rail, sliding-door track…) */
  lines?: Pt[][];
  headrests?: number[];
  /** [headlight height, taillight height] */
  lights: [number, number];
};

const SHAPES: Record<BodyStyle, Shape> = {
  SEDAN: {
    outline: [[1, 7], [0, 12], [1.5, 16.5], [10, 18.5], [25, 20], [35, 21.5], [45, 30], [52, 31.8], [64, 31.8], [72, 29], [82, 22.5], [94, 21.5], [99, 19.5], [100, 14], [99.5, 8], [96, 6.5], [85, 6], [67, 6], [27, 6], [9, 6], [3, 6.5]],
    windows: [[37, 21.8], [46, 29.2], [52, 30.6], [63, 30.6], [70, 28.3], [79, 22.6]],
    wheels: [19, 79],
    wheelRadius: 7.2,
    lights: [14, 18],
  },
  SUV: {
    outline: [[1, 8.5], [0, 15], [1.5, 21], [16, 23.5], [28, 25], [34, 26], [40, 37], [44, 39], [86, 39], [94, 37.5], [98, 33], [99.5, 26], [100, 16], [99, 9.5], [95, 8.5], [84, 8.5], [30, 8.5], [5, 8.5]],
    windows: [[36, 26.5], [41.5, 36.8], [45, 37.8], [85, 37.8], [92, 36.2], [95.5, 27]],
    wheels: [19, 80],
    wheelRadius: 8.8,
    lights: [18, 28],
  },
  CROSSOVER: {
    outline: [[1, 7.5], [0, 13], [1.5, 19], [16, 21.5], [30, 23.5], [38, 32], [44, 35.5], [78, 35.5], [90, 32], [97, 27], [99.5, 22], [100, 14], [99, 8.5], [95, 7.5], [80, 7.5], [30, 7.5], [5, 7.5]],
    windows: [[33, 24], [40, 32.5], [45, 34.2], [77, 34.2], [87, 31.2], [93.5, 26]],
    wheels: [19, 80],
    wheelRadius: 8,
    lights: [16.5, 24],
  },
  TRUCK: {
    outline: [[1, 9], [0, 16], [1, 24], [14, 26], [25, 27], [31, 28], [37, 39], [40, 40.5], [60, 40.5], [62, 38.5], [62.5, 28.5], [99, 28.5], [100, 26], [100, 14], [99, 9.5], [95, 9], [70, 9], [30, 9], [5, 9]],
    windows: [[33, 28.8], [38, 38.5], [41, 39.3], [59.5, 39.3], [60.5, 37.5], [60.5, 29]],
    wheels: [18, 81],
    wheelRadius: 9,
    lights: [20, 22],
    lines: [[[63, 27.5], [99, 27.5]]],
  },
  COUPE: {
    outline: [[1, 6.5], [0, 10.5], [1.5, 14.5], [12, 16.5], [28, 18.5], [40, 20], [50, 27.5], [57, 28.8], [66, 28.3], [78, 22], [93, 19.5], [99, 17], [100, 12.5], [99, 7.5], [96, 6], [80, 5.5], [20, 5.5], [3, 6]],
    windows: [[42, 20.2], [51, 26.6], [57, 27.7], [65, 27.2], [73, 22.7]],
    wheels: [19, 78],
    wheelRadius: 7,
    lights: [12.5, 15],
  },
  CONVERTIBLE: {
    outline: [[1, 6.5], [0, 10.5], [1.5, 14.5], [12, 16.5], [28, 18.5], [40, 20], [46, 26], [47.5, 26], [50, 20.5], [94, 19.5], [99, 17], [100, 12.5], [99, 7.5], [96, 6], [80, 5.5], [20, 5.5], [3, 6]],
    windows: [[41.5, 20.3], [46.2, 25.2], [47, 25.2], [48.4, 20.6]],
    wheels: [19, 78],
    wheelRadius: 7,
    lights: [12.5, 15.5],
    headrests: [56, 66],
  },
  HATCHBACK: {
    outline: [[1, 7], [0, 12], [1.5, 17], [14, 19.5], [27, 21.5], [36, 30.5], [42, 32.5], [75, 32.5], [86, 30], [95, 24], [99, 19], [100, 13], [99, 8], [95, 7], [80, 6.5], [20, 6.5], [4, 7]],
    windows: [[30, 22], [37, 29.8], [42.5, 31.3], [74, 31.3], [83, 28.8], [90, 24]],
    wheels: [18, 82],
    wheelRadius: 7.2,
    lights: [14.5, 20],
  },
  VAN: {
    outline: [[1, 8], [0, 14], [2, 21], [12, 24], [18, 27], [28, 38], [33, 40.5], [92, 40.5], [97, 38.5], [99.5, 32], [100, 20], [99, 9], [95, 8], [80, 8], [20, 8], [4, 8]],
    windows: [[22, 27.5], [30, 37.5], [34, 39.3], [91, 39.3], [95.5, 37.2], [97.5, 30], [97, 27.5]],
    wheels: [17, 83],
    wheelRadius: 7.8,
    lights: [17, 30],
    lines: [[[52, 26.5], [70, 26.5]]],
  },
  WAGON: {
    outline: [[1, 7], [0, 12], [1.5, 16.5], [10, 18.5], [25, 20], [35, 21.5], [45, 30.5], [52, 32], [88, 31.5], [95, 29], [99, 24], [100, 14], [99.5, 8], [96, 6.5], [85, 6], [27, 6], [9, 6], [3, 6.5]],
    windows: [[37, 22], [46, 29.6], [52, 30.8], [87, 30.4], [93, 28.2], [96.5, 23]],
    wheels: [19, 80],
    wheelRadius: 7.4,
    lights: [14, 22],
  },
};

/** Closed Catmull-Rom spline through points → SVG path data. */
function smoothPath(points: Pt[], map: (p: Pt) => Pt, tension = 0.5): string {
  const pts = points.map(map);
  const n = pts.length;
  const k = tension / 3;
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

function clampHex(hex: string): string {
  const h = hex.replace(/[^0-9a-f]/gi, "").slice(0, 6);
  return h.length === 6 ? `#${h.toLowerCase()}` : "#64748b";
}

function shade(hex: string, amount: number): string {
  const h = clampHex(hex).slice(1);
  const num = Number.parseInt(h, 16);
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((num >> 16) & 255);
  const g = mix((num >> 8) & 255);
  const b = mix(num & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function luminance(hex: string): number {
  const num = Number.parseInt(clampHex(hex).slice(1), 16);
  return (0.299 * ((num >> 16) & 255) + 0.587 * ((num >> 8) & 255) + 0.114 * (num & 255)) / 255;
}

const BACKDROPS = [
  { top: "#ffffff", bottom: "#e6e9ef", floor: "#d5dae3", text: "#64748b" },
  { top: "#0b1f3a", bottom: "#24385a", floor: "#09172b", text: "#94a3b8", glow: "#e4572e" },
  { top: "#dbe7f5", bottom: "#f7f8fa", floor: "#cfd8e3", text: "#64748b" },
  { top: "#0f172a", bottom: "#1e293b", floor: "#0b1120", text: "#94a3b8", spot: true },
] as const;

export type PlaceholderOptions = {
  body: BodyStyle;
  color: string;
  /** 0–3: studio, dusk, daylight, showroom (and mirrored / close-up framing) */
  variant?: number;
  /** degrees, for pseudo 360° spin frames */
  angle?: number;
  label?: string;
};

export function vehiclePlaceholderSvg({ body, color, variant = 0, angle, label }: PlaceholderOptions): string {
  const shape = SHAPES[body] ?? SHAPES.SEDAN;
  const W = 1200;
  const H = 800;
  const v = ((variant % 4) + 4) % 4;
  const backdrop = BACKDROPS[v]!;
  const paint = clampHex(color);
  const isDark = luminance(paint) < 0.25;
  const unit = v === 2 ? 15 : 9; // close-up framing for variant 2
  const groundY = v === 2 ? 720 : 640;

  let scaleX = 1;
  let mirror = v === 1 || v === 3;
  if (angle !== undefined) {
    const rad = (angle * Math.PI) / 180;
    const c = Math.cos(rad);
    scaleX = Math.max(0.28, Math.abs(c));
    mirror = c < 0;
  }

  const carWidth = 100 * unit * scaleX;
  const originX = v === 2 && angle === undefined ? W / 2 - 22 * unit : (W - carWidth) / 2;
  const map = ([x, y]: Pt): Pt => {
    const sx = mirror ? 100 - x : x;
    return [originX + sx * unit * scaleX, groundY - y * unit];
  };

  const outline = smoothPath(shape.outline, map, 0.45);
  const windows = smoothPath(shape.windows, map, 0.3);
  const wheelEls = shape.wheels
    .map((wx) => {
      const [cx, cy] = map([wx, shape.wheelRadius]);
      const r = shape.wheelRadius * unit;
      const rx = r * scaleX;
      const spokes = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 * Math.PI) / 180;
        return `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + Math.cos(a) * rx * 0.55).toFixed(1)}" y2="${(cy + Math.sin(a) * r * 0.55).toFixed(1)}" stroke="${isDark ? "#4b5563" : "#6b7280"}" stroke-width="${(unit * 0.9).toFixed(1)}" stroke-linecap="round"/>`;
      }).join("");
      return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 1.16).toFixed(1)}" ry="${(r * 1.16).toFixed(1)}" fill="#0b0d10"/>
<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${r.toFixed(1)}" fill="#16181c"/>
<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 0.66).toFixed(1)}" ry="${(r * 0.66).toFixed(1)}" fill="${isDark ? "#2b3038" : "#b8bec6"}"/>
${spokes}
<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 0.16).toFixed(1)}" ry="${(r * 0.16).toFixed(1)}" fill="#e5e7eb"/>`;
    })
    .join("");

  const [hx, hy] = map([1.6, shape.lights[0]]);
  const [tx, ty] = map([99.2, shape.lights[1]]);
  const extraLines = (shape.lines ?? [])
    .map((line) => `<polyline points="${line.map((p) => map(p).map((n) => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${shade(paint, -0.35)}" stroke-width="${(unit * 0.4).toFixed(1)}" stroke-linecap="round"/>`)
    .join("");
  const headrests = (shape.headrests ?? [])
    .map((x) => {
      const [cx, cy] = map([x, 22.5]);
      return `<rect x="${(cx - unit * 1.6 * scaleX).toFixed(1)}" y="${(cy - unit * 1.8).toFixed(1)}" width="${(unit * 3.2 * scaleX).toFixed(1)}" height="${(unit * 3.4).toFixed(1)}" rx="${unit.toFixed(1)}" fill="#1f2328"/>`;
    })
    .join("");

  const [shadowCx] = map([50, 0]);
  const glow =
    "glow" in backdrop
      ? `<ellipse cx="${W / 2}" cy="${groundY}" rx="620" ry="120" fill="${backdrop.glow}" opacity="0.18"/>`
      : "";
  const spot = "spot" in backdrop ? `<ellipse cx="${W / 2}" cy="${groundY - 140}" rx="520" ry="330" fill="url(#spot)"/>` : "";
  const caption = label ? escapeXml(label) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${caption || "Vehicle"} placeholder image">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${backdrop.top}"/><stop offset="1" stop-color="${backdrop.bottom}"/></linearGradient>
<linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(paint, 0.28)}"/><stop offset="0.45" stop-color="${paint}"/><stop offset="1" stop-color="${shade(paint, -0.38)}"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3646"/><stop offset="0.55" stop-color="#121820"/><stop offset="1" stop-color="#1d2733"/></linearGradient>
<radialGradient id="spot"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="${backdrop.floor}" opacity="0.55"/>
${glow}${spot}
<ellipse cx="${shadowCx.toFixed(1)}" cy="${groundY + 6}" rx="${(carWidth * 0.52).toFixed(1)}" ry="${(unit * 2.4).toFixed(1)}" fill="#000" opacity="0.28"/>
<path d="${outline}" fill="url(#paint)" stroke="${shade(paint, -0.45)}" stroke-width="2"/>
<path d="${windows}" fill="url(#glass)"/>
${headrests}${extraLines}
<ellipse cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" rx="${(unit * 1.5 * scaleX).toFixed(1)}" ry="${(unit * 0.9).toFixed(1)}" fill="#fff7d6" opacity="0.95"/>
<ellipse cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" rx="${(unit * 1.1 * scaleX).toFixed(1)}" ry="${(unit * 0.8).toFixed(1)}" fill="#c81e1e" opacity="0.9"/>
${wheelEls}
<text x="${W - 28}" y="${H - 26}" text-anchor="end" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" letter-spacing="2" fill="${backdrop.text}" opacity="0.8">PLACEHOLDER IMAGE</text>
${caption ? `<text x="28" y="${H - 26}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="22" font-weight="600" fill="${backdrop.text}" opacity="0.85">${caption}</text>` : ""}
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** URL for a placeholder image (served by app/api/placeholder/vehicle/route.ts). */
export function placeholderUrl(opts: { body: BodyStyle; color: string; variant?: number; angle?: number; label?: string }): string {
  const params = new URLSearchParams({ body: opts.body.toLowerCase(), color: clampHex(opts.color).slice(1) });
  if (opts.variant) params.set("v", String(opts.variant));
  if (opts.angle !== undefined) params.set("angle", String(opts.angle));
  if (opts.label) params.set("label", opts.label.slice(0, 60));
  return `/api/placeholder/vehicle?${params.toString()}`;
}

export function isPlaceholderUrl(src: string): boolean {
  return src.startsWith("/api/placeholder/");
}
