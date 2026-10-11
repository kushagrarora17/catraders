/**
 * Applies pending Drizzle migrations from ./drizzle to DATABASE_URL.
 *
 * Used locally (`bun run db:migrate`), by CI, and by the deploy workflow, so all three run
 * the same code. Migrations are forward-only; write them so the previous release keeps working
 * (it serves traffic until the new image is deployed).
 *
 * MIGRATE_CONNECT_TIMEOUT_SECONDS: keep retrying the first connection for this long (default 0).
 * The deploy workflow opens a temporary Postgres firewall rule for the runner just before running
 * this, and Azure can take a while to enforce it.
 */
import { readFileSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

const MIGRATIONS_FOLDER = "drizzle";
const RETRY_DELAY_MS = 5_000;
// Errors that retrying can't fix: bad password, unknown database.
const PERMANENT_ERROR_CODES = new Set(["28P01", "3D000"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function waitForDatabase(pool: Pool, timeoutSeconds: number) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  for (;;) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if ((code && PERMANENT_ERROR_CODES.has(code)) || Date.now() >= deadline) throw error;
      console.log(`Database not reachable yet (${message(error)}); retrying in ${RETRY_DELAY_MS / 1000}s`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

/** How many migrations the database has recorded; 0 before the first run. */
async function appliedCount(pool: Pool) {
  try {
    const { rows } = await pool.query<{ count: number }>("select count(*)::int as count from drizzle.__drizzle_migrations");
    return rows[0].count;
  } catch (error) {
    // 42P01 = table missing, 3F000 = schema missing: nothing has been applied yet.
    const code = (error as { code?: string }).code;
    if (code === "42P01" || code === "3F000") return 0;
    throw error;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    await waitForDatabase(pool, Number(process.env.MIGRATE_CONNECT_TIMEOUT_SECONDS ?? 0));

    const total = (JSON.parse(readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8")) as { entries: unknown[] }).entries.length;
    const pending = Math.max(total - (await appliedCount(pool)), 0);
    console.log(pending ? `Applying ${pending} pending migration(s)…` : "No pending migrations.");

    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    if (pending) console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${message(error)}`);
  process.exit(1);
});
