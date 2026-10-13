import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, appEnv, MOCK_CERT_DIR, MOCK_PORT, MOCK_TLS_PORT } from "./e2e/env";
import { RAW_BUILD_DIR, RAW_SERVER_DIR } from "./e2e/coverage";

// The app is built and started with V8 coverage enabled (build-time prerendering included), against
// a mock Sanity API (e2e/sanity-mock) and the Postgres in DATABASE_URL. `bun run test:e2e` runs the
// specs and then writes the coverage report (e2e/coverage-report.ts).
const nextBin = "node node_modules/next/dist/bin/next";
const flush = `NODE_OPTIONS="--import ${process.cwd()}/e2e/flush-coverage.mjs"`;
const skipBuild = process.env.E2E_SKIP_BUILD === "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  // Specs share one mock dataset and database, and some of them change content.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun e2e/sanity-mock/server.ts",
      url: `http://127.0.0.1:${MOCK_PORT}/__health`,
      env: { MOCK_PORT: String(MOCK_PORT), MOCK_TLS_PORT: String(MOCK_TLS_PORT), MOCK_CERT_DIR },
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
    },
    {
      command: [
        ...(skipBuild ? [] : [`${flush} NODE_V8_COVERAGE=${RAW_BUILD_DIR} ${nextBin} build`]),
        `${flush} NODE_V8_COVERAGE=${RAW_SERVER_DIR} ${nextBin} start -p ${APP_PORT}`,
      ].join(" && "),
      url: `http://localhost:${APP_PORT}/api/health`,
      env: appEnv,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      // SIGTERM lets Next exit cleanly, which is when Node writes the server's V8 coverage.
      gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
      stdout: "pipe",
    },
  ],
});
