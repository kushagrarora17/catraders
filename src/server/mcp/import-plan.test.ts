import { describe, expect, test } from "bun:test";
import { csvToRecords } from "./csv";
import { canonicalColumn, type ExistingProductDoc, planImport, slugCandidatesForNewRows } from "./import-plan";
import type { ProductRef } from "./products";
import type { Attribute, Category, Taxonomy } from "./taxonomy";

const categories: Category[] = [
  { _id: "cat-l1", title: "Engine Oils", slug: "engine-oils", level: 1, parentId: null, sortOrder: null },
  { _id: "cat-l2", title: "Passenger Car Motor Oil", slug: "pcmo", level: 2, parentId: "cat-l1", sortOrder: null },
  { _id: "cat-l3", title: "Fully Synthetic", slug: "pcmo-fully-synthetic", level: 3, parentId: "cat-l2", sortOrder: null },
];

const attributes: Attribute[] = [
  {
    _id: "attr-visc",
    title: "Viscosity Grade",
    slug: "viscosity",
    filterable: true,
    allowMultiple: false,
    sortOrder: null,
    values: [
      { _id: "v-5w30", label: "5W-30", slug: "5w-30", sortOrder: null },
      { _id: "v-0w20", label: "0W-20", slug: "0w-20", sortOrder: null },
    ],
  },
  {
    _id: "attr-spec",
    title: "Specification",
    slug: "specification",
    filterable: true,
    allowMultiple: true,
    sortOrder: null,
    values: [
      { _id: "v-sp", label: "API SP", slug: "api-sp", sortOrder: null },
      { _id: "v-sn", label: "API SN", slug: "api-sn", sortOrder: null },
    ],
  },
];

const taxonomy: Taxonomy = {
  categories,
  attributes,
  categoryBySlug: new Map(categories.map((c) => [c.slug, c])),
  categoryById: new Map(categories.map((c) => [c._id, c])),
  attributeBySlug: new Map(attributes.map((a) => [a.slug, a])),
  valueById: new Map(attributes.flatMap((a) => a.values.map((value) => [value._id, { value, attribute: a }] as const))),
};

const existingRef: ProductRef = {
  docId: "prod-1",
  baseId: "prod-1",
  hidden: false,
  title: "Mobil 1 5W-30",
  slug: "mobil-1-5w-30",
  sku: "M1-530",
  inStock: true,
};
const existingDoc: ExistingProductDoc = {
  title: "Mobil 1 5W-30",
  inStock: true,
  category: { _ref: "cat-l3" },
  attributeValues: [{ _ref: "v-5w30" }, { _ref: "v-sp" }],
};

function plan(csv: string, options: { createMissingValues?: boolean; takenSlugs?: string[] } = {}) {
  const { headers, records } = csvToRecords(csv);
  return planImport({
    headers,
    records,
    taxonomy,
    existing: new Map([["M1-530", [existingRef]]]),
    existingDocs: new Map([["prod-1", existingDoc]]),
    takenSlugs: options.takenSlugs ?? [],
    createMissingValues: options.createMissingValues ?? false,
  });
}

describe("canonicalColumn", () => {
  test("maps aliases and normalises attribute columns", () => {
    expect(canonicalColumn("in stock")).toBe("in_stock");
    expect(canonicalColumn("images")).toBe("image_url");
    expect(canonicalColumn("attr: viscosity")).toBe("attr:viscosity");
    expect(canonicalColumn("sku")).toBe("sku");
  });
});

describe("planImport — new products", () => {
  test("plans a create with resolved category, attributes and a derived slug", () => {
    const { rows } = plan("sku,title,category,attr:viscosity,attr:specification\nN-1,Castrol Edge 0W-20,Fully Synthetic,0W-20,API SP|API SN\n");
    expect(rows[0].action).toBe("create");
    expect(rows[0].create?.fields).toMatchObject({
      title: "Castrol Edge 0W-20",
      sku: "N-1",
      slug: "castrol-edge-0w-20",
      inStock: true,
      categoryId: "cat-l3",
    });
    expect(rows[0].create?.fields.attributeValueIds.sort()).toEqual(["v-0w20", "v-sn", "v-sp"]);
  });

  test("requires title and category", () => {
    const { rows } = plan("sku,title,category\nN-1,,\n");
    expect(rows[0].action).toBe("error");
    expect(rows[0].errors).toEqual(["title is required for new products", "category is required for new products"]);
  });

  test("de-duplicates slugs against existing products and earlier rows", () => {
    const { rows } = plan("sku,title,category\nA,Same Title,pcmo-fully-synthetic\nB,Same Title,pcmo-fully-synthetic\n", {
      takenSlugs: ["same-title"],
    });
    expect(rows.map((r) => r.create?.fields.slug)).toEqual(["same-title-2", "same-title-3"]);
  });

  test("flags duplicate SKUs within the file", () => {
    const { rows } = plan("sku,title,category\nA,One,pcmo-fully-synthetic\nA,Two,pcmo-fully-synthetic\n");
    expect(rows[0].action).toBe("create");
    expect(rows[1].errors[0]).toMatch(/Duplicate SKU.*line 2/);
  });

  test("rejects a second value for a single-valued attribute", () => {
    const { rows } = plan("sku,title,category,attr:viscosity\nA,One,pcmo-fully-synthetic,5W-30|0W-20\n");
    expect(rows[0].errors).toEqual(["Only one value allowed for: Viscosity Grade"]);
  });
});

describe("planImport — attribute values", () => {
  test("unknown values are errors by default and list what exists", () => {
    const { rows, newValues } = plan("sku,title,category,attr:viscosity\nA,One,pcmo-fully-synthetic,10W-40\n");
    expect(rows[0].action).toBe("error");
    expect(rows[0].errors[0]).toMatch(/Unknown value "10W-40".*5W-30, 0W-20/);
    expect(newValues).toEqual([]);
  });

  test("createMissingValues queues each new value once and shares it between rows", () => {
    const { rows, newValues } = plan(
      "sku,title,category,attr:viscosity\nA,One,pcmo-fully-synthetic,10W-40\nB,Two,pcmo-fully-synthetic,10w-40\n",
      { createMissingValues: true },
    );
    expect(newValues).toHaveLength(1);
    expect(newValues[0]).toMatchObject({ label: "10W-40", slug: "10w-40" });
    expect(rows[0].create?.fields.attributeValueIds).toEqual([newValues[0]._id]);
    expect(rows[1].create?.fields.attributeValueIds).toEqual([newValues[0]._id]);
  });

  test("values queued by a row that later fails are dropped", () => {
    const { rows, newValues } = plan("sku,title,category,attr:viscosity\nA,,pcmo-fully-synthetic,10W-40\n", {
      createMissingValues: true,
    });
    expect(rows[0].action).toBe("error");
    expect(newValues).toEqual([]);
  });

  test("unknown attribute columns are errors, unknown plain columns are reported and ignored", () => {
    const { rows, unknownColumns } = plan("sku,title,category,colour,attr:nope\nA,One,pcmo-fully-synthetic,red,x\n");
    expect(unknownColumns).toEqual(["colour"]);
    expect(rows[0].errors[0]).toMatch(/Unknown attribute "nope"/);
  });
});

describe("planImport — existing products", () => {
  test("reports unchanged when every provided value already matches", () => {
    const { rows } = plan("sku,title,in_stock,category,attr:viscosity\nM1-530,Mobil 1 5W-30,yes,pcmo-fully-synthetic,5W-30\n");
    expect(rows[0].action).toBe("unchanged");
  });

  test("changes only the provided columns", () => {
    const { rows } = plan("sku,in_stock\nM1-530,no\n");
    expect(rows[0].action).toBe("update");
    expect(rows[0].update?.patch).toEqual({ inStock: false });
    expect(rows[0].changes).toEqual(["inStock"]);
  });

  test("an attribute column replaces that attribute's values and keeps the others", () => {
    const { rows } = plan("sku,attr:viscosity\nM1-530,0W-20\n");
    expect(rows[0].update?.patch.attributeValueIds?.sort()).toEqual(["v-0w20", "v-sp"]);
    expect(rows[0].changes).toEqual(["attributes"]);
  });

  test("blank cells leave fields alone", () => {
    const { rows } = plan("sku,title,in_stock,attr:viscosity\nM1-530,,,\n");
    expect(rows[0].action).toBe("unchanged");
  });

  test("rejects invalid stock values and non-https images", () => {
    const { rows } = plan("sku,in_stock,image_url\nM1-530,maybe,http://example.com/a.jpg\n");
    expect(rows[0].errors).toEqual([
      `in_stock "maybe" isn't yes/no or true/false`,
      `image_url "http://example.com/a.jpg" must be an https link`,
    ]);
  });
});

describe("slugCandidatesForNewRows", () => {
  test("only covers rows that will be created", () => {
    const { records } = csvToRecords("sku,title\nM1-530,Existing\nNEW,Brand New Oil\n");
    const candidates = slugCandidatesForNewRows(records, new Set(["M1-530"]));
    expect(candidates).toContain("brand-new-oil");
    expect(candidates).toContain("brand-new-oil-2");
    expect(candidates).not.toContain("existing");
  });
});
