import { describe, expect, test } from "bun:test";
import { catalogPageHref, MAX_ATTRIBUTE_GROUPS, parseCatalogFilters, parseCatalogPage, toAttributeFilter, toBaseParams } from "./filters";

describe("catalog pagination", () => {
  test("accepts positive integer pages and uses the first repeated value", () => {
    expect(parseCatalogPage({ page: "2" })).toBe(2);
    expect(parseCatalogPage({ page: ["3", "4"] })).toBe(3);
  });

  test("defaults missing, invalid and unsafe offsets to page one", () => {
    for (const page of [undefined, "", "0", "-1", "1.5", "abc", "1e3", "9007199254740991"]) {
      expect(parseCatalogPage({ page })).toBe(1);
    }
  });

  test("pagination links preserve search, stock, category and repeated attributes", () => {
    const filters = parseCatalogFilters({ q: "oil & fluid", category: "synthetic", available: "1", viscosity: ["5w-30", "0w-20"] });
    const url = new URL(catalogPageHref(filters, 2), "https://example.com");
    expect(url.searchParams.get("q")).toBe("oil & fluid");
    expect(url.searchParams.get("category")).toBe("synthetic");
    expect(url.searchParams.get("available")).toBe("1");
    expect(url.searchParams.getAll("viscosity")).toEqual(["5w-30", "0w-20"]);
    expect(url.searchParams.get("page")).toBe("2");
    expect(catalogPageHref(filters, 1)).not.toContain("page=");
    expect(catalogPageHref(parseCatalogFilters({}), 1)).toBe("/products");
  });
});

describe("parseCatalogFilters", () => {
  test("parses search, category, availability and attribute groups", () => {
    const filters = parseCatalogFilters({
      q: "  synthetic ",
      category: "engine-oils",
      available: "1",
      viscosity: ["5w-30", "0w-20", "5w-30"],
      "pack-size": "4-l",
    });
    expect(filters).toEqual({
      q: "synthetic",
      category: "engine-oils",
      available: true,
      attributes: { viscosity: ["5w-30", "0w-20"], "pack-size": ["4-l"] },
    });
  });

  test("ignores reserved keys and values that are not slugs", () => {
    const filters = parseCatalogFilters({
      page: "2",
      sort: "price",
      viscosity: ['5w-30"] || true || ["', "5W-30"],
      "bad key": "x",
      category: "../etc",
    });
    expect(filters.attributes).toEqual({});
    expect(filters.category).toBeNull();
  });

  test("caps the number of attribute groups", () => {
    const params = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`attr-${i}`, "x"]));
    expect(Object.keys(parseCatalogFilters(params).attributes)).toHaveLength(MAX_ATTRIBUTE_GROUPS);
  });
});

describe("GROQ params", () => {
  test("base params use null for absent filters and prefix-match search", () => {
    expect(toBaseParams(parseCatalogFilters({}))).toEqual({ q: null, category: null, available: false });
    expect(toBaseParams(parseCatalogFilters({ q: "5w" })).q).toBe("5w*");
  });

  test("attribute filter interpolates only parameter names", () => {
    const { clause, params } = toAttributeFilter(
      parseCatalogFilters({ viscosity: ["5w-30", "0w-20"], "pack-size": "4-l" }),
    );
    expect(clause).toContain("$attrKey0");
    expect(clause).toContain("$attrValues1");
    expect(clause).not.toContain("5w-30");
    expect(clause.match(/references\(/g)).toHaveLength(2);
    expect(params).toEqual({
      attrKey0: "viscosity",
      attrValues0: ["5w-30", "0w-20"],
      attrKey1: "pack-size",
      attrValues1: ["4-l"],
    });
  });
});
