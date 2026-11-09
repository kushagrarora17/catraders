import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { Pool } from "pg";
import { COVERAGE_DIR, RAW_BUILD_DIR } from "./coverage";
import { appEnv } from "./env";
import { nextArgs, nextEnv } from "./app-server";

// Runs after the mock server starts; build once, then fixtures own the app processes.
// Raw V8 directories are cleared by `bun run test:e2e` beforehand.
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

  if (process.env.E2E_SKIP_BUILD !== "1") {
    execFileSync("node", [...nextArgs, "build"], {
      env: { ...nextEnv, NODE_V8_COVERAGE: RAW_BUILD_DIR },
      stdio: "inherit",
      timeout: 300_000,
    });
  }
}
