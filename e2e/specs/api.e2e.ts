import { randomUUID } from "node:crypto";
import { MOCK_URL, SITE_URL, WEBHOOK_SECRET } from "../env";
import { postRaw, resetContent, sendWebhook } from "../helpers";
import { expect, test } from "../test";

test("internal revalidation requires authentication and a known cache tag", async ({ request }) => {
  const path = "/api/internal/revalidate";
  const unauthorized = await request.post(path, { data: { tag: "automotive-products" } });
  expect(unauthorized.status()).toBe(401);
  const headers = { "x-revalidate-token": WEBHOOK_SECRET, "content-type": "application/json" };
  const invalid = await postRaw(request, path, "{", headers);
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toEqual({ message: "Invalid JSON" });
  for (const tag of [null, 42, "unknown-tag"]) {
    const response = await request.post(path, { headers, data: { tag } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ message: "Unknown tag" });
  }
  const valid = await request.post(path, { headers, data: { tag: "automotive-products" } });
  expect(valid.status()).toBe(200);
  expect(await valid.json()).toEqual({ revalidated: true, tag: "automotive-products" });
});

const customer = {
  name: "Jordan Lee",
  email: "kush-claude@agentmail.to",
  phone: "519-555-0101",
  city: "Windsor",
  company: "Lee Auto Repair",
};
const castrolItem = { productId: "prod-castrol-edge-5w30-4l", title: "Castrol EDGE", sku: "CAS-EDGE-5W30-4L", quantity: 2 };
const inquiry = {
  "cf-turnstile-response": "e2e-inquiry",
  name: "Jordan Lee",
  business: "Lee Auto Repair",
  city: "Windsor",
  email: "kush-claude@agentmail.to",
  phone: "519-555-0101",
  category: "Engine Oils",
  message: "Monthly order",
};

test("health check", async ({ request }) => {
  expect(await (await request.get("/api/health")).json()).toEqual({ status: "ok" });
});

test.describe("GET /api/availability", () => {
  test("reports stock for known, out-of-stock and unknown ids", async ({ request }) => {
    const res = await request.get("/api/availability?ids=prod-castrol-edge-5w30-4l,prod-valvoline-10w40-4l,nope,nope");
    expect(await res.json()).toEqual({
      products: [
        { id: "prod-castrol-edge-5w30-4l", exists: true, inStock: true },
        { id: "prod-valvoline-10w40-4l", exists: true, inStock: false },
        { id: "nope", exists: false, inStock: false },
      ],
    });
  });

  test("handles empty and invalid input", async ({ request }) => {
    expect(await (await request.get("/api/availability")).json()).toEqual({ products: [] });
    expect((await request.get("/api/availability?ids=bad%20id")).status()).toBe(400);
  });
});

test.describe("POST /api/quotes", () => {
  test("rejects missing and invalid verification", async ({ request }) => {
    for (const token of [undefined, "invalid-token"]) {
      const response = await request.post("/api/quotes", {
        data: { customer, items: [castrolItem], "cf-turnstile-response": token },
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toMatchObject({ error: "VERIFICATION_FAILED" });
    }
  });
  test("stores a quote once per idempotency key and emails it", async ({ request }) => {
    const key = randomUUID();
    const body = { "cf-turnstile-response": "e2e-quote", customer, items: [castrolItem], notes: "Deliver Monday" };
    const first = await request.post("/api/quotes", { headers: { "Idempotency-Key": key }, data: body });
    expect(first.status()).toBe(201);
    const { referenceNumber } = await first.json();
    expect(referenceNumber).toMatch(/^RFQ-\d{4}-\d{5}$/);

    const again = await request.post("/api/quotes", { headers: { "Idempotency-Key": key }, data: body });
    expect(again.status()).toBe(200);
    expect((await again.json()).referenceNumber).toBe(referenceNumber);

    // Customer confirmation and internal notification go out through the email API.
    await expect
      .poll(async () => JSON.stringify(await (await request.get(`${MOCK_URL}/__emails`)).json()))
      .toContain(referenceNumber);
  });

  test("rejects bad requests", async ({ request }) => {
    const post = (body: string) => postRaw(request, "/api/quotes", body);

    expect((await post("x".repeat(100_001))).status()).toBe(413);
    expect(await (await post("{")).json()).toMatchObject({ error: "INVALID_JSON" });

    const invalid = await post(JSON.stringify({ customer: { ...customer, email: "nope" }, items: [] }));
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).issues).toEqual(
      expect.arrayContaining([{ path: "customer.email", message: "Enter a valid email address" }]),
    );

    const unknown = await post(JSON.stringify({ "cf-turnstile-response": "e2e-quote", customer, items: [{ ...castrolItem, productId: "missing" }] }));
    expect(unknown.status()).toBe(400);
    expect(await unknown.json()).toMatchObject({ error: "UNKNOWN_PRODUCTS", productIds: ["missing"] });

    const sold = await post(
      JSON.stringify({ "cf-turnstile-response": "e2e-quote", customer, items: [{ ...castrolItem, productId: "prod-valvoline-10w40-4l" }] }),
    );
    expect(sold.status()).toBe(201);
    expect((await sold.json()).referenceNumber).toMatch(/^RFQ-\d{4}-\d{5}$/);
  });
});

test.describe("POST /api/inquiries", () => {
  test("rejects missing and invalid verification", async ({ request }) => {
    for (const token of [undefined, "invalid-token"]) {
      const response = await request.post("/api/inquiries", {
        data: { ...inquiry, "cf-turnstile-response": token },
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toMatchObject({ error: "VERIFICATION_FAILED" });
    }
  });
  test("stores an inquiry once per idempotency key", async ({ request }) => {
    const key = randomUUID();
    const first = await request.post("/api/inquiries", { headers: { "Idempotency-Key": key }, data: inquiry });
    expect(first.status()).toBe(201);
    const { referenceNumber } = await first.json();
    expect(referenceNumber).toMatch(/^INQ-\d{4}-\d{5}$/);

    const again = await request.post("/api/inquiries", { headers: { "Idempotency-Key": key }, data: inquiry });
    expect(again.status()).toBe(200);
    expect((await again.json()).referenceNumber).toBe(referenceNumber);
  });

  test("pretends to accept honeypot submissions", async ({ request }) => {
    const res = await request.post("/api/inquiries", { data: { ...inquiry, website: "http://spam.example" } });
    expect(res.status()).toBe(201);
    expect((await res.json()).referenceNumber).toMatch(/^INQ-/);
  });

  test("rejects bad requests", async ({ request }) => {
    const post = (body: string) => postRaw(request, "/api/inquiries", body);
    expect((await post("x".repeat(20_001))).status()).toBe(413);
    expect(await (await post("not json")).json()).toMatchObject({ error: "INVALID_JSON" });
    const invalid = await post(JSON.stringify({ ...inquiry, phone: "abc", category: "Toys" }));
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).issues.map((i: { path: string }) => i.path)).toEqual(["phone", "category"]);
  });
});

test.describe("POST /api/webhooks/sanity", () => {
  test.afterAll(async ({ request }) => resetContent(request));

  test("rejects unsigned and malformed calls", async ({ request }) => {
    const unsigned = await request.post("/api/webhooks/sanity", { data: { _type: "product" } });
    expect(unsigned.status()).toBe(401);
    expect((await sendWebhook(request, "not json")).status()).toBe(400);
    expect(await (await sendWebhook(request, JSON.stringify({ _type: "post" }))).json()).toEqual({ revalidated: false });
  });

  test("expires cached catalog pages", async ({ page, request }) => {
    await page.goto("/products/castrol-edge-5w30-4l");
    await expect(page.getByText("In stock")).toBeVisible();

    // Mark it out of stock directly in the CMS: the cached page is served until the webhook fires.
    await request.post(`${MOCK_URL}/v2026-09-01/data/mutate/production`, {
      data: { mutations: [{ patch: { id: "prod-castrol-edge-5w30-4l", set: { inStock: false } } }] },
    });
    const res = await sendWebhook(request, JSON.stringify({ _type: "product", _id: "prod-castrol-edge-5w30-4l" }));
    expect(await res.json()).toEqual({ revalidated: true, tag: "automotive-products" });

    await page.reload();
    await expect(page.getByText("Out of stock")).toBeVisible();
  });
});

test.describe("service area webhook", () => {
  test("expires the cached service area section", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("#service-area").getByText("Windsor, ON")).toBeVisible();
    await expect(page.locator("#service-area").getByText("Sarnia, ON")).toHaveCount(0);

    await request.post(`${MOCK_URL}/v2026-09-01/data/mutate/production`, {
      data: { mutations: [{ patch: { id: "serviceArea", set: { cities: ["Windsor", "London", "Kitchener", "Sarnia"] } } }] },
    });
    const res = await sendWebhook(request, JSON.stringify({ _type: "serviceArea" }));
    expect(await res.json()).toEqual({ revalidated: true, tag: "automotive-service-area" });

    await page.reload();
    await expect(page.locator("#service-area").getByText("Sarnia, ON")).toBeVisible();
    await resetContent(request);
  });
});

test.describe("SEO and metadata routes", () => {
  test("robots.txt and sitemap.xml", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`${SITE_URL}/products/castrol-edge-5w30-4l`);
    expect(sitemap).not.toContain("stroller");
  });

  test("icons and Open Graph image", async ({ request }) => {
    for (const path of ["/opengraph-image", "/apple-icon"]) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
    }
    expect((await request.get("/icon.svg")).status()).toBe(200);
    expect((await request.get("/favicon.ico")).status()).toBe(200);
  });
});
