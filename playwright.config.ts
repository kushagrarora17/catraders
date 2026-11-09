import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, MOCK_CERT_DIR, MOCK_PORT, MOCK_TLS_PORT } from "./e2e/env";

// The app is built and started with V8 coverage enabled (build-time prerendering included), against
// a mock Sanity API (e2e/sanity-mock) and the Postgres in DATABASE_URL. `bun run test:e2e` runs the
// specs and then writes the coverage report (e2e/coverage-report.ts).

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
      command: "bun --no-env-file e2e/sanity-mock/server.ts",
      url: `http://127.0.0.1:${MOCK_PORT}/__health`,
      env: { MOCK_PORT: String(MOCK_PORT), MOCK_TLS_PORT: String(MOCK_TLS_PORT), MOCK_CERT_DIR },
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
    },
  ],
});
