import { test as base, expect } from "@playwright/test";
import MCR from "monocart-coverage-reports";
import { coverageOptions } from "./coverage";
import { SITE_URL } from "./env";
import { resetContent } from "./helpers";

// 1×1 transparent PNG served for /_next/image so product images don't depend on the Sanity CDN.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * Every worker starts from the seed content (the app's data cache may hold content changed by an
 * earlier run), and every test collects Chromium JS coverage.
 */
export const test = base.extend<{ autoCoverage: void }, { seedContent: void }>({
  seedContent: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: SITE_URL });
      await resetContent(request);
      await request.dispose();
      await use();
    },
    { scope: "worker", auto: true },
  ],
  autoCoverage: [
    async ({ page }, use) => {
      await page.route("**/_next/image?**", (route) => route.fulfill({ contentType: "image/png", body: PIXEL }));
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();
      const coverage = await page.coverage.stopJSCoverage();
      // Tests that only use `request` never load a page.
      if (coverage.length) await MCR(coverageOptions).add(coverage);
    },
    { auto: true },
  ],
});

export { expect };
