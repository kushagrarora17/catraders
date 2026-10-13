import type { APIRequestContext } from "@playwright/test";
import { SITE_URL } from "../env";
import { callTool, getTokens, mcpRpc, mockDoc, resetContent } from "../helpers";
import { expect, test } from "../test";

// One token for the whole file; every test starts from the seed content.
let token = "";
test.beforeAll(async ({ request }) => {
  token = (await getTokens(request)).accessToken;
});
test.beforeEach(async ({ request }) => resetContent(request));
test.afterAll(async ({ request }) => resetContent(request));

const tool = (request: APIRequestContext, name: string, args: Record<string, unknown> = {}) =>
  callTool(request, token, name, args);

test.describe("endpoint", () => {
  test("requires a valid bearer token and an allowed origin", async ({ request }) => {
    const rpc = { jsonrpc: "2.0", id: 1, method: "tools/list" };
    const headers = { accept: "application/json, text/event-stream" };

    const anonymous = await request.post("/api/mcp", { headers, data: rpc });
    expect(anonymous.status()).toBe(401);
    expect(anonymous.headers()["www-authenticate"]).toContain("resource_metadata");

    const forged = await request.post("/api/mcp", { headers: { ...headers, authorization: "Bearer not.a.jwt" }, data: rpc });
    expect(forged.status()).toBe(401);

    const crossSite = await request.post("/api/mcp", {
      headers: { ...headers, authorization: `Bearer ${token}`, origin: "https://evil.example" },
      data: rpc,
    });
    expect(crossSite.status()).toBe(403);
  });

  test("lists the management tools", async ({ request }) => {
    const { result } = await mcpRpc(request, token, "tools/list");
    const names = (result!.tools as { name: string }[]).map((t) => t.name).sort();
    expect(names).toEqual([
      "create_product",
      "get_product",
      "get_request",
      "get_service_area",
      "get_taxonomy",
      "import_products_csv",
      "list_requests",
      "list_reviews",
      "search_products",
      "set_stock",
      "set_visibility",
      "update_product",
      "update_request_status",
      "update_service_area",
      "upsert_attribute",
      "upsert_attribute_value",
      "upsert_category",
      "upsert_review",
    ]);
  });
});

test.describe("catalog reads", () => {
  test("search_products filters visible and hidden products", async ({ request }) => {
    const all = await tool(request, "search_products");
    expect(all.json.total).toBe(4);
    expect(all.json.items[0]).toMatchObject({
      id: "prod-castrol-edge-5w30-4l",
      category: "Engine Oil › Passenger Car › Synthetic",
      attributes: ["5W-30", "4 L", "API SP", "ACEA C3"],
    });

    const filtered = await tool(request, "search_products", { query: "mob", category: "engine-oil", inStock: true, limit: 1 });
    expect(filtered.json.items.map((p: { sku: string }) => p.sku)).toEqual(["MOB-1-0W20-1L"]);

    const bySku = await tool(request, "search_products", { skus: ["VAL-10W40-4L"], inStock: false });
    expect(bySku.json.total).toBe(1);

    const hidden = await tool(request, "search_products", { visibility: "hidden" });
    expect(hidden.json.items).toEqual([expect.objectContaining({ id: "prod-liqui-moly-5w30-1l", sku: "LM-5W30-1L" })]);
  });

  test("get_product resolves ids, slugs and SKUs", async ({ request }) => {
    const bySku = await tool(request, "get_product", { key: "CAS-EDGE-5W30-4L" });
    expect(bySku.json).toMatchObject({
      id: "prod-castrol-edge-5w30-4l",
      visible: true,
      url: `${SITE_URL}/products/castrol-edge-5w30-4l`,
      category: { slug: "synthetic", level: 3 },
      description: "Full synthetic engine oil for modern petrol engines.\n\nSold by the case.",
    });
    expect(bySku.json.attributes).toContainEqual({ attribute: "viscosity", value: "5W-30" });

    const hidden = await tool(request, "get_product", { key: "liqui-moly-5w30-1l" });
    expect(hidden.json).toMatchObject({ visible: false, url: null });

    const missing = await tool(request, "get_product", { key: "nope" });
    expect(missing).toMatchObject({ isError: true, text: expect.stringContaining("No product found") });
  });

  test("get_taxonomy returns the category tree and attributes", async ({ request }) => {
    const { json } = await tool(request, "get_taxonomy");
    expect(json.categories.map((c: { slug: string }) => c.slug)).toEqual(["engine-oil", "coolants"]);
    expect(json.categories[0].children[0].children.map((c: { slug: string }) => c.slug)).toEqual(["synthetic", "conventional"]);
    expect(json.attributes).toContainEqual(
      expect.objectContaining({ slug: "specification", allowMultiple: true, values: ["ACEA C3", "API SP"] }),
    );
  });
});

test.describe("catalog writes", () => {
  test("create_product validates input and publishes", async ({ request, page }) => {
    const base = { title: "Shell Helix 5W-30 4L", category: "synthetic" };
    expect((await tool(request, "create_product", { ...base, category: "nope" })).text).toContain('Unknown category "nope"');
    expect((await tool(request, "create_product", { ...base, category: "Engine" })).isError).toBe(true);
    expect((await tool(request, "create_product", { ...base, attributes: { viscosity: ["9W-99"], colourz: ["x"] } })).text).toMatch(
      /Unknown value "9W-99"[\s\S]*Unknown attribute "colourz"/,
    );
    expect((await tool(request, "create_product", { ...base, attributes: { viscosity: ["5W-30", "0W-20"] } })).text).toContain(
      "Only one value allowed for: Viscosity Grade",
    );
    expect((await tool(request, "create_product", { ...base, sku: "MOB-1-0W20-1L" })).text).toContain("already used by");
    expect((await tool(request, "create_product", { ...base, slug: "castrol-edge-5w30-4l" })).text).toContain("already taken");
    expect((await tool(request, "create_product", { ...base, slug: "!!!" })).text).toContain("no usable characters");
    expect((await tool(request, "create_product", { ...base, imageUrls: ["http://example.com/a.png"] })).isError).toBe(true);

    const created = await tool(request, "create_product", {
      ...base,
      sku: "SHELL-HX-5W30-4L",
      attributes: { viscosity: ["5w-30"], "pack-size": ["4 L"] },
      description: "Synthetic.\n\nGreat value.",
    });
    expect(created.json).toMatchObject({ slug: "shell-helix-5w-30-4l", url: `${SITE_URL}/products/shell-helix-5w-30-4l` });
    expect(created.json.warning).toBeUndefined();

    // Same title again gets the next free slug; a level-2 category gets a warning.
    const second = await tool(request, "create_product", { ...base, category: "Passenger Car", inStock: false });
    expect(second.json).toMatchObject({ slug: "shell-helix-5w-30-4l-2", warning: expect.stringContaining("level 2") });

    // The write expired the storefront cache.
    await page.goto("/products/shell-helix-5w-30-4l");
    await expect(page.getByRole("heading", { name: "Shell Helix 5W-30 4L" })).toBeVisible();
    await expect(page.getByText("Great value.")).toBeVisible();
  });

  test("update_product changes only the given fields", async ({ request }) => {
    const key = "MOB-1-0W20-1L";
    expect((await tool(request, "update_product", { key: "nope", title: "x" })).isError).toBe(true);
    expect((await tool(request, "update_product", { key })).text).toContain("Nothing to update");
    expect((await tool(request, "update_product", { key, category: "nope" })).text).toContain("Unknown category");
    expect((await tool(request, "update_product", { key, attributes: { viscosity: ["1W-1"] } })).isError).toBe(true);
    expect((await tool(request, "update_product", { key, sku: "CAS-EDGE-5W30-4L" })).text).toContain("already used by");
    expect((await tool(request, "update_product", { key, addImageUrls: ["https://127.0.0.1/a.png"] })).isError).toBe(true);

    const updated = await tool(request, "update_product", {
      key,
      title: "Mobil 1 ESP 0W-20 1L",
      sku: "",
      inStock: false,
      category: "conventional",
      attributes: { viscosity: ["5W-30"], specification: [] },
      description: "",
      clearImages: true,
    });
    expect(updated.json.updated).toEqual(
      expect.arrayContaining(["title", "inStock", "category", "attributeValues", "sku (removed)", "description (removed)", "images (removed)"]),
    );

    const doc = await mockDoc(request, "prod-mobil-1-0w20-1l");
    expect(doc).toMatchObject({ title: "Mobil 1 ESP 0W-20 1L", inStock: false, category: { _ref: "cat-conventional" } });
    expect(doc.sku).toBeUndefined();
    // Viscosity replaced, specification cleared, pack size untouched.
    expect(doc.attributeValues.map((v: { _ref: string }) => v._ref).sort()).toEqual(["val-1-l", "val-5w-30"]);

    const hidden = await tool(request, "update_product", { key: "LM-5W30-1L", sku: "LM-5W30-1L-NEW" });
    expect(hidden.json).toMatchObject({ id: "prod-liqui-moly-5w30-1l", visible: false });
  });

  test("set_stock updates in bulk and reports what didn't match", async ({ request }) => {
    expect((await tool(request, "set_stock", { inStock: false })).isError).toBe(true);

    const result = await tool(request, "set_stock", {
      inStock: false,
      skus: ["CAS-EDGE-5W30-4L", "VAL-10W40-4L", "MISSING"],
      ids: ["prod-prestone-coolant-4l", "prod-missing"],
    });
    expect(result.json).toMatchObject({
      updated: [
        expect.objectContaining({ sku: "CAS-EDGE-5W30-4L" }),
        expect.objectContaining({ id: "prod-prestone-coolant-4l" }),
      ],
      alreadyInThatState: ["VAL-10W40-4L"],
      notFound: ["MISSING", "prod-missing"],
    });
    expect((await mockDoc(request, "prod-castrol-edge-5w30-4l")).inStock).toBe(false);
  });

  test("set_visibility hides and republishes products and reviews", async ({ request, page }) => {
    const product = { type: "product", key: "prestone-coolant-4l" };
    expect((await tool(request, "set_visibility", { ...product, visible: true })).json).toMatchObject({ changed: false });
    expect((await tool(request, "set_visibility", { ...product, visible: false })).json).toMatchObject({ changed: true });
    expect((await tool(request, "set_visibility", { ...product, visible: false })).json).toMatchObject({ changed: false });
    expect(await mockDoc(request, "drafts.prod-prestone-coolant-4l")).toMatchObject({ title: "Prestone Coolant 50/50 4L" });
    expect((await page.goto("/products/prestone-coolant-4l"))?.status()).toBe(404);

    expect((await tool(request, "set_visibility", { ...product, visible: true })).json).toMatchObject({ changed: true });
    expect(await mockDoc(request, "prod-prestone-coolant-4l")).toMatchObject({ inStock: true });

    expect((await tool(request, "set_visibility", { type: "review", key: "drafts.review-hidden", visible: true })).json).toMatchObject({
      id: "review-hidden",
      changed: true,
    });
    await page.goto("/");
    await expect(page.getByText("Hidden review.")).toBeVisible();

    expect((await tool(request, "set_visibility", { type: "review", key: "review-maria", visible: false })).json.changed).toBe(true);
    expect((await tool(request, "set_visibility", { type: "review", key: "cat-synthetic", visible: true })).isError).toBe(true);
    expect((await tool(request, "set_visibility", { type: "product", key: "nope", visible: true })).isError).toBe(true);
  });
});

test.describe("taxonomy writes", () => {
  test("upsert_category creates, updates and validates placement", async ({ request }) => {
    expect((await tool(request, "upsert_category", { title: "Gear Oil", level: 2 })).text).toContain("need a parent");
    expect((await tool(request, "upsert_category", { title: "Gear Oil", level: 2, parent: "nope" })).text).toContain(
      "Unknown parent",
    );
    expect((await tool(request, "upsert_category", { title: "???", level: 1 })).text).toContain("no usable characters");
    expect((await tool(request, "upsert_category", { title: "Synthetic", level: 2, parent: "engine-oil" })).text).toContain(
      "can't change",
    );

    const top = await tool(request, "upsert_category", { title: "Transmission", level: 1, sortOrder: 3 });
    expect(top.json).toMatchObject({ slug: "transmission", created: true });
    const child = await tool(request, "upsert_category", { title: "ATF", level: 2, parent: "transmission" });
    expect(child.json).toMatchObject({ slug: "atf", created: true });

    const renamed = await tool(request, "upsert_category", {
      title: "Synthetic Blends",
      slug: "synthetic",
      level: 3,
      parent: "passenger-car",
      sortOrder: 5,
    });
    expect(renamed.json).toMatchObject({ id: "cat-synthetic", created: false });
    expect(await mockDoc(request, "cat-synthetic")).toMatchObject({ title: "Synthetic Blends", sortOrder: 5 });
  });

  test("upsert_attribute and upsert_attribute_value", async ({ request }) => {
    expect((await tool(request, "upsert_attribute", { title: "Category" })).text).toContain("reserved");
    expect((await tool(request, "upsert_attribute", { title: "!!" })).text).toContain("can't be empty");

    const created = await tool(request, "upsert_attribute", { title: "Base Oil", sortOrder: 9 });
    expect(created.json).toMatchObject({ slug: "base-oil", created: true });
    const updated = await tool(request, "upsert_attribute", {
      title: "Viscosity",
      slug: "viscosity",
      filterable: false,
      allowMultiple: true,
      sortOrder: 0,
    });
    expect(updated.json).toMatchObject({ id: "attr-viscosity", created: false });

    expect((await tool(request, "upsert_attribute_value", { attribute: "nope", label: "x" })).text).toContain("Unknown attribute");
    expect((await tool(request, "upsert_attribute_value", { attribute: "base-oil", label: "%%" })).text).toContain(
      "no usable characters",
    );
    const value = await tool(request, "upsert_attribute_value", { attribute: "base-oil", label: "Group III", sortOrder: 1 });
    expect(value.json).toMatchObject({ slug: "group-iii", created: true });
    const relabel = await tool(request, "upsert_attribute_value", { attribute: "viscosity", label: "5W30", slug: "5w-30", sortOrder: 2 });
    expect(relabel.json).toMatchObject({ id: "val-5w-30", created: false });
  });
});

test.describe("import_products_csv", () => {
  const header = "sku,title,category,in_stock,description,image_url,attr:viscosity,attr:pack-size,notes";

  test("rejects unusable files", async ({ request }) => {
    const run = async (csv: string) => (await tool(request, "import_products_csv", { csv })).text;
    expect(await run('sku,title\n"unterminated')).toContain("unterminated");
    expect(await run("title\nOil")).toContain("'sku' column");
    expect(await run("sku,title\n")).toContain("no data rows");
    expect(await run(`sku\n${Array.from({ length: 501 }, (_, i) => `S${i}`).join("\n")}`)).toContain("limit is 500");
  });

  test("dry run reports per-row changes and errors without writing", async ({ request }) => {
    const csv = [
      header,
      "NEW-1,Amsoil Signature 5W-30 1L,synthetic,yes,Premium.,,5W-30,1 L,ignored",
      "CAS-EDGE-5W30-4L,,,no,,,,,",
      "MOB-1-0W20-1L,,,,,,,,",
      ",Missing SKU,synthetic,yes,,,,,",
      "NEW-1,Duplicate,synthetic,yes,,,,,",
      "NEW-2,Bad Stock,synthetic,maybe,,,,,",
      "NEW-3,Bad Category,nowhere,yes,,,,,",
      "NEW-4,,,yes,,,,,",
      "NEW-5,Bad Image,synthetic,yes,,http://example.com/x.png,,,",
      "NEW-6,Unknown Value,synthetic,yes,,,7W-77,,",
    ].join("\n");
    const { json } = await tool(request, "import_products_csv", { csv });

    expect(json).toMatchObject({ dryRun: true, summary: { create: 1, update: 1, unchanged: 1, error: 7 }, ignoredColumns: ["notes"] });
    const errors = Object.fromEntries(
      json.rows.filter((r: { errors?: string[] }) => r.errors).map((r: { line: number; errors: string[] }) => [r.line, r.errors.join("; ")]),
    );
    expect(Object.values(errors).join("\n")).toMatch(
      /sku is required[\s\S]*Duplicate SKU[\s\S]*isn't yes\/no[\s\S]*Unknown category[\s\S]*title is required[\s\S]*https link[\s\S]*Unknown value "7W-77"/,
    );
    expect(await mockDoc(request, "prod-castrol-edge-5w30-4l")).toMatchObject({ inStock: true });
  });

  test("applies creates and updates, creating missing values on request", async ({ request, page }) => {
    const csv = [
      header,
      "NEW-1,Amsoil Signature 5W-30 1L,synthetic,yes,Premium.,,5W-30,1 L,",
      "NEW-7,Amsoil 0W-16 1L,Synthetic,true,,,0W-16,1 L,",
      'CAS-EDGE-5W30-4L,"Castrol EDGE 5W-30, 4L",,no,,,,4 L,',
      "VAL-10W40-4L,,,,,https://127.0.0.1/blocked.png,,,",
    ].join("\n");
    const { json } = await tool(request, "import_products_csv", { csv, dryRun: false, createMissingValues: true });

    expect(json).toMatchObject({
      dryRun: false,
      documentsWritten: 4,
      newAttributeValues: [{ attribute: "viscosity", label: "0W-16" }],
      summary: { create: 2, update: 1, error: 1 },
    });
    expect(json.rows.find((r: { sku: string }) => r.sku === "VAL-10W40-4L").errors[0]).toContain("publicly reachable");
    expect(await mockDoc(request, "prod-castrol-edge-5w30-4l")).toMatchObject({ title: "Castrol EDGE 5W-30, 4L", inStock: false });

    await page.goto("/products?viscosity=0w-16");
    await expect(page.getByText("Amsoil 0W-16 1L")).toBeVisible();
  });
});

test.describe("reviews", () => {
  test("list_reviews and upsert_review", async ({ request, page }) => {
    const visible = await tool(request, "list_reviews");
    expect(visible.json.map((r: { id: string }) => r.id)).toEqual(["review-ranjit", "review-maria"]);
    expect((await tool(request, "list_reviews", { visibility: "hidden" })).json).toEqual([
      expect.objectContaining({ id: "review-hidden", name: "Hidden H." }),
    ]);

    expect((await tool(request, "upsert_review", { name: "No Quote" })).isError).toBe(true);
    const created = await tool(request, "upsert_review", { quote: "Fast delivery.", name: "Sam P.", city: "Windsor" });
    expect(created.json).toMatchObject({ created: true });

    expect((await tool(request, "upsert_review", { id: "review-ranjit" })).text).toContain("Nothing to update");
    expect((await tool(request, "upsert_review", { id: "cat-synthetic", rating: 1 })).isError).toBe(true);
    expect((await tool(request, "upsert_review", { id: "review-ranjit", rating: 4, sortOrder: 9 })).json).toMatchObject({
      visible: true,
    });
    expect((await tool(request, "upsert_review", { id: "drafts.review-hidden", quote: "Still hidden." })).json).toMatchObject({
      id: "review-hidden",
      visible: false,
    });

    await page.goto("/");
    await expect(page.getByText("Fast delivery.")).toBeVisible();
  });
});

test.describe("service area", () => {
  test("get_service_area and update_service_area", async ({ request, page }) => {
    expect((await tool(request, "get_service_area")).json).toEqual({
      region: "Southwestern Ontario",
      description: "We deliver wholesale lubricants and fluids along the Windsor–Kitchener corridor.",
      cities: ["Windsor", "London", "Kitchener"],
    });

    expect((await tool(request, "update_service_area")).text).toContain("Nothing to update");
    expect((await tool(request, "update_service_area", { cities: ["Sarnia", "sarnia"] })).isError).toBe(true);
    expect((await tool(request, "update_service_area", { cities: ["Windsor", "London", "Sarnia"] })).json).toEqual({
      created: false,
      updated: ["cities"],
    });
    expect(await mockDoc(request, "serviceArea")).toMatchObject({ region: "Southwestern Ontario", cities: ["Windsor", "London", "Sarnia"] });

    await page.goto("/");
    await expect(page.locator("#service-area").getByText("Sarnia, ON")).toBeVisible();
  });
});

test.describe("quote requests and inquiries", () => {
  test("list, read and update request status", async ({ request }) => {
    const quote = await request.post("/api/quotes", {
      data: {
        customer: { name: "Pat", email: "kush-claude@agentmail.to", phone: "519-555-0199", city: "Windsor", company: "Pat's Garage" },
        items: [{ productId: "prod-castrol-edge-5w30-4l", title: "Castrol", quantity: 1 }],
      },
    });
    const rfq = (await quote.json()).referenceNumber as string;
    const inquiry = await request.post("/api/inquiries", {
      data: { name: "Pat", business: "Pat's Garage", city: "Windsor", email: "kush-claude@agentmail.to", phone: "519-555-0199", category: "" },
    });
    const inq = (await inquiry.json()).referenceNumber as string;

    const quotes = await tool(request, "list_requests", { kind: "quote", status: "pending", since: "2020-01-01", limit: 100 });
    expect(quotes.json).toContainEqual(expect.objectContaining({ reference: rfq, itemCount: 1 }));
    const inquiries = await tool(request, "list_requests", { kind: "inquiry" });
    expect(inquiries.json[0]).toMatchObject({ reference: inq });
    expect((await tool(request, "list_requests", { kind: "quote", since: "yesterday-ish" })).isError).toBe(true);

    const detail = await tool(request, "get_request", { reference: rfq.toLowerCase() });
    expect(detail.json).toMatchObject({ referenceNumber: rfq, items: [expect.objectContaining({ sku: "CAS-EDGE-5W30-4L" })] });
    expect((await tool(request, "get_request", { reference: inq })).json).toMatchObject({ businessName: "Pat's Garage" });
    expect((await tool(request, "get_request", { reference: "RFQ-1999-00001" })).text).toContain("No quote request");
    expect((await tool(request, "get_request", { reference: "INQ-1999-00001" })).text).toContain("No inquiry");
    expect((await tool(request, "get_request", { reference: "nope" })).isError).toBe(true);

    for (const reference of [rfq, inq]) {
      expect((await tool(request, "update_request_status", { reference, status: "quoted" })).json).toMatchObject({
        previousStatus: "pending",
        changed: true,
      });
      expect((await tool(request, "update_request_status", { reference, status: "quoted" })).json.changed).toBe(false);
    }
    expect((await tool(request, "update_request_status", { reference: "RFQ-1999-00001", status: "closed" })).isError).toBe(true);
    expect((await tool(request, "update_request_status", { reference: "INQ-1999-00001", status: "closed" })).isError).toBe(true);
  });
});
