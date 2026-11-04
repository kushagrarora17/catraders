import {afterEach, beforeEach, expect, test} from "bun:test";
import {parse, evaluate} from "groq-js";
import type {InvocationContext} from "@azure/functions";
import type {SanityClient} from "@sanity/client";
import {processReview} from "./processor";

let enabled: string | undefined;
beforeEach(() => { enabled = process.env.CONTENT_REVIEW_ENABLED; process.env.CONTENT_REVIEW_ENABLED = "true"; });
afterEach(() => { if (enabled === undefined) delete process.env.CONTENT_REVIEW_ENABLED; else process.env.CONTENT_REVIEW_ENABLED = enabled; });
const context = {log() {}, error() {}} as unknown as InvocationContext;
function fixture() {
  const product = {_id: "p1", _type: "product", vertical: "automotive", category: {_ref: "category1"}, _updatedAt: "2026-01-01T00:00:00Z", title: "Example"};
  let state: Record<string, unknown> | undefined;
  let revision = 0, calls = 0;
  const queued: string[] = [];
  const sanity = {
    async fetch(query: string, params: Record<string, unknown>) {
      return (await evaluate(parse(query), {params, dataset: [product,
        {_id: "category1", _type: "category", vertical: "automotive", title: "Category", _updatedAt: "2026-01-01T00:00:00Z"},
      ]})).get();
    },
    async createIfNotExists(doc: Record<string, unknown>) { state ??= {...doc, _rev: String(revision)}; },
    async getDocument() { return state ? {...state} : undefined; },
    patch() {
      let rev: string, changes: Record<string, unknown>;
      const patch = {
        ifRevisionId(value: string) {rev = value; return patch;},
        set(value: Record<string, unknown>) {changes = value; return patch;},
        async commit() {
          if (rev !== state?._rev) throw Object.assign(new Error("conflict"), {statusCode: 409});
          state = {...state, ...changes, _rev: String(++revision)};
          return {...state};
        },
      }; return patch;
    },
  } as unknown as SanityClient;
  const services = {client: () => sanity, enqueue: async (id: string) => {queued.push(id);},
    review: async () => {calls++; return {coverage: "Spelling checked", findings: [], usage: {inputTokens: 10, outputTokens: 5}};}};
  return {product, services, queued, state: () => state, calls: () => calls};
}
test("duplicate jobs reuse a completed result", async () => {
  const f = fixture();
  await processReview({id: "p1"}, context, f.services);
  await processReview({id: "drafts.p1"}, context, f.services);
  expect(f.calls()).toBe(1);
  expect(f.state()?.status).toBe("complete");
});
test("edits during review discard findings and queue a fresh review", async () => {
  const f = fixture(); const original = f.services.review;
  f.services.review = async () => { const result = await original(); f.product.title = "Edited"; return result; };
  await processReview({id: "p1"}, context, f.services);
  expect(f.state()?.status).toBe("outdated");
  expect(f.state()?.findings).toBeUndefined();
  expect(f.queued).toEqual(["p1"]);
});
test("recent edits are deferred before spending model tokens", async () => {
  const f = fixture(); f.product._updatedAt = new Date().toISOString();
  await processReview({id: "p1"}, context, f.services);
  expect(f.calls()).toBe(0); expect(f.queued).toEqual(["p1"]);
});
test("taxonomy events fan out to affected products", async () => {
  const f = fixture();
  await processReview({id: "category1"}, context, f.services);
  expect(f.calls()).toBe(0); expect(f.queued).toEqual(["p1"]);
});
test("model failures remain visible and fail the queue invocation for retry", async () => {
  const f = fixture(); f.services.review = async () => {throw new Error("timeout");};
  await expect(processReview({id: "p1"}, context, f.services)).rejects.toThrow("Product review failed");
  expect(f.state()?.status).toBe("failed"); expect(f.state()?.leaseUntil).toBe("");
});
