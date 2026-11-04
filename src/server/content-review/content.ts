import { createHash } from "node:crypto";
import type { SanityClient } from "@sanity/client";

export const REVIEW_VERSION = "1";
export const baseId = (id: string) => id.replace(/^drafts\./, "");
export const reviewId = (id: string) => `drafts.contentReview.${baseId(id)}`;

export type ReviewInput = {
  updatedAt: string;
  fields: { path: string; documentId: string; text: string }[];
};

export async function loadInput(client: SanityClient, id: string): Promise<ReviewInput | null> {
  const product = await client.fetch<{
    _id: string; _updatedAt: string; title?: string; sku?: string; seo?: {title?: string; description?: string};
    description?: {_key: string; children?: {_key: string; text?: string}[]}[];
    images?: {_key: string; alt?: string}[];
    category?: {_id: string; _updatedAt: string; title?: string};
    attributes?: {_id: string; _updatedAt: string; label?: string; attribute?: {_id: string; _updatedAt: string; title?: string}}[];
  } | null>(`*[_type == "product" && vertical == "automotive" && _id == $id][0]{
    _id, _updatedAt, title, sku, seo, description, images[]{_key, alt},
    "category": select(category->vertical == "automotive" => category->{_id, _updatedAt, title}),
    "attributes": (attributeValues[]->{
      "vertical": attribute->vertical,
      _id, _updatedAt, label, "attribute": attribute->{_id, _updatedAt, title}
    })[vertical == "automotive"]
  }`, { id: baseId(id) }, { perspective: "drafts" });
  if (!product) return null;
  const fields: ReviewInput["fields"] = [];
  const add = (path: string, text: string | undefined, documentId = baseId(id)) => {
    if (text?.trim()) fields.push({ path, documentId: baseId(documentId), text });
  };
  add("title", product.title);
  add("sku", product.sku);
  add("seo.title", product.seo?.title);
  add("seo.description", product.seo?.description);
  for (const block of product.description ?? []) {
    for (const span of block.children ?? []) {
      add(`description[_key=="${block._key}"].children[_key=="${span._key}"].text`, span.text);
    }
  }
  for (const image of product.images ?? []) add(`images[_key=="${image._key}"].alt`, image.alt);
  if (product.category) add("title", product.category.title, product.category._id);
  for (const value of product.attributes ?? []) {
    if (!value) continue;
    add("label", value.label, value._id);
    add("title", value.attribute?.title, value.attribute?._id);
  }
  const dates = [product._updatedAt, product.category?._updatedAt,
    ...(product.attributes ?? []).flatMap(v => [v?._updatedAt, v?.attribute?._updatedAt])];
  return { fields, updatedAt: dates.filter((d): d is string => Boolean(d)).sort().at(-1)! };
}

export function inputHash(input: ReviewInput) {
  return createHash("sha256").update(JSON.stringify({ version: REVIEW_VERSION, fields: input.fields })).digest("hex");
}
