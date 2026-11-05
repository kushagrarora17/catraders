import {describe, expect, test} from "bun:test";
import {parse, evaluate} from "groq-js";
import type {SanityClient} from "@sanity/client";
import {inputHash, loadInput, type ReviewInput} from "./content";
import {resultSchema, validateFindings, type ReviewResult} from "./model";

const input: ReviewInput = {updatedAt: "2026-11-04T00:00:00Z", fields: [
  {path: "title", documentId: "p1", text: "Example oil 5W-40"},
]};
const finding = (): ReviewResult => ({coverage: "Exact manufacturer match", findings: [{
  kind: "factual", path: "title", documentId: "p1", original: "5W-40", suggestion: "5W-30",
  explanation: "Manufacturer lists 5W-30", evidence: [{url: "https://manufacturer.example/oil", quote: "Viscosity: 5W-30"}],
}]});

describe("review evidence", () => {
  test("retains factual flags grounded in retrieved citations and passages", () => {
    expect(validateFindings(finding(), input, new Set(["https://manufacturer.example/oil"]),
      "Viscosity: 5W-30").findings[0].kind).toBe("factual");
  });
  test("downgrades invented URLs, missing evidence and invented passages", () => {
    for (const mode of ["url", "quote", "missing"]) {
      const result = finding();
      if (mode === "missing") result.findings[0].evidence = [];
      const validated = validateFindings(result, input,
        new Set(mode === "url" ? [] : ["https://manufacturer.example/oil"]), mode === "quote" ? "unrelated" : "Viscosity: 5W-30");
      expect(validated.findings[0]).toMatchObject({kind: "unverified", suggestion: null, evidence: []});
    }
  });
  test("rejects hallucinated fields, document ids and current text", () => {
    for (const change of [{path: "unknown"}, {documentId: "other"}, {original: "nonexistent"}]) {
      const result = finding(); Object.assign(result.findings[0], change);
      expect(() => validateFindings(result, input, new Set(), "")).toThrow("unknown content");
    }
  });
  test("rejects malformed and oversized model output", () => {
    expect(resultSchema.safeParse({coverage: "", findings: []}).success).toBe(false);
    expect(resultSchema.safeParse({...finding(), findings: Array(41).fill(finding().findings[0])}).success).toBe(false);
  });
  test("hash ignores timestamps but changes with shared content", () => {
    expect(inputHash(input)).toBe(inputHash({...input, updatedAt: "later"}));
    expect(inputHash(input)).not.toBe(inputHash({...input, fields: [...input.fields, {path: "label", documentId: "shared", text: "API SP"}]}));
  });
});

test("loads automotive text with shared document identities and stable rich text paths", async () => {
  const dataset = [
    {_id: "p1", _type: "product", vertical: "automotive", _updatedAt: input.updatedAt,
      title: "Example oil", category: {_ref: "c1"}, attributeValues: [{_ref: "v1"}],
      description: [{_key: "b1", children: [{_key: "s1", text: "Description"}]}]},
    {_id: "c1", _type: "category", vertical: "automotive", title: "Oils", _updatedAt: input.updatedAt},
    {_id: "v1", _type: "attributeValue", label: "5W-40", attribute: {_ref: "a1"}, _updatedAt: input.updatedAt},
    {_id: "a1", _type: "attribute", vertical: "automotive", title: "Viscosity", _updatedAt: "2026-11-04T01:00:00Z"},
    {_id: "p2", _type: "product", vertical: "baby", title: "Excluded"},
  ];
  const client = {fetch: async (query: string, params: Record<string, unknown>) =>
    (await evaluate(parse(query), {dataset, params})).get()} as unknown as SanityClient;
  const result = await loadInput(client, "drafts.p1");
  expect(result?.fields).toContainEqual({path: 'description[_key=="b1"].children[_key=="s1"].text', documentId: "p1", text: "Description"});
  expect(result?.fields).toContainEqual({path: "label", documentId: "v1", text: "5W-40"});
  expect(result?.updatedAt).toBe("2026-11-04T01:00:00Z");
  expect(await loadInput(client, "p2")).toBeNull();
  expect(await loadInput(client, "deleted")).toBeNull();
});
