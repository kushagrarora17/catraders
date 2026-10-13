import { randomUUID } from "node:crypto";
import { MOCK_URL, SITE_URL } from "../env";
import { postRaw, resetContent, sendWebhook } from "../helpers";
import { expect, test } from "../test";

const customer = {
  name: "Jordan Lee",
  email: "kush-claude@agentmail.to",
  phone: "519-555-0101",
  city: "Windsor",
  company: "Lee Auto Repair",
};
const castrolItem = { productId: "prod-castrol-edge-5w30-4l", title: "Castrol EDGE", sku: "CAS-EDGE-5W30-4L", quantity: 2 };
const inquiry = {
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
  test("stores a quote once per idempotency key and emails it", async ({ request }) => {
    const key = randomUUID();
    const body = { customer, items: [castrolItem], notes: "Deliver Monday" };
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

    const unknown = await post(JSON.stringify({ customer, items: [{ ...castrolItem, productId: "missing" }] }));
    expect(unknown.status()).toBe(400);
    expect(await unknown.json()).toMatchObject({ error: "UNKNOWN_PRODUCTS", productIds: ["missing"] });

    const sold = await post(
      JSON.stringify({ customer, items: [{ ...castrolItem, productId: "prod-valvoline-10w40-4l" }] }),
    );
    expect(sold.status()).toBe(409);
    expect(await sold.json()).toMatchObject({ error: "OUT_OF_STOCK", productIds: ["prod-valvoline-10w40-4l"] });
  });
});

test.describe("POST /api/inquiries", () => {
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
    await expect(page.getByRole("button", { name: "Out of stock — cannot be quoted" })).toBeVisible();
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
