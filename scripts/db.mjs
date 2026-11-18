#!/usr/bin/env node
/**
 * Local PostgreSQL for development — no Docker or system install required.
 *
 *   npm run db          # start Postgres in the foreground (Ctrl+C to stop)
 *
 * Uses the `embedded-postgres` package (real PostgreSQL binaries shipped via
 * npm). Data persists in ./.data/postgres (git-ignored). Connection settings
 * come from LOCAL_PG_* env vars and default to the values in .env.example.
 *
 * Prefer Docker? `docker compose up -d db` uses the same port/credentials.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import EmbeddedPostgres from "embedded-postgres";

loadEnv({ quiet: true });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseDir = path.join(root, ".data", "postgres");
const port = Number(process.env.LOCAL_PG_PORT ?? 5433);
const user = process.env.LOCAL_PG_USER ?? "postgres";
const password = process.env.LOCAL_PG_PASSWORD ?? "postgres";
const database = process.env.LOCAL_PG_DATABASE ?? "dealership";

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  persistent: true,
  onLog: (message) => {
    if (process.env.LOCAL_PG_VERBOSE) console.log(String(message).trim());
  },
  onError: (error) => console.error("[postgres]", error),
});

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log("\n[db] stopping PostgreSQL…");
  try {
    await pg.stop();
  } catch (error) {
    console.error("[db] stop failed:", error);
  }
  process.exit(code);
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));

try {
  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
    console.log(`[db] initialising new cluster in ${path.relative(root, databaseDir)}`);
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(database);
    console.log(`[db] created database "${database}"`);
  } catch {
    // Database already exists — nothing to do.
  }
  console.log(`[db] PostgreSQL ready → postgresql://${user}:***@localhost:${port}/${database}`);
  console.log("[db] press Ctrl+C to stop");
} catch (error) {
  console.error("[db] failed to start PostgreSQL:", error);
  await shutdown(1);
}

// Keep the process alive while Postgres runs as a child process.
setInterval(() => {}, 1 << 30);
