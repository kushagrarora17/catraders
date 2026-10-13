import { rmSync } from "node:fs";
import { Pool } from "pg";
import { COVERAGE_DIR } from "./coverage";
import { appEnv } from "./env";

// Runs after the web servers have started, so only the browser coverage cache and the previous
// report are cleared here; the raw V8 directories are cleared by `bun run test:e2e` beforehand.
export default async function globalSetup() {
  rmSync(COVERAGE_DIR, { recursive: true, force: true });

  // Without a database every quote, inquiry and OAuth test fails with an unexplained 500.
  const pool = new Pool({ connectionString: appEnv.DATABASE_URL, connectionTimeoutMillis: 5_000 });
  try {
    await pool.query("select 1 from quote_requests limit 1");
  } catch (error) {
    throw new Error(
      `e2e needs a migrated Postgres at ${appEnv.DATABASE_URL} (set E2E_DATABASE_URL to change it). ` +
        `Locally: bun run db:up && DATABASE_URL=${appEnv.DATABASE_URL} bun run db:migrate. Cause: ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    await pool.end();
  }
}
