import { describe, expect, test } from "bun:test";
import {
  checkAttributeSlug,
  checkCategoryPlacement,
  findMultiValueClashes,
  firstFreeSlug,
  slugCandidates,
  slugify,
} from "./validation";

describe("slugify", () => {
  test("matches the slugs the Studio generates for attribute values", () => {
    expect(slugify("5W-30")).toBe("5w-30");
    expect(slugify("4 L")).toBe("4-l");
    expect(slugify("API SP")).toBe("api-sp");
  });

  test("strips accents and punctuation, and trims hyphens", () => {
    expect(slugify("  Café — Crème! ")).toBe("cafe-creme");
  });

  test("truncates without leaving a trailing hyphen", () => {
    expect(slugify("abc def", 4)).toBe("abc");
  });
});

describe("slug uniqueness", () => {
  test("candidates start with the base and count up from 2", () => {
    expect(slugCandidates("oil", 3)).toEqual(["oil", "oil-2", "oil-3"]);
  });

  test("picks the first free candidate", () => {
    expect(firstFreeSlug("oil", [])).toBe("oil");
    expect(firstFreeSlug("oil", ["oil", "oil-2"])).toBe("oil-3");
  });

  test("returns null when every candidate is taken", () => {
    expect(firstFreeSlug("oil", slugCandidates("oil"))).toBeNull();
  });
});

describe("checkCategoryPlacement", () => {
  test("L1 must not have a parent", () => {
    expect(checkCategoryPlacement(1, null)).toBeNull();
    expect(checkCategoryPlacement(1, 1)).toMatch(/cannot have a parent/);
  });

  test("L2/L3 need a parent exactly one level up", () => {
    expect(checkCategoryPlacement(2, 1)).toBeNull();
    expect(checkCategoryPlacement(3, 2)).toBeNull();
    expect(checkCategoryPlacement(2, null)).toMatch(/need a parent/);
    expect(checkCategoryPlacement(3, 1)).toMatch(/needs an L2 parent/);
  });
});

describe("findMultiValueClashes", () => {
  test("flags only single-valued attributes with several values", () => {
    expect(
      findMultiValueClashes([
        { title: "Viscosity", allowMultiple: false, count: 2 },
        { title: "Specification", allowMultiple: true, count: 3 },
        { title: "Pack Size", allowMultiple: false, count: 1 },
      ]),
    ).toEqual(["Viscosity"]);
  });
});

describe("checkAttributeSlug", () => {
  test("rejects slugs the catalog uses as query parameters", () => {
    for (const slug of ["q", "category", "available", "page", "sort"]) {
      expect(checkAttributeSlug(slug)).toMatch(/reserved/);
    }
    expect(checkAttributeSlug("viscosity")).toBeNull();
  });
});
