import {afterEach, beforeEach, expect, test} from "bun:test";
import {encodeSignatureHeader, SIGNATURE_HEADER_NAME} from "@sanity/webhook";
import {POST} from "./route";

let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = {enabled: process.env.CONTENT_REVIEW_ENABLED, secret: process.env.SANITY_WEBHOOK_SECRET, queue: process.env.CONTENT_REVIEW_QUEUE_URL};
  process.env.CONTENT_REVIEW_ENABLED = "true";
  process.env.SANITY_WEBHOOK_SECRET = "test-review-secret";
  delete process.env.CONTENT_REVIEW_QUEUE_URL;
});
afterEach(() => {
  for (const [key, value] of Object.entries({CONTENT_REVIEW_ENABLED: saved.enabled, SANITY_WEBHOOK_SECRET: saved.secret, CONTENT_REVIEW_QUEUE_URL: saved.queue})) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
async function request(body: string, sign = true) {
  const headers: Record<string, string> = {};
  if (sign) headers[SIGNATURE_HEADER_NAME] = await encodeSignatureHeader(body, Date.now(), "test-review-secret");
  return POST(new Request("http://localhost/api/webhooks/content-review", {method: "POST", body, headers}));
}
test("disabled review service does not accept work", async () => {
  process.env.CONTENT_REVIEW_ENABLED = "false";
  expect(await (await request('{}')).json()).toEqual({enabled: false});
});
test("rejects unsigned and tampered content", async () => {
  expect((await request('{}', false)).status).toBe(401);
  const signature = await encodeSignatureHeader('{}', Date.now(), "test-review-secret");
  expect((await POST(new Request("http://localhost", {method: "POST", body: '{"changed":true}',
    headers: {[SIGNATURE_HEADER_NAME]: signature}}))).status).toBe(401);
});
test("rejects malformed events and review-document loops", async () => {
  for (const body of ['not json', 'null', '{"_id":"p1","_type":"contentReview"}', '{"_type":"product"}']) {
    expect((await request(body)).status).toBe(400);
  }
});
test("queue failure returns retryable failure rather than losing a signed event", async () => {
  expect((await request('{"_id":"drafts.p1","_type":"product"}')).status).toBe(503);
});
