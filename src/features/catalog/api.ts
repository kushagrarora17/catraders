import "server-only";
import { SERVICE_AREA_TAG } from "@/features/landing/api";
import { SEO_CATEGORY_QUERY, SEO_LINKS_QUERY } from "@/features/seo/queries";
import type { SEO_CATEGORY_QUERY_RESULT, SEO_LINKS_QUERY_RESULT } from "@/sanity/types";
import { client } from "@/sanity/client";
import type {
  CATEGORY_BY_SLUG_QUERY_RESULT,
  FACETS_QUERY_RESULT,
  PRODUCT_AVAILABILITY_QUERY_RESULT,
  PRODUCT_BY_SLUG_QUERY_RESULT,
  PRODUCT_LIST_QUERY_RESULT,
  QUOTE_PRODUCTS_QUERY_RESULT,
  SITEMAP_QUERY_RESULT,
} from "@/sanity/types";
import { type CatalogFilters, PRODUCTS_PER_PAGE, toAttributeFilter, toBaseParams } from "./filters";
import {
  CATEGORY_BY_SLUG_QUERY,
  FACETS_QUERY,
  PRODUCT_AVAILABILITY_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  PRODUCT_LIST_QUERY,
  PRODUCT_COUNT_QUERY,
  QUOTE_PRODUCTS_QUERY,
  SITEMAP_QUERY,
  productListQueryWithFilters,
  productCountQueryWithFilters,
} from "./queries";

/** Cache tag for all catalog content; revalidated by the Sanity webhook. */
export const CATALOG_TAG = "automotive-products";

function cachedFetch<T>(query: string, params: Record<string, unknown> = {}) {
  return client.fetch<T>(query, params, {
    cache: "force-cache",
    next: { tags: [CATALOG_TAG] },
  });
}

export function getCategory(slug: string) {
  return cachedFetch<CATEGORY_BY_SLUG_QUERY_RESULT>(CATEGORY_BY_SLUG_QUERY, { slug });
}

export function getProducts(filters: CatalogFilters, page?: number) {
  const base = toBaseParams(filters);
  const attr = toAttributeFilter(filters);
  const range = page === undefined ? undefined : { start: (page - 1) * PRODUCTS_PER_PAGE, end: page * PRODUCTS_PER_PAGE };
  const query = attr.clause || range ? productListQueryWithFilters(attr.clause, range) : PRODUCT_LIST_QUERY;
  return cachedFetch<PRODUCT_LIST_QUERY_RESULT>(query, { ...base, ...attr.params });
}

export function getProductCount(filters: CatalogFilters) {
  const attr = toAttributeFilter(filters);
  const query = attr.clause ? productCountQueryWithFilters(attr.clause) : PRODUCT_COUNT_QUERY;
  return cachedFetch<number>(query, { ...toBaseParams(filters), ...attr.params });
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

export function getCategoryLanding(slug: string) {
  return cachedFetch<SEO_CATEGORY_QUERY_RESULT>(SEO_CATEGORY_QUERY, { slug });
}

export function getLandingLinks() {
  return client.fetch<SEO_LINKS_QUERY_RESULT>(SEO_LINKS_QUERY, {}, {
    cache: "force-cache", next: { tags: [CATALOG_TAG, SERVICE_AREA_TAG] },
  });
}
