import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { type Doc, FakeSanity } from "./fake-sanity";

// The tools reach Sanity through getWriteClient() and expire Next's cache after writes; swap both.
let sanity = new FakeSanity();
let revalidations = 0;
mock.module("@/sanity/write-client", () => ({ getWriteClient: () => sanity }));
mock.module("../revalidate", () => ({
  revalidateCatalog: () => void revalidations++,
  revalidateReviews: () => void revalidations++,
  revalidateServiceArea: () => void revalidations++,
}));

const { registerCatalogReadTools } = await import("./catalog-read");
const { registerCatalogWriteTools } = await import("./catalog-write");
const { registerImportTool } = await import("./import");
const { registerReviewTools } = await import("./reviews");
const { registerServiceAreaTools } = await import("./service-area");
const { registerTaxonomyWriteTools } = await import("./taxonomy-write");

type Handler = (args: unknown) => Promise<CallToolResult>;
const tools = new Map<string, { schema: { parse: (v: unknown) => unknown }; handler: Handler }>();
const registry = {
  registerTool: (name: string, config: { inputSchema: { parse: (v: unknown) => unknown } }, handler: Handler) =>
    void tools.set(name, { schema: config.inputSchema, handler }),
};
for (const register of [
  registerCatalogReadTools,
  registerCatalogWriteTools,
  registerTaxonomyWriteTools,
  registerImportTool,
  registerReviewTools,
  registerServiceAreaTools,
]) {
  register(registry as never);
}

/** Calls a tool the way the SDK does: validate (applying defaults), then run the handler. */
async function call(name: string, args: Record<string, unknown> = {}) {
  const tool = tools.get(name);
  if (!tool) throw new Error(`no tool ${name}`);
  const result = await tool.handler(tool.schema.parse(args));
  const text = (result.content[0] as { text: string }).text;
  return { isError: !!result.isError, text, json: result.isError ? undefined : JSON.parse(text) };
}

const slug = (current: string) => ({ _type: "slug", current });
const ref = (id: string) => ({ _type: "reference", _ref: id });

const fixtures = (): Doc[] => [
  { _id: "cat1", _type: "category", vertical: "automotive", title: "Engine Oils", slug: slug("engine-oils"), level: 1 },
  { _id: "cat2", _type: "category", vertical: "automotive", title: "PCMO", slug: slug("pcmo"), level: 2, parent: ref("cat1") },
  { _id: "cat3", _type: "category", vertical: "automotive", title: "Fully Synthetic", slug: slug("pcmo-fully-synthetic"), level: 3, parent: ref("cat2") },
  { _id: "attr-visc", _type: "attribute", vertical: "automotive", title: "Viscosity Grade", slug: slug("viscosity"), allowMultiple: false },
  { _id: "attr-spec", _type: "attribute", vertical: "automotive", title: "Specification", slug: slug("specification"), allowMultiple: true },
  { _id: "v-5w30", _type: "attributeValue", attribute: ref("attr-visc"), label: "5W-30", slug: slug("5w-30") },
  { _id: "v-0w20", _type: "attributeValue", attribute: ref("attr-visc"), label: "0W-20", slug: slug("0w-20") },
  { _id: "v-sp", _type: "attributeValue", attribute: ref("attr-spec"), label: "API SP", slug: slug("api-sp") },
  { _id: "v-sn", _type: "attributeValue", attribute: ref("attr-spec"), label: "API SN", slug: slug("api-sn") },
  {
    _id: "prod-1",
    _type: "product",
    vertical: "automotive",
    title: "Mobil 1 5W-30",
    slug: slug("mobil-1-5w-30"),
    sku: "M1-530",
    inStock: true,
    category: ref("cat3"),
    attributeValues: [
      { ...ref("v-5w30"), _key: "k1" },
      { ...ref("v-sp"), _key: "k2" },
    ],
  },
  { _id: "prod-2", _type: "product", vertical: "automotive", title: "Castrol Edge", slug: slug("castrol-edge"), sku: "CE-1", inStock: false, category: ref("cat3"), attributeValues: [] },
  { _id: "rev-1", _type: "testimonial", vertical: "automotive", quote: "Great", name: "Sam K.", rating: 5 },
];

beforeEach(() => {
  sanity = new FakeSanity(fixtures());
  revalidations = 0;
});

describe("create_product", () => {
  test("publishes a complete document and expires the catalog cache", async () => {
    const { json } = await call("create_product", {
      title: "Shell Helix 0W-20",
      sku: "SH-020",
      category: "pcmo-fully-synthetic",
      attributes: { viscosity: ["0w-20"], specification: ["API SP", "API SN"] },
      description: "Para one.\n\nPara two.",
    });
    expect(json.slug).toBe("shell-helix-0w-20");

    const doc = sanity.docs.get(json.id)!;
    expect(doc).toMatchObject({
      _type: "product",
      vertical: "automotive",
      title: "Shell Helix 0W-20",
      sku: "SH-020",
      inStock: true,
      slug: { _type: "slug", current: "shell-helix-0w-20" },
      category: { _type: "reference", _ref: "cat3" },
    });
    expect(doc.attributeValues.map((v: Doc) => v._ref).sort()).toEqual(["v-0w20", "v-sn", "v-sp"]);
    expect(doc.attributeValues.every((v: Doc) => typeof v._key === "string" && v._key.length > 0)).toBe(true);
    expect(doc.description).toHaveLength(2);
    expect(revalidations).toBe(1);
  });

  test("de-duplicates the slug against existing products", async () => {
    const { json } = await call("create_product", { title: "Castrol Edge", category: "pcmo-fully-synthetic" });
    expect(json.slug).toBe("castrol-edge-2");
  });

  test("rejects a duplicate SKU, naming the product that has it", async () => {
    const { isError, text } = await call("create_product", { title: "Other", sku: "M1-530", category: "pcmo-fully-synthetic" });
    expect(isError).toBe(true);
    expect(text).toMatch(/SKU "M1-530" is already used by "Mobil 1 5W-30"/);
    expect(sanity.byType("product")).toHaveLength(2);
  });

  test("explains unknown categories and attribute values without writing anything", async () => {
    const category = await call("create_product", { title: "X", category: "nope" });
    expect(category.text).toMatch(/Unknown category "nope". Level-3 categories: pcmo-fully-synthetic/);

    const value = await call("create_product", { title: "X", category: "pcmo-fully-synthetic", attributes: { viscosity: ["10W-40"] } });
    expect(value.text).toMatch(/Unknown value "10W-40".*5W-30, 0W-20.*upsert_attribute_value/);

    const clash = await call("create_product", { title: "X", category: "pcmo-fully-synthetic", attributes: { viscosity: ["5W-30", "0W-20"] } });
    expect(clash.text).toMatch(/Only one value allowed for: Viscosity Grade/);
    expect(sanity.byType("product")).toHaveLength(2);
  });
});

describe("update_product", () => {
  test("replaces only the attributes named and leaves the rest", async () => {
    await call("update_product", { key: "M1-530", attributes: { viscosity: ["0W-20"] } });
    const values = sanity.docs.get("prod-1")!.attributeValues.map((v: Doc) => v._ref).sort();
    expect(values).toEqual(["v-0w20", "v-sp"]);
  });

  test("an empty list removes that attribute", async () => {
    await call("update_product", { key: "mobil-1-5w-30", attributes: { specification: [] } });
    expect(sanity.docs.get("prod-1")!.attributeValues.map((v: Doc) => v._ref)).toEqual(["v-5w30"]);
  });

  test("changes only the fields passed and keeps the URL slug", async () => {
    await call("update_product", { key: "prod-1", title: "Mobil 1 Renamed", inStock: false });
    expect(sanity.docs.get("prod-1")).toMatchObject({ title: "Mobil 1 Renamed", inStock: false, sku: "M1-530", slug: { current: "mobil-1-5w-30" } });
  });

  test("an empty sku removes it; a taken sku is refused", async () => {
    await call("update_product", { key: "prod-1", sku: "" });
    expect(sanity.docs.get("prod-1")).not.toHaveProperty("sku");
    const clash = await call("update_product", { key: "prod-1", sku: "CE-1" });
    expect(clash.text).toMatch(/already used by "Castrol Edge"/);
  });

  test("errors when nothing is passed or the product doesn't exist", async () => {
    expect((await call("update_product", { key: "prod-1" })).text).toMatch(/Nothing to update/);
    expect((await call("update_product", { key: "ghost", title: "x" })).text).toMatch(/No product found/);
  });
});

describe("set_stock", () => {
  test("updates only products that need it, in one commit, and reports the rest", async () => {
    const { json } = await call("set_stock", { inStock: false, skus: ["M1-530", "CE-1", "MISSING"], ids: ["prod-1"] });
    expect(json.updated.map((p: { sku: string }) => p.sku)).toEqual(["M1-530"]);
    expect(json.alreadyInThatState).toEqual(["CE-1"]);
    expect(json.notFound).toEqual(["MISSING"]);
    expect(sanity.docs.get("prod-1")!.inStock).toBe(false);
    expect(sanity.commits).toEqual([["patch prod-1"]]);
    expect(revalidations).toBe(1);
  });

  test("does nothing (and doesn't touch the cache) when everything already matches", async () => {
    const { json } = await call("set_stock", { inStock: true, skus: ["M1-530"] });
    expect(json.updated).toEqual([]);
    expect(sanity.commits).toEqual([]);
    expect(revalidations).toBe(0);
  });

  test("requires at least one sku or id", async () => {
    expect((await call("set_stock", { inStock: true })).text).toMatch(/at least one SKU or product id/);
  });
});

describe("set_visibility", () => {
  test("hiding moves the product to a draft and showing brings it back", async () => {
    const hidden = await call("set_visibility", { type: "product", key: "M1-530", visible: false });
    expect(hidden.json).toEqual({ id: "prod-1", visible: false, changed: true });
    expect(sanity.docs.has("prod-1")).toBe(false);
    expect(sanity.docs.get("drafts.prod-1")).toMatchObject({ _type: "product", title: "Mobil 1 5W-30", sku: "M1-530" });
    expect(sanity.commits.at(-1)).toEqual(["createOrReplace drafts.prod-1", "delete prod-1"]);

    // Hidden products are still findable by SKU, and a second hide is a no-op.
    expect((await call("set_visibility", { type: "product", key: "M1-530", visible: false })).json.changed).toBe(false);

    const shown = await call("set_visibility", { type: "product", key: "M1-530", visible: true });
    expect(shown.json).toEqual({ id: "prod-1", visible: true, changed: true });
    expect(sanity.docs.has("drafts.prod-1")).toBe(false);
    expect(sanity.docs.get("prod-1")).toMatchObject({ title: "Mobil 1 5W-30" });
    expect(sanity.docs.get("prod-1")).not.toHaveProperty("_rev");
  });

  test("works for reviews and refuses ids of the wrong type", async () => {
    expect((await call("set_visibility", { type: "review", key: "rev-1", visible: false })).json.changed).toBe(true);
    expect(sanity.docs.has("drafts.rev-1")).toBe(true);
    expect((await call("set_visibility", { type: "review", key: "prod-1", visible: false })).text).toMatch(/No automotive review/);
  });

  test("stock can still be changed while a product is hidden", async () => {
    await call("set_visibility", { type: "product", key: "prod-1", visible: false });
    await call("set_stock", { inStock: false, skus: ["M1-530"] });
    expect(sanity.docs.get("drafts.prod-1")!.inStock).toBe(false);
  });
});

describe("taxonomy tools", () => {
  test("upsert_category enforces the level/parent rules", async () => {
    expect((await call("upsert_category", { title: "New L2", level: 2 })).text).toMatch(/need a parent/);
    expect((await call("upsert_category", { title: "New L3", level: 3, parent: "engine-oils" })).text).toMatch(/needs an L2 parent/);
    expect((await call("upsert_category", { title: "Top", level: 1, parent: "engine-oils" })).text).toMatch(/cannot have a parent/);
    expect((await call("upsert_category", { title: "PCMO", level: 3, parent: "pcmo" })).text).toMatch(/level of an existing category can't change/);
  });

  test("upsert_category creates under a parent, then updates by slug", async () => {
    const created = await call("upsert_category", { title: "Semi Synthetic", level: 3, parent: "pcmo", sortOrder: 2 });
    expect(created.json).toMatchObject({ slug: "semi-synthetic", created: true });
    expect(sanity.docs.get(created.json.id)).toMatchObject({
      vertical: "automotive",
      level: 3,
      parent: { _ref: "cat2" },
      sortOrder: 2,
      slug: { current: "semi-synthetic" },
    });
    const again = await call("upsert_category", { title: "Semi-Synthetic Oils", slug: "semi-synthetic", level: 3, parent: "pcmo" });
    expect(again.json).toMatchObject({ created: false, id: created.json.id });
    expect(sanity.docs.get(created.json.id)!.title).toBe("Semi-Synthetic Oils");
  });

  test("upsert_attribute refuses reserved slugs and applies defaults for new attributes", async () => {
    expect((await call("upsert_attribute", { title: "Sort" })).text).toMatch(/"sort" is reserved/);
    const created = await call("upsert_attribute", { title: "Pack Size" });
    expect(sanity.docs.get(created.json.id)).toMatchObject({ slug: { current: "pack-size" }, filterable: true, allowMultiple: false });
  });

  test("upsert_attribute_value adds a value that products can then use", async () => {
    expect((await call("upsert_attribute_value", { attribute: "nope", label: "x" })).text).toMatch(/Unknown attribute "nope"/);
    const created = await call("upsert_attribute_value", { attribute: "viscosity", label: "10W-40" });
    expect(sanity.docs.get(created.json.id)).toMatchObject({ label: "10W-40", slug: { current: "10w-40" }, attribute: { _ref: "attr-visc" } });

    const product = await call("create_product", { title: "Ten Forty", category: "pcmo-fully-synthetic", attributes: { viscosity: ["10W-40"] } });
    expect(sanity.docs.get(product.json.id)!.attributeValues[0]._ref).toBe(created.json.id);
  });
});

describe("get_taxonomy", () => {
  test("returns a nested category tree and attribute value labels", async () => {
    const { json } = await call("get_taxonomy");
    expect(json.categories).toEqual([
      {
        slug: "engine-oils",
        title: "Engine Oils",
        level: 1,
        children: [
          { slug: "pcmo", title: "PCMO", level: 2, children: [{ slug: "pcmo-fully-synthetic", title: "Fully Synthetic", level: 3, children: [] }] },
        ],
      },
    ]);
    expect(json.attributes.find((a: { slug: string }) => a.slug === "viscosity")).toMatchObject({
      allowMultiple: false,
      values: ["5W-30", "0W-20"],
    });
  });
});

describe("upsert_review", () => {
  test("creates with defaults, edits by id, and refuses non-reviews", async () => {
    expect((await call("upsert_review", { quote: "Only quote" })).text).toMatch(/at least a quote and a name/);
    const created = await call("upsert_review", { quote: "Fast delivery", name: "Pat L." });
    expect(sanity.docs.get(created.json.id)).toMatchObject({ _type: "testimonial", vertical: "automotive", rating: 5, name: "Pat L." });

    await call("upsert_review", { id: created.json.id, rating: 4 });
    expect(sanity.docs.get(created.json.id)).toMatchObject({ rating: 4, quote: "Fast delivery" });

    expect((await call("upsert_review", { id: "prod-1", rating: 1 })).text).toMatch(/No review/);
    expect((await call("upsert_review", { id: "rev-1" })).text).toMatch(/Nothing to update/);
  });
});

describe("service area tools", () => {
  test("creates the singleton only with every field, then patches what is passed", async () => {
    expect((await call("get_service_area")).text).toMatch(/No service area is set/);
    expect((await call("update_service_area", { region: "Ontario" })).text).toMatch(/pass region, description and cities/);
    expect(sanity.docs.has("serviceArea")).toBe(false);

    const created = await call("update_service_area", { region: "Ontario", description: "We deliver.", cities: ["Windsor", "London"] });
    expect(created.json).toEqual({ created: true, updated: ["region", "description", "cities"] });
    expect(sanity.docs.get("serviceArea")).toMatchObject({ _type: "serviceArea", vertical: "automotive", cities: ["Windsor", "London"] });

    await call("update_service_area", { cities: ["Windsor", "London", "Sarnia"] });
    expect((await call("get_service_area")).json).toEqual({
      region: "Ontario",
      description: "We deliver.",
      cities: ["Windsor", "London", "Sarnia"],
    });
    expect(revalidations).toBe(2);
  });

  test("rejects empty updates and repeated cities without writing", async () => {
    expect((await call("update_service_area")).text).toMatch(/Nothing to update/);
    expect((await call("update_service_area", { region: "Ontario", description: "x", cities: ["Windsor", "windsor "] })).text).toMatch(
      /repeated: windsor/,
    );
    expect(sanity.commits).toHaveLength(0);
  });
});

describe("import_products_csv", () => {
  const csv = [
    "sku,title,category,in_stock,attr:viscosity,attr:specification",
    "M1-530,,,no,,",
    "NEW-1,Valvoline 10W-40,pcmo-fully-synthetic,yes,10W-40,API SP|API SN",
    "BAD-1,No Category,,,,",
  ].join("\n");

  test("a dry run reports the plan and writes nothing", async () => {
    const { json } = await call("import_products_csv", { csv, createMissingValues: true });
    expect(json.dryRun).toBe(true);
    expect(json.summary).toEqual({ create: 1, update: 1, unchanged: 0, error: 1 });
    expect(json.newAttributeValues).toEqual([{ attribute: "viscosity", label: "10W-40" }]);
    expect(json.rows.find((r: { sku: string }) => r.sku === "BAD-1").errors).toContain("category is required for new products");
    expect(sanity.commits).toEqual([]);
    expect(revalidations).toBe(0);
  });

  test("applying creates new values and products and updates existing ones in a single transaction", async () => {
    const { json } = await call("import_products_csv", { csv, dryRun: false, createMissingValues: true });
    expect(json.documentsWritten).toBe(3);
    expect(sanity.commits).toHaveLength(1);

    expect(sanity.docs.get("prod-1")!.inStock).toBe(false);

    const created = sanity.byType("product").find((p) => p.sku === "NEW-1")!;
    expect(created).toMatchObject({ vertical: "automotive", title: "Valvoline 10W-40", slug: { current: "valvoline-10w-40" }, inStock: true });
    const newValue = sanity.byType("attributeValue").find((v) => v.label === "10W-40")!;
    expect(newValue).toMatchObject({ attribute: { _ref: "attr-visc" }, slug: { current: "10w-40" } });
    expect(created.attributeValues.map((v: Doc) => v._ref).sort()).toEqual([newValue._id, "v-sn", "v-sp"].sort());
    expect(sanity.byType("product").some((p) => p.sku === "BAD-1")).toBe(false);
    expect(revalidations).toBe(1);
  });

  test("without createMissingValues an unknown value fails only that row", async () => {
    const { json } = await call("import_products_csv", { csv, dryRun: false });
    expect(json.summary).toEqual({ create: 0, update: 1, unchanged: 0, error: 2 });
    expect(sanity.byType("attributeValue")).toHaveLength(4);
    expect(sanity.docs.get("prod-1")!.inStock).toBe(false);
  });

  test("rejects files without a sku column, or with too many rows", async () => {
    expect((await call("import_products_csv", { csv: "title\nx" })).text).toMatch(/'sku' column/);
    const big = ["sku", ...Array.from({ length: 501 }, (_, i) => `S${i}`)].join("\n");
    expect((await call("import_products_csv", { csv: big })).text).toMatch(/501 rows; the limit is 500/);
    expect((await call("import_products_csv", { csv: 'sku\n"unterminated' })).text).toMatch(/unterminated/);
  });
});
