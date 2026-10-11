import "server-only";
import type { PRODUCT_LOOKUP_QUERY_RESULT, PRODUCT_SLUGS_TAKEN_QUERY_RESULT } from "@/sanity/types";
import { getWriteClient } from "@/sanity/write-client";
import { newKey, textToBlocks } from "./portable-text";
import { PRODUCT_LOOKUP_QUERY, PRODUCT_SLUGS_TAKEN_QUERY } from "./queries";
import { firstFreeSlug, slugCandidates, slugify } from "./validation";

const DRAFT_PREFIX = "drafts.";
export const baseId = (id: string) => (id.startsWith(DRAFT_PREFIX) ? id.slice(DRAFT_PREFIX.length) : id);

export interface ProductRef {
  /** The id of the document that exists: the published id, or `drafts.<id>` when hidden. */
  docId: string;
  baseId: string;
  hidden: boolean;
  title: string;
  slug: string;
  sku: string | null;
  inStock: boolean;
}

/**
 * Finds products by id, slug or SKU, including hidden ones. A published document wins over a
 * Studio draft of the same product.
 */
export async function lookupProducts(keys: string[]): Promise<ProductRef[]> {
  if (!keys.length) return [];
  const unique = [...new Set(keys)];
  const rows = await getWriteClient().fetch<PRODUCT_LOOKUP_QUERY_RESULT>(
    PRODUCT_LOOKUP_QUERY,
    { keys: [...unique, ...unique.map((key) => `${DRAFT_PREFIX}${key}`)] },
    { perspective: "raw" },
  );
  const byBase = new Map<string, ProductRef>();
  for (const row of rows) {
    const hidden = row._id.startsWith(DRAFT_PREFIX);
    const existing = byBase.get(baseId(row._id));
    if (existing && !existing.hidden) continue;
    if (existing && hidden) continue;
    byBase.set(baseId(row._id), {
      docId: row._id,
      baseId: baseId(row._id),
      hidden,
      title: row.title,
      slug: row.slug,
      sku: row.sku,
      inStock: row.inStock,
    });
  }
  return [...byBase.values()];
}

/** Resolves one id/slug/SKU to exactly one product, or explains why not. */
export async function resolveProduct(key: string): Promise<ProductRef | string> {
  const matches = (await lookupProducts([key])).filter(
    (p) => p.baseId === key || p.slug === key || p.sku === key,
  );
  if (matches.length === 1) return matches[0];
  if (!matches.length) return `No product found for "${key}" (tried id, slug and SKU)`;
  return `"${key}" matches ${matches.length} products (${matches.map((m) => m.baseId).join(", ")}); use the id`;
}

/** SKU → products carrying that exact SKU (more than one means duplicate SKUs in the data). */
export async function lookupBySku(skus: string[]): Promise<Map<string, ProductRef[]>> {
  const bySku = new Map<string, ProductRef[]>();
  for (const product of await lookupProducts(skus)) {
    if (product.sku && skus.includes(product.sku)) bySku.set(product.sku, [...(bySku.get(product.sku) ?? []), product]);
  }
  return bySku;
}

/** A free slug for a new product, derived from `text`. */
export async function freeProductSlug(text: string, alsoTaken: Iterable<string> = []) {
  const base = slugify(text);
  if (!base) throw new Error("Can't derive a slug from an empty title");
  const taken = await getWriteClient().fetch<PRODUCT_SLUGS_TAKEN_QUERY_RESULT>(PRODUCT_SLUGS_TAKEN_QUERY, {
    candidates: slugCandidates(base),
  });
  const slug = firstFreeSlug(base, [...taken, ...alsoTaken]);
  if (!slug) throw new Error(`Too many products already use the slug "${base}"`);
  return slug;
}

export interface ProductFields {
  title: string;
  sku?: string;
  slug: string;
  inStock: boolean;
  categoryId: string;
  attributeValueIds: string[];
  description?: string;
  images?: unknown[];
}

export const reference = (id: string) => ({ _type: "reference" as const, _ref: id, _key: newKey() });

/** A complete, published product document. Matches the shape the Studio schema produces. */
export function buildProductDocument(id: string, fields: ProductFields) {
  return {
    _id: id,
    _type: "product" as const,
    vertical: "automotive" as const,
    title: fields.title,
    slug: { _type: "slug" as const, current: fields.slug },
    ...(fields.sku ? { sku: fields.sku } : {}),
    inStock: fields.inStock,
    category: { _type: "reference" as const, _ref: fields.categoryId },
    attributeValues: fields.attributeValueIds.map(reference),
    ...(fields.images?.length ? { images: fields.images } : {}),
    ...(fields.description ? { description: textToBlocks(fields.description) } : {}),
  };
}

export type ProductPatch = Partial<Omit<ProductFields, "slug">> & { slug?: string };

/** `set`/`unset` operations for a partial product update. Only provided fields are touched. */
export function buildProductPatch(patch: ProductPatch) {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.slug !== undefined) set.slug = { _type: "slug", current: patch.slug };
  if (patch.sku !== undefined) {
    if (patch.sku) set.sku = patch.sku;
    else unset.push("sku");
  }
  if (patch.inStock !== undefined) set.inStock = patch.inStock;
  if (patch.categoryId !== undefined) set.category = { _type: "reference", _ref: patch.categoryId };
  if (patch.attributeValueIds !== undefined) set.attributeValues = patch.attributeValueIds.map(reference);
  if (patch.description !== undefined) {
    if (patch.description.trim()) set.description = textToBlocks(patch.description);
    else unset.push("description");
  }
  return { set, unset };
}
