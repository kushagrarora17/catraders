import { describe, expect, test } from "bun:test";
import { isSeparateOperatorProject, normalizeOperatorEmail } from "./operators";

describe("operator identity normalization", () => {
  test("trims, applies Unicode NFKC normalization, and lowercases addresses", () => {
    expect(normalizeOperatorEmail("  Kush＠Example.COM ")).toBe("kush@example.com");
  });

  test("requires a different project even when the catalog project uses its baked-in default", () => {
    expect(isSeparateOperatorProject("51ngrb7a", "51ngrb7a")).toBe(false);
    expect(isSeparateOperatorProject("operator-project", "51ngrb7a")).toBe(true);
    expect(isSeparateOperatorProject(undefined, "51ngrb7a")).toBe(false);
  });
});
