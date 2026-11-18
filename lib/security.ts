/**
 * Request security helpers: client IP extraction, privacy-preserving IP
 * hashing, same-origin (CSRF) checks for route handlers and bearer-token
 * verification for machine endpoints.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

type HeaderBag = { get(name: string): string | null };

export function getClientIp(headers: HeaderBag): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "0.0.0.0";
}

/** HMAC the IP so abuse can be correlated without storing personal data. */
export function hashIp(ip: string): string {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

/**
 * CSRF defence for JSON route handlers: browsers always send Origin on
 * cross-site POSTs, so require it to match our host. (Server Actions have
 * equivalent built-in protection.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return Boolean(host) && originHost === host;
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Verify `Authorization: Bearer <secret>` against one of the given env secrets. */
export function hasValidBearer(request: Request, ...secrets: (string | undefined)[]): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  return secrets.some((secret) => Boolean(secret) && secret!.length >= 16 && safeEqual(token, secret!));
}
