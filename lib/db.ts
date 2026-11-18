/**
 * Prisma client singleton (Prisma 7 + node-postgres driver adapter).
 *
 * In development Next.js hot-reloads modules, so we cache the client on
 * globalThis to avoid exhausting database connections.
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
    // Fail fast instead of hanging builds/requests when the DB is unreachable.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
