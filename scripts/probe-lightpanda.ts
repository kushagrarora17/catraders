import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, type Browser, type BrowserContext } from "@playwright/test";

// Standalone compatibility probe, deliberately outside the E2E suite and its coverage gate.
const binary = process.argv[2];
if (!binary) throw new Error("Usage: bun --no-env-file scripts/probe-lightpanda.ts /path/to/lightpanda-x86_64-linux");
const digest = createHash("sha256").update(await readFile(binary)).digest("hex");
if (digest !== "53eb34da09159dcf8f04865dbfe3e63e9a652062684495aa7ced5ddd7c82e8b0") {
  throw new Error("Expected the pinned Lightpanda 1.0.3 Linux x86_64 artifact");
}
if ((await import("@playwright/test/package.json")).version !== "1.64.1") {
  throw new Error("Expected Playwright 1.64.1");
}

const results: { check: string; pass: boolean; detail?: unknown }[] = [];
async function check(name: string, run: () => Promise<unknown>) {
  try {
    results.push({ check: name, pass: true, detail: await run() });
  } catch (error) {
    results.push({ check: name, pass: false, detail: String(error) });
  }
}
function requireValue(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP address");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const html = `<!doctype html><title>Lightpanda probe</title>
<label>Name<input id="name"></label><button id="action">Save</button><output id="result"></output>
<a href="/next">Next</a><div id="challenge"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
<script src="/client.js"></script>`;
const handler = (request: Request) => {
  const path = new URL(request.url).pathname;
  if (path === "/client.js") return new Response(`
    function used(value) { return "saved:" + value; }
    function unused() { return "must remain uncovered"; }
    window.hydrated = true;
    document.querySelector('#action').onclick = () => {
      document.querySelector('#result').textContent = used(document.querySelector('#name').value);
    };
    window.turnstile?.render(document.querySelector('#challenge'), {action:'probe', callback(){}});
    //# sourceMappingURL=client.js.map
  `, { headers: { "content-type": "application/javascript" } });
  return new Response(html, { headers: { "content-type": "text/html" } });
};
function stubTurnstile(context: BrowserContext) {
  return context.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({
    contentType: "application/javascript", body: `window.turnstile = {render(container, options) {
      const input = document.createElement('input'); input.type='hidden';
      input.name='cf-turnstile-response'; input.value='e2e-'+options.action;
      container.appendChild(input); options.callback(); return input.name;
    }};`,
  }));
}

const certDir = await mkdtemp(join(tmpdir(), "catraders-86-cert-"));
let browser: Browser | undefined;
let child: ReturnType<typeof Bun.spawn> | undefined;
let http: ReturnType<typeof Bun.serve> | undefined;
let tls: ReturnType<typeof Bun.serve> | undefined;
let endpoint = "";
try {
  const cert = Bun.spawn(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    "-keyout", join(certDir, "key.pem"), "-out", join(certDir, "cert.pem")], { stdout: "ignore", stderr: "ignore" });
  requireValue(await cert.exited === 0, "Could not generate disposable mock TLS certificate");
  http = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: handler });
  tls = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: handler,
    tls: { key: Bun.file(join(certDir, "key.pem")), cert: Bun.file(join(certDir, "cert.pem")) } });
  const port = await freePort();
  endpoint = `http://127.0.0.1:${port}`;
  child = Bun.spawn([binary, "serve", "--host", "127.0.0.1", "--port", String(port)],
    { stdout: "ignore", stderr: "ignore" });
  await expect.poll(async () => {
    if (child!.exitCode !== null) throw new Error(`Lightpanda exited: ${child!.exitCode}`);
    return fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(500) }).then(r => r.ok, () => false);
  }, { timeout: 10_000 }).toBe(true);
  browser = await chromium.connectOverCDP(`ws://127.0.0.1:${port}`, { timeout: 5_000 });
  results.push({ check: "CDP connection and health", pass: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 640 }, ignoreHTTPSErrors: true });
  context.setDefaultTimeout(3_000);
  context.setDefaultNavigationTimeout(5_000);
  const page = await context.newPage();
  await check("Turnstile route fulfillment", async () => {
    await stubTurnstile(context);
    await page.goto(http!.url.href);
    await expect(page.locator('[name="cf-turnstile-response"]')).toHaveValue("e2e-probe");
  });
  await check("client script execution and selector actions", async () => {
    requireValue(await page.evaluate(() => Reflect.get(window, "hydrated")) === true, "Client did not execute");
    await page.getByLabel("Name").fill("probe");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#result")).toHaveText("saved:probe");
  });
  await check("navigation", async () => {
    await page.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(new URL("/next", http!.url).href);
  });
  await check("cookies and storage persistence", async () => {
    await page.evaluate(() => { document.cookie = "probe=yes; path=/"; localStorage.setItem("probe", "yes"); });
    await page.reload();
    requireValue(await page.evaluate(() => document.cookie.includes("probe=yes") && localStorage.getItem("probe") === "yes"), "State not persisted");
  });
  await check("concurrent browser contexts", async () => {
    const isolated = await browser!.newContext();
    try {
      await stubTurnstile(isolated);
      const other = await isolated.newPage();
      await other.goto(http!.url.href, { timeout: 5_000 });
      requireValue(await other.evaluate(() => !document.cookie && localStorage.getItem("probe") === null), "State leaked between contexts");
    } finally { await isolated.close(); }
  });
  await check("self-signed mock TLS with ignoreHTTPSErrors", async () => {
    const response = await page.goto(tls!.url.href);
    requireValue(response?.ok() === true, "TLS response not successful");
  });
  await check("Playwright precise client coverage", async () => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await page.goto(http!.url.href);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const coverage = await page.coverage.stopJSCoverage();
    const client = coverage.find(entry => entry.url.endsWith("/client.js"));
    requireValue(!!client?.source && client.functions.length > 0, "No precise client source/function ranges");
    requireValue(client!.functions.some(fn => fn.functionName === "used" && fn.ranges.some(range => range.count > 0)) &&
      client!.functions.some(fn => fn.functionName === "unused" && fn.ranges.every(range => range.count === 0)),
    "Executed and unexecuted functions were not distinguished");
    return client;
  });
  const session = await context.newCDPSession(page);
  for (const method of ["Profiler.enable", "Profiler.startPreciseCoverage", "Profiler.takePreciseCoverage"] as const) {
    await check(method, () => session.send(method));
  }
  await check("mobile flex drawer geometry", async () => {
    await page.setContent(`<style>
      body{margin:0} #drawer{height:640px;display:flex;flex-direction:column}
      #body{flex:1;min-height:0;overflow:auto} #long{height:2000px}
      button{height:48px;flex-shrink:0}
      </style><div id="drawer"><div id="body"><div id="long">Filters</div></div><button>Apply filters</button></div>`);
    const button = page.getByRole("button", { name: "Apply filters" });
    const box = await button.boundingBox();
    results.push({ check: "mobile geometry observation", pass: true, detail: box });
    expect(box).toEqual({
      x: expect.closeTo(0, 0), y: expect.closeTo(592, 0),
      width: expect.closeTo(390, 0), height: expect.closeTo(48, 0),
    });
    await expect(button).toBeInViewport({ timeout: 1_000 });
    await page.locator("#drawer").evaluate(element => element.style.paddingTop = "800px");
    await expect(button).not.toBeInViewport({ timeout: 1_000 });
  });
  await context.close();
  await check("sequential context isolation", async () => {
    const fresh = await browser!.newContext();
    try {
      await stubTurnstile(fresh);
      const other = await fresh.newPage();
      await other.goto(http!.url.href, { timeout: 5_000 });
      requireValue(await other.evaluate(() => !document.cookie && localStorage.getItem("probe") === null), "State leaked to fresh context");
    } finally { await fresh.close(); }
  });
} finally {
  try { await Promise.race([browser?.close(), Bun.sleep(3_000)]); } catch { /* Still reap the owned process. */ }
  if (child) {
    child.kill("SIGTERM");
    const timer = setTimeout(() => child!.kill("SIGKILL"), 3_000);
    await child.exited;
    clearTimeout(timer);
    await check("owned process cleanup", async () => {
      const reachable = await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(500) }).then(() => true, () => false);
      requireValue(!reachable, "CDP endpoint remained reachable after cleanup");
    });
  }
  http?.stop(true);
  tls?.stop(true);
  await rm(certDir, { recursive: true, force: true });
  console.log(JSON.stringify({ lightpanda: "1.0.3", sha256: digest, playwright: "1.64.1", results }, null, 2));
}
process.exitCode = results.some(result => !result.pass) ? 1 : 0;
