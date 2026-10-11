import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getSiteUrl } from "@/features/site/url";
import type {
  HIDDEN_PRODUCT_SEARCH_QUERY_RESULT,
  PRODUCT_DETAIL_QUERY_RESULT,
  PRODUCT_SEARCH_QUERY_RESULT,
} from "@/sanity/types";
import { getWriteClient } from "@/sanity/write-client";
import { blocksToText } from "../portable-text";
import { baseId, resolveProduct } from "../products";
import { HIDDEN_PRODUCT_SEARCH_QUERY, PRODUCT_DETAIL_QUERY, PRODUCT_SEARCH_QUERY } from "../queries";
import { type Category, loadTaxonomy } from "../taxonomy";
import { fail, ok, READ_ONLY, SEARCH_PAGE_SIZE } from "./util";

export function registerCatalogReadTools(server: McpServer) {
  server.registerTool(
    "search_products",
    {
      title: "Search products",
      description:
        "List catalog products with stock status, category and attributes. Filter by text (title/SKU prefix), category slug (includes sub-categories), stock status or exact SKUs. Use visibility 'hidden' to find unpublished products.",
      inputSchema: z.object({
        query: z.string().trim().max(100).optional().describe("Text to match against title or SKU"),
        category: z.string().optional().describe("Category slug at any level"),
        inStock: z.boolean().optional(),
        skus: z.array(z.string()).max(100).optional().describe("Exact SKUs"),
        visibility: z.enum(["visible", "hidden"]).default("visible"),
        limit: z.number().int().min(1).max(100).default(SEARCH_PAGE_SIZE),
        offset: z.number().int().min(0).default(0),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, category, inStock, skus, visibility, limit, offset }) => {
      const params = {
        q: query ? `${query}*` : null,
        category: category ?? null,
        inStock: inStock ?? null,
        skus: skus ?? null,
        start: offset,
        end: offset + limit,
      };
      const client = getWriteClient();
      const result =
        visibility === "hidden"
          ? await client.fetch<HIDDEN_PRODUCT_SEARCH_QUERY_RESULT>(HIDDEN_PRODUCT_SEARCH_QUERY, params, { perspective: "raw" })
          : await client.fetch<PRODUCT_SEARCH_QUERY_RESULT>(PRODUCT_SEARCH_QUERY, params);

      return ok({
        total: result.total,
        offset,
        items: result.items.map((item) => ({
          id: baseId(item._id),
          title: item.title,
          slug: item.slug,
          sku: item.sku,
          inStock: item.inStock,
          category: item.categoryPath.filter(Boolean).join(" › "),
          attributes: item.attributes ?? [],
        })),
      });
    },
  );

  server.registerTool(
    "get_product",
    {
      title: "Get product",
      description: "Full details of one product, including hidden (unpublished) ones. Look up by id, slug or SKU.",
      inputSchema: z.object({ key: z.string().min(1).describe("Product id, slug or SKU") }),
      annotations: READ_ONLY,
    },
    async ({ key }) => {
      const ref = await resolveProduct(key);
      if (typeof ref === "string") return fail(ref);
      const product = await getWriteClient().fetch<PRODUCT_DETAIL_QUERY_RESULT>(
        PRODUCT_DETAIL_QUERY,
        { docId: ref.docId },
        { perspective: "raw" },
      );
      if (!product) return fail(`Product "${key}" no longer exists`);

      return ok({
        id: ref.baseId,
        visible: !ref.hidden,
        url: ref.hidden ? null : `${getSiteUrl()}/products/${product.slug}`,
        title: product.title,
        slug: product.slug,
        sku: product.sku,
        inStock: product.inStock,
        category: { slug: product.category.slug, title: product.category.title, level: product.category.level },
        categoryPath: product.categoryPath.filter(Boolean).join(" › "),
        attributes: (product.attributes ?? []).map((a) => ({
          attribute: a.attribute.slug,
          value: a.label,
        })),
        images: (product.images ?? []).map((image) => ({ url: image.url, alt: image.alt })),
        description: blocksToText(product.description),
        updatedAt: product._updatedAt,
      });
    },
  );

  server.registerTool(
    "get_taxonomy",
    {
      title: "Get categories and attributes",
      description:
        "The category tree (L1 > L2 > L3, with slugs) and every attribute with its allowed values. Call this before creating or importing products so category slugs and attribute values are spelled correctly.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      const taxonomy = await loadTaxonomy();
      const children = new Map<string | null, Category[]>();
      for (const category of taxonomy.categories) {
        const key = category.parentId;
        children.set(key, [...(children.get(key) ?? []), category]);
      }
      const node = (category: Category): unknown => ({
        slug: category.slug,
        title: category.title,
        level: category.level,
        children: (children.get(category._id) ?? []).map(node),
      });

      return ok({
        categories: (children.get(null) ?? []).map(node),
        attributes: taxonomy.attributes.map((attribute) => ({
          slug: attribute.slug,
          title: attribute.title,
          filterable: !!attribute.filterable,
          allowMultiple: !!attribute.allowMultiple,
          values: attribute.values.map((value) => value.label),
        })),
      });
    },
  );
}
