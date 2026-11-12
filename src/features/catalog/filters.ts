// Parses catalog search params into GROQ params. Attribute filters use the
// attribute slug as the query-string key: ?viscosity=5w-30&viscosity=0w-20&pack-size=4-l
// Values of one attribute are OR-ed; different attributes are AND-ed.

export type SearchParams = Record<string, string | string[] | undefined>;

export interface CatalogFilters {
  q: string | null;
  category: string | null;
  available: boolean;
  attributes: Record<string, string[]>;
}

// Must match RESERVED_SLUGS in studio/schemaTypes/documents/attribute.ts.
const RESERVED_PARAMS = new Set(["q", "category", "available", "page", "sort"]);
export const MAX_ATTRIBUTE_GROUPS = 10;
export const PRODUCTS_PER_PAGE = 24;
const MAX_VALUES_PER_GROUP = 20;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,95}$/;

const all = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const first = (value: string | string[] | undefined) => all(value)[0];

export function parseCatalogPage(searchParams: SearchParams) {
  const value = first(searchParams.page);
  const page = value && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && page > 0 && Number.isSafeInteger(page * PRODUCTS_PER_PAGE) ? page : 1;
}

export function catalogFilterParams(filters: CatalogFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.available) params.set("available", "1");
  for (const [key, values] of Object.entries(filters.attributes)) {
    for (const value of values) params.append(key, value);
  }
  return params;
}

export function catalogPageHref(filters: CatalogFilters, page: number) {
  const params = catalogFilterParams(filters);
  if (page > 1) params.set("page", String(page));
  return `/products${params.size ? `?${params}` : ""}`;
}

export function parseCatalogFilters(searchParams: SearchParams): CatalogFilters {
  const q = first(searchParams.q)?.trim().slice(0, 100) || null;
  const categoryParam = first(searchParams.category);
  const category = categoryParam && SLUG_PATTERN.test(categoryParam) ? categoryParam : null;

  const attributes: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (Object.keys(attributes).length >= MAX_ATTRIBUTE_GROUPS) break;
    if (RESERVED_PARAMS.has(key) || !SLUG_PATTERN.test(key)) continue;
    const values = [...new Set(all(value).filter((v) => SLUG_PATTERN.test(v)))].slice(
      0,
      MAX_VALUES_PER_GROUP,
    );
    if (values.length) attributes[key] = values;
  }

  return { q, category, available: first(searchParams.available) === "1", attributes };
}

/** Base params shared by the product listing and facet queries. */
export function toBaseParams(filters: CatalogFilters) {
  return {
    q: filters.q ? `${filters.q}*` : null,
    category: filters.category,
    available: filters.available,
  };
}

/**
 * GROQ `&& …` clauses for the selected attribute values. Only generated
 * parameter names are interpolated; user input travels as params.
 */
export function toAttributeFilter(filters: CatalogFilters) {
  const params: Record<string, string | string[]> = {};
  const clauses = Object.entries(filters.attributes).map(([key, values], i) => {
    params[`attrKey${i}`] = key;
    params[`attrValues${i}`] = values;
    return `&& references(*[_type == "attributeValue" && attribute->vertical == "automotive" && attribute->slug.current == $attrKey${i} && slug.current in $attrValues${i}]._id)`;
  });
  return { clause: clauses.join(" "), params };
}
