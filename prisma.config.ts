// Prisma 7 configuration. The CLI no longer auto-loads .env, so load it here.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read lazily (not via env()) so `prisma generate` works without a database,
    // e.g. in CI type-check jobs. Migrate/seed commands still require it.
    url: process.env.DATABASE_URL ?? "",
  },
});
