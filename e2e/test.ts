import { test as base, expect } from "@playwright/test";
import MCR from "monocart-coverage-reports";
import { coverageOptions } from "./coverage";
import { SITE_URL } from "./env";
import { resetContent } from "./helpers";
import { startApp } from "./app-server";

// 1×1 transparent PNG served for /_next/image so product images don't depend on the Sanity CDN.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/**
 * Every worker starts from the seed content (the app's data cache may hold content changed by an
 * earlier run). Each test gets a fresh app process to isolate in-memory quotas and collects
 * Chromium JS coverage.
 */
export const test = base.extend<{ autoCoverage: void; isolatedApp: void }, { appServer: { restart(): Promise<void> }; seedContent: void }>({
  appServer: [
    async ({}, useApp) => {
      let server: ReturnType<typeof startApp> | undefined;
      async function restart() {
        await server?.stop();
        server = startApp();
        await expect.poll(async () => {
          if (server!.child.exitCode !== null) throw new Error(`E2E app exited: ${server!.child.exitCode}`);
          return fetch(`${SITE_URL}/api/health`).then((response) => response.ok, () => false);
        }, { timeout: 30_000 }).toBe(true);
      }
      try {
        await restart();
        await useApp({ restart });
      } finally {
        await server?.stop();
      }
    },
    { scope: "worker" },
  ],
  isolatedApp: [
    async ({ appServer, request }, use) => {
      // Reset process-local quotas between tests/retries, never during a test's submissions.
      await appServer.restart();
      await resetContent(request);
      await use();
    },
    { auto: true },
  ],
  seedContent: [
    async ({ playwright, appServer }, use) => {
      void appServer;
      const request = await playwright.request.newContext({ baseURL: SITE_URL });
      await resetContent(request);
      await request.dispose();
      await use();
    },
    { scope: "worker", auto: true },
  ],
  autoCoverage: [
    async ({ page, isolatedApp }, use) => {
      void isolatedApp;
      await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: `window.turnstile = {
            render(container, options) {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = 'cf-turnstile-response';
              input.value = 'e2e-' + options.action;
              input.id = 'turnstile-' + options.action;
              container.appendChild(input);
              options.callback();
              return input.id;
            },
            remove(id) { document.getElementById(id)?.remove(); }
          };`,
        }),
      );
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
