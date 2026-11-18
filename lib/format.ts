/** Display formatting helpers (client-safe). */

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatPrice = (value: number) => usd0.format(value);
export const formatCurrency = (value: number) => usd2.format(value);
export const formatNumber = (value: number) => int.format(value);
export const formatMileage = (miles: number) => (miles < 100 ? `${formatNumber(miles)} mi (new)` : `${formatNumber(miles)} mi`);
export const formatCompactMileage = (miles: number) =>
  miles >= 1000 ? `${(miles / 1000).toFixed(miles >= 10_000 ? 0 : 1)}k mi` : `${miles} mi`;

export function vehicleTitle(v: { year: number; make: string; model: string; trim?: string | null }): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", opts).format(typeof value === "string" ? new Date(value) : value);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length !== 10) return value;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** "09:00" → "9 AM", "17:30" → "5:30 PM" */
export function formatHour(hhmm: string | null): string {
  if (!hhmm) return "Closed";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h! >= 12 ? "PM" : "AM";
  const hour = ((h! + 11) % 12) + 1;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
