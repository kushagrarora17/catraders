import { describe, expect, test } from "bun:test";
import { evaluate, parse } from "groq-js";
import { seedDocuments } from "../../../e2e/sanity-mock/fixtures";
import { parseCatalogFilters, toAttributeFilter, toBaseParams } from "./filters";
import { FACETS_QUERY, productCountQueryWithFilters, productListQueryWithFilters } from "./queries";

const seed = seedDocuments();
const product = seed.find((doc) => doc._id === "prod-castrol-edge-5w30-4l")!;
const copies = Array.from({ length: 25 }, (_, index) => ({
  ...product,
  _id: `pagination-${String(index).padStart(2, "0")}`,
  title: "Pagination oil",
}));
const dataset = [...seed, ...copies, { ...copies[0], _id: "other-vertical", vertical: "baby" }];

async function query(text: string, params: Record<string, unknown>) {
  return (await evaluate(parse(text, { params }), { dataset, params })).get();
}

describe("paginated product queries", () => {
  test("slices before projection with deterministic ordering and an unsliced total", async () => {
    const params = toBaseParams(parseCatalogFilters({ q: "pagination" }));
    const first = await query(productListQueryWithFilters("", { start: 0, end: 24 }), params);
    const last = await query(productListQueryWithFilters("", { start: 24, end: 48 }), params);
    expect(first).toHaveLength(24);
    expect(first.map((item: { _id: string }) => item._id)).toEqual(copies.slice(0, 24).map((item) => item._id));
    expect(last.map((item: { _id: string }) => item._id)).toEqual(["pagination-24"]);
    expect(await query(productCountQueryWithFilters(""), params)).toBe(25);
    expect(await query(productListQueryWithFilters("", { start: 48, end: 72 }), params)).toEqual([]);
  });

  test("totals include every selected filter while facets ignore attribute selections", async () => {
    const filters = parseCatalogFilters({ q: "pagination", category: "engine-oil", available: "1", viscosity: ["0w-20", "5w-30"], "pack-size": "4-l" });
    const attr = toAttributeFilter(filters);
    const params = { ...toBaseParams(filters), ...attr.params };
    expect(await query(productCountQueryWithFilters(attr.clause), params)).toBe(25);
    expect(await query(productListQueryWithFilters(attr.clause, { start: 24, end: 48 }), params)).toHaveLength(1);
    const excluded = toAttributeFilter({ ...filters, attributes: { viscosity: ["10w-40"] } });
    expect(await query(productCountQueryWithFilters(excluded.clause), { ...toBaseParams(filters), ...excluded.params })).toBe(0);
    const facets = await query(FACETS_QUERY, toBaseParams(filters));
    expect(facets.find((facet: { key: string }) => facet.key === "pack-size").values[0].count).toBe(25);
  });

  test("rejects non-integer and unsafe slice bounds before query construction", () => {
    for (const range of [{ start: -1, end: 24 }, { start: 0.5, end: 24 }, { start: 24, end: 24 }, { start: 0, end: Infinity }]) {
      expect(() => productListQueryWithFilters("", range)).toThrow(RangeError);
    }
  });
});
