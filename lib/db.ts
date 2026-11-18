/**
 * Prisma client singleton (Prisma 7 + node-postgres driver adapter).
 *
 * The client is created lazily on first use, so importing this module never
 * requires DATABASE_URL — unit tests and builds can import modules that use
 * `prisma` without a database. It is cached on globalThis so Next.js hot reloads
 * in development don't open a new connection pool on every change.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
  }
  const adapter = new PrismaPg({
    connectionString,
    // Serverless-friendly pool size; managed poolers (Neon/Supabase) handle the rest.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // Fail fast in production when the DB is unreachable. The dev server can stall
    // for several seconds while it compiles a route, so allow longer there.
    connectionTimeoutMillis: process.env.NODE_ENV === "production" ? 5_000 : 30_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** The shared client, created on the first call. */
export function getPrisma(): PrismaClient {
  globalForPrisma.__prisma ??= createPrismaClient();
  return globalForPrisma.__prisma;
}

/**
 * Lazy handle to the shared client: `prisma.vehicle`, `prisma.$transaction`, …
 * are forwarded to the real client, which is only created when first accessed.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value: unknown = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
