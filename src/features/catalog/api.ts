import "server-only";
import { client } from "@/sanity/client";
import type {
  CATEGORY_BY_SLUG_QUERY_RESULT,
  CATEGORY_TREE_QUERY_RESULT,
  FACETS_QUERY_RESULT,
  PRODUCT_AVAILABILITY_QUERY_RESULT,
  PRODUCT_BY_SLUG_QUERY_RESULT,
  PRODUCT_LIST_QUERY_RESULT,
  QUOTE_PRODUCTS_QUERY_RESULT,
  SITEMAP_QUERY_RESULT,
} from "@/sanity/types";
import { type CatalogFilters, toAttributeFilter, toBaseParams } from "./filters";
import {
  CATEGORY_BY_SLUG_QUERY,
  CATEGORY_TREE_QUERY,
  FACETS_QUERY,
  PRODUCT_AVAILABILITY_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  PRODUCT_LIST_QUERY,
  QUOTE_PRODUCTS_QUERY,
  SITEMAP_QUERY,
  productListQueryWithFilters,
} from "./queries";

/** Cache tag for all catalog content; revalidated by the Sanity webhook. */
export const CATALOG_TAG = "automotive-products";

function cachedFetch<T>(query: string, params: Record<string, unknown> = {}) {
  return client.fetch<T>(query, params, {
    cache: "force-cache",
    next: { tags: [CATALOG_TAG] },
  });
}

export function getCategoryTree() {
  return cachedFetch<CATEGORY_TREE_QUERY_RESULT>(CATEGORY_TREE_QUERY);
}

export function getCategory(slug: string) {
  return cachedFetch<CATEGORY_BY_SLUG_QUERY_RESULT>(CATEGORY_BY_SLUG_QUERY, { slug });
}

export function getProducts(filters: CatalogFilters) {
  const base = toBaseParams(filters);
  const attr = toAttributeFilter(filters);
  const query = attr.clause ? productListQueryWithFilters(attr.clause) : PRODUCT_LIST_QUERY;
  return cachedFetch<PRODUCT_LIST_QUERY_RESULT>(query, { ...base, ...attr.params });
}

/** Attribute facets with counts for the current search/category (ignoring attribute selections). */
export function getFacets(filters: CatalogFilters) {
  return cachedFetch<FACETS_QUERY_RESULT>(FACETS_QUERY, toBaseParams(filters));
}

export function getProduct(slug: string) {
  return cachedFetch<PRODUCT_BY_SLUG_QUERY_RESULT>(PRODUCT_BY_SLUG_QUERY, { slug });
}

export function getAvailability(ids: string[]) {
  return cachedFetch<PRODUCT_AVAILABILITY_QUERY_RESULT>(PRODUCT_AVAILABILITY_QUERY, { ids });
}

/** Product and category slugs for sitemap.xml. */
export function getSitemapEntries() {
  return cachedFetch<SITEMAP_QUERY_RESULT>(SITEMAP_QUERY);
}

/** Uncached: quote submission must see the latest stock status. */
export function getProductsForQuote(ids: string[]) {
  return client.fetch<QUOTE_PRODUCTS_QUERY_RESULT>(QUOTE_PRODUCTS_QUERY, { ids }, { cache: "no-store" });
}
