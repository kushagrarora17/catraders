import type { InvocationContext } from "@azure/functions";
import type { SanityClient } from "@sanity/client";
import { getWriteClient } from "../../src/sanity/write-client-core";
import { inputHash, loadInput, baseId, reviewId, REVIEW_VERSION, type ReviewInput } from "../../src/server/content-review/content";
import { reviewContent } from "../../src/server/content-review/model";
import { enqueueReview } from "../../src/server/content-review/queue";

type ReviewState = {_id: string; _rev: string; status: string; sourceUpdatedAt?: string; inputHash?: string; leaseUntil?: string};
type ReviewServices = {
  client: () => SanityClient; enqueue: typeof enqueueReview; review: typeof reviewContent;
};

export async function processReview(message: unknown, context: InvocationContext, services: ReviewServices
  = {client: getWriteClient, enqueue: enqueueReview, review: reviewContent}) {
  if (process.env.CONTENT_REVIEW_ENABLED !== "true") return;
  const event = typeof message === "string" ? JSON.parse(message) : message;
  if (!event || typeof event.id !== "string") throw new Error("Invalid review job");
  const id = baseId(event.id);
  const sanity = services.client();
  // A taxonomy event fans out into individual product jobs, including draft products.
  const ids = await sanity.fetch<string[]>(`*[_type == "product" && vertical == "automotive" && (
    _id == $id || category._ref == $id || $id in attributeValues[]._ref ||
    $id in attributeValues[]->attribute._ref)] ._id`, {id}, {perspective: "drafts"});
  if (!ids.includes(id)) {
    for (const productId of ids) await services.enqueue(productId);
    return;
  }
  const input = await loadInput(sanity, id);
  if (!input) return;
  const wait = 60 - Math.floor((Date.now() - Date.parse(input.updatedAt)) / 1000);
  if (wait > 0) { await services.enqueue(id, Math.min(wait, 60)); return; }
  const hash = inputHash(input);
  const claimed = await claimReview(sanity, id, hash, input.updatedAt);
  if (!claimed) return;
  await runReview(sanity, id, input, hash, claimed, context, services);
}

async function claimReview(sanity: SanityClient, id: string, hash: string, updatedAt: string) {
  const stateId = reviewId(id);
  await sanity.createIfNotExists({ _id: stateId, _type: "contentReview", vertical: "automotive",
    product: {_type: "reference", _ref: id, _weak: true}, status: "pending" });
  const state = await sanity.getDocument<ReviewState>(stateId);
  if (!state) return null;
  if (state.status === "complete" && state.inputHash === hash) {
    if (state.sourceUpdatedAt !== updatedAt) {
      await sanity.patch(stateId).ifRevisionId(state._rev).set({sourceUpdatedAt: updatedAt}).commit();
    }
    return null;
  }
  if (state.leaseUntil && Date.parse(state.leaseUntil) > Date.now()) return null;
  let claimed: ReviewState;
  try {
    claimed = await sanity.patch(stateId).ifRevisionId(state._rev).set({ status: "reviewing", inputHash: hash,
      leaseUntil: new Date(Date.now() + 300_000).toISOString(), error: "" }).commit<ReviewState>();
  } catch (error) {
    if ((error as {statusCode?: number}).statusCode === 409) return null;
    throw error;
  }
  return claimed;
}

async function runReview(sanity: SanityClient, id: string, input: ReviewInput, hash: string,
  claimed: ReviewState, context: InvocationContext, services: ReviewServices) {
  const stateId = reviewId(id);
  try {
    const result = await services.review(input);
    const latest = await loadInput(sanity, id);
    if (!latest || inputHash(latest) !== hash) {
      await sanity.patch(stateId).ifRevisionId(claimed._rev).set({status: "outdated", leaseUntil: ""}).commit();
      if (latest) await services.enqueue(id);
      return;
    }
    await sanity.patch(stateId).ifRevisionId(claimed._rev).set({
      status: "complete", inputHash: hash, reviewedAt: new Date().toISOString(), leaseUntil: "",
      sourceUpdatedAt: input.updatedAt, model: process.env.CONTENT_REVIEW_MODEL || "gpt-6.1-terra",
      promptVersion: REVIEW_VERSION, coverage: result.coverage, ...result.usage,
      findings: result.findings.map((finding, i) => ({...finding, _type: "reviewFinding", _key: `f${i}`,
        evidence: finding.evidence.map((e, j) => ({...e, _type: "reviewEvidence", _key: `e${j}`}))})),
    }).commit();
    context.log("content-review completed", { productId: id, findings: result.findings.length, ...result.usage });
  } catch (error) {
    await sanity.patch(stateId).ifRevisionId(claimed._rev).set({status: "failed", leaseUntil: "",
      error: "Review failed. The queue will retry; check worker logs if the failure persists."}).commit();
    context.error("content-review failed", {productId: id, reason: error instanceof Error ? error.message : "unknown"});
    throw new Error("Product review failed");
  }
}
