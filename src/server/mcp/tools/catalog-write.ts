import "server-only";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getSiteUrl } from "@/features/site/url";
import { getWriteClient } from "@/sanity/write-client";
import { type UploadedImage, uploadImageFromUrl } from "../images";
import {
  baseId,
  buildProductDocument,
  buildProductPatch,
  freeProductSlug,
  lookupBySku,
  lookupProducts,
  type ProductPatch,
  resolveProduct,
} from "../products";
import { revalidateCatalog, revalidateReviews } from "../revalidate";
import { loadTaxonomy, mergeAttributeValueIds, resolveAttributeSelection, resolveCategory } from "../taxonomy";
import { slugify } from "../validation";
import { fail, IDEMPOTENT_WRITE, ok, WRITE } from "./util";

const attributesSchema = z
  .record(z.string(), z.array(z.string()))
  .describe('Attribute slug → value labels, e.g. {"viscosity": ["5W-30"], "pack-size": ["4 L"]}');

const DRAFT_PREFIX = "drafts.";

export function registerCatalogWriteTools(server: McpServer) {
  server.registerTool(
    "create_product",
    {
      title: "Create product",
      description:
        "Create and publish a product. Category must exist (prefer a level-3 category) and attribute values must already exist; check get_taxonomy first. SKU must be unique. Image URLs must be public https links.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(200),
        sku: z.string().trim().min(1).max(100).optional(),
        category: z.string().min(1).describe("Category slug (or exact title)"),
        attributes: attributesSchema.optional(),
        inStock: z.boolean().default(true),
        description: z.string().max(10_000).optional().describe("Plain text; blank lines separate paragraphs"),
        imageUrls: z.array(z.string().max(2048)).max(8).optional(),
        slug: z.string().trim().max(96).optional().describe("URL slug; derived from the title if omitted"),
      }),
      annotations: { ...WRITE, openWorldHint: true },
    },
    async ({ title, sku, category, attributes, inStock, description, imageUrls, slug }) => {
      const taxonomy = await loadTaxonomy();
      const resolvedCategory = resolveCategory(taxonomy, category);
      if (typeof resolvedCategory === "string") return fail(resolvedCategory);

      const selection = resolveAttributeSelection(taxonomy, attributes ?? {});
      if (selection.errors.length) return fail(selection.errors.join("\n"));

      if (sku) {
        const existing = (await lookupBySku([sku])).get(sku);
        if (existing?.length) return fail(`SKU "${sku}" is already used by "${existing[0].title}" (${existing[0].baseId})`);
      }

      let productSlug: string;
      if (slug) {
        productSlug = slugify(slug);
        if (!productSlug) return fail("slug has no usable characters");
        if ((await lookupProducts([productSlug])).some((p) => p.slug === productSlug)) {
          return fail(`Slug "${productSlug}" is already taken`);
        }
      } else {
        productSlug = await freeProductSlug(title);
      }

      const images: UploadedImage[] = [];
      for (const url of imageUrls ?? []) images.push(await uploadImageFromUrl(url, title));

      const id = randomUUID();
      await getWriteClient().create(
        buildProductDocument(id, {
          title,
          sku,
          slug: productSlug,
          inStock,
          categoryId: resolvedCategory._id,
          attributeValueIds: [...selection.valueIds.values()].flat(),
          description,
          images,
        }),
      );
      revalidateCatalog();

      return ok({
        id,
        slug: productSlug,
        url: `${getSiteUrl()}/products/${productSlug}`,
        ...(resolvedCategory.level !== 3 ? { warning: `Category "${resolvedCategory.title}" is level ${resolvedCategory.level}; products usually belong in a level-3 category` } : {}),
      });
    },
  );

  server.registerTool(
    "update_product",
    {
      title: "Update product",
      description:
        "Change fields of an existing product (found by id, slug or SKU). Only the fields you pass are changed. 'attributes' replaces the values of each attribute you name (an empty list removes that attribute) and leaves other attributes alone. The URL slug never changes with the title.",
      inputSchema: z.object({
        key: z.string().min(1).describe("Product id, slug or SKU"),
        title: z.string().trim().min(1).max(200).optional(),
        sku: z.string().trim().max(100).optional().describe("Empty string removes the SKU"),
        category: z.string().optional().describe("Category slug (or exact title)"),
        attributes: attributesSchema.optional(),
        inStock: z.boolean().optional(),
        description: z.string().max(10_000).optional().describe("Empty string removes the description"),
        addImageUrls: z.array(z.string().max(2048)).max(8).optional().describe("Public https image URLs to append"),
        clearImages: z.boolean().optional().describe("Remove all existing images (applied before addImageUrls)"),
      }),
      annotations: { ...IDEMPOTENT_WRITE, openWorldHint: true },
    },
    async ({ key, title, sku, category, attributes, inStock, description, addImageUrls, clearImages }) => {
      const ref = await resolveProduct(key);
      if (typeof ref === "string") return fail(ref);

      const patch: ProductPatch = { title, sku, inStock, description };
      let taxonomy: Awaited<ReturnType<typeof loadTaxonomy>> | undefined;

      if (category !== undefined || attributes !== undefined) {
        taxonomy = await loadTaxonomy();
        if (category !== undefined) {
          const resolved = resolveCategory(taxonomy, category);
          if (typeof resolved === "string") return fail(resolved);
          patch.categoryId = resolved._id;
        }
        if (attributes !== undefined) {
          const selection = resolveAttributeSelection(taxonomy, attributes);
          if (selection.errors.length) return fail(selection.errors.join("\n"));
          const current = await getWriteClient().getDocument<{ attributeValues?: { _ref: string }[] }>(ref.docId);
          patch.attributeValueIds = mergeAttributeValueIds(
            taxonomy,
            (current?.attributeValues ?? []).map((v) => v._ref),
            selection.valueIds,
          );
        }
      }

      if (sku) {
        const clash = ((await lookupBySku([sku])).get(sku) ?? []).find((p) => p.baseId !== ref.baseId);
        if (clash) return fail(`SKU "${sku}" is already used by "${clash.title}" (${clash.baseId})`);
      }

      const { set, unset } = buildProductPatch(patch);
      const images: UploadedImage[] = [];
      for (const url of addImageUrls ?? []) images.push(await uploadImageFromUrl(url, title ?? ref.title));
      if (clearImages && images.length) set.images = images;
      else if (clearImages) unset.push("images");

      if (!Object.keys(set).length && !unset.length && !images.length) return fail("Nothing to update: pass at least one field to change");

      let transaction = getWriteClient().patch(ref.docId);
      if (Object.keys(set).length) transaction = transaction.set(set);
      if (unset.length) transaction = transaction.unset(unset);
      if (images.length && !clearImages) {
        transaction = transaction.setIfMissing({ images: [] }).insert("after", "images[-1]", images);
      }
      await transaction.commit();
      revalidateCatalog();

      return ok({
        id: ref.baseId,
        updated: [...Object.keys(set), ...unset.map((field) => `${field} (removed)`), ...(images.length && !clearImages ? ["images (added)"] : [])],
        visible: !ref.hidden,
      });
    },
  );

  server.registerTool(
    "set_stock",
    {
      title: "Set stock status",
      description:
        "Mark products in stock or out of stock in bulk, by exact SKU and/or product id. Out-of-stock products stay visible but can't be added to a quote. Reports SKUs that weren't found.",
      inputSchema: z.object({
        inStock: z.boolean(),
        skus: z.array(z.string().min(1)).max(200).optional(),
        ids: z.array(z.string().min(1)).max(200).optional(),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ inStock, skus = [], ids = [] }) => {
      if (!skus.length && !ids.length) return fail("Pass at least one SKU or product id");

      const found = await lookupProducts([...skus, ...ids]);
      const targets = new Map<string, (typeof found)[number]>();
      const notFound: string[] = [];
      const ambiguous: string[] = [];

      for (const sku of new Set(skus)) {
        const matches = found.filter((p) => p.sku === sku);
        if (matches.length === 1) targets.set(matches[0].baseId, matches[0]);
        else (matches.length ? ambiguous : notFound).push(sku);
      }
      for (const id of new Set(ids)) {
        const match = found.find((p) => p.baseId === id);
        if (match) targets.set(match.baseId, match);
        else notFound.push(id);
      }

      const changing = [...targets.values()].filter((p) => p.inStock !== inStock);
      if (changing.length) {
        const transaction = getWriteClient().transaction();
        for (const product of changing) transaction.patch(product.docId, { set: { inStock } });
        await transaction.commit();
        revalidateCatalog();
      }

      return ok({
        inStock,
        updated: changing.map((p) => ({ id: p.baseId, sku: p.sku, title: p.title })),
        alreadyInThatState: [...targets.values()].filter((p) => p.inStock === inStock).map((p) => p.sku ?? p.baseId),
        notFound,
        ambiguousSkus: ambiguous,
      });
    },
  );

  server.registerTool(
    "set_visibility",
    {
      title: "Show or hide a product or review",
      description:
        "Unpublish (hide) or republish a product or review. Hidden items disappear from the site but keep their content, so this is reversible. Nothing is ever deleted.",
      inputSchema: z.object({
        type: z.enum(["product", "review"]),
        key: z.string().min(1).describe("Product id, slug or SKU; for reviews, the review id"),
        visible: z.boolean(),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ type, key, visible }) => {
      let id = key;
      if (type === "product") {
        const ref = await resolveProduct(key);
        if (typeof ref === "string") return fail(ref);
        id = ref.baseId;
      } else {
        id = baseId(key);
      }

      const client = getWriteClient();
      const [published, draft] = await client.getDocuments<{ _id: string; _type: string; vertical?: string; _rev?: string; _updatedAt?: string }>([
        id,
        `${DRAFT_PREFIX}${id}`,
      ]);
      const doc = published ?? draft;
      const expectedType = type === "product" ? "product" : "testimonial";
      if (!doc || doc._type !== expectedType || doc.vertical !== "automotive") {
        return fail(`No automotive ${type} with id "${id}"`);
      }

      if (visible && published) return ok({ id, visible: true, changed: false });
      if (!visible && !published) return ok({ id, visible: false, changed: false });

      // Copy the content under the other id, minus the server-managed revision fields.
      const copyAs = (source: typeof doc, newId: string) => ({
        ...Object.fromEntries(Object.entries(source).filter(([key]) => key !== "_rev" && key !== "_updatedAt")),
        _id: newId,
        _type: source._type,
      });
      const transaction = client.transaction();
      if (visible) {
        transaction.createOrReplace(copyAs(draft!, id));
        transaction.delete(`${DRAFT_PREFIX}${id}`);
      } else {
        // Keep a newer Studio draft if there is one; otherwise hide the published content as-is.
        transaction.createOrReplace(copyAs(draft ?? published!, `${DRAFT_PREFIX}${id}`));
        transaction.delete(id);
      }
      await transaction.commit();
      if (type === "product") revalidateCatalog();
      else revalidateReviews();

      return ok({ id, visible, changed: true });
    },
  );
}
