import { defineQuery } from "groq";

// Queries for the MCP management tools. Like the storefront queries, every one is scoped to the
// automotive vertical (attribute values inherit it from their attribute). Draft documents only
// show up when a query is run with the `raw` perspective: that is how hidden (unpublished)
// products and reviews are found.

const PRODUCT_FILTER = `
  _type == "product" && vertical == "automotive"
  && (!defined($q) || title match $q || sku match $q)
  && (!defined($category) || $category in [
    category->slug.current,
    category->parent->slug.current,
    category->parent->parent->slug.current
  ])
  && (!defined($inStock) || inStock == $inStock)
  && (!defined($skus) || sku in $skus)
`;

// A draft with no published counterpart is a hidden (unpublished) document.
const HIDDEN_ONLY = (type: string) =>
  `_id in path("drafts.**") && !defined(*[_type == "${type}" && _id == string::split(^._id, "drafts.")[1]][0]._id)`;

const PRODUCT_SUMMARY = `{
  _id,
  title,
  "slug": slug.current,
  sku,
  inStock,
  "categoryPath": [category->parent->parent->title, category->parent->title, category->title][defined(@)],
  "attributes": attributeValues[]->label
}`;

export const PRODUCT_SEARCH_QUERY = defineQuery(`{
  "total": count(*[${PRODUCT_FILTER}]),
  "items": *[${PRODUCT_FILTER}] | order(title asc) [$start...$end] ${PRODUCT_SUMMARY}
}`);

/** Run with the `raw` perspective. */
export const HIDDEN_PRODUCT_SEARCH_QUERY = defineQuery(`{
  "total": count(*[${PRODUCT_FILTER} && ${HIDDEN_ONLY("product")}]),
  "items": *[${PRODUCT_FILTER} && ${HIDDEN_ONLY("product")}] | order(title asc) [$start...$end] ${PRODUCT_SUMMARY}
}`);

/** Run with the `raw` perspective; `$docId` is the published id or the `drafts.` id. */
export const PRODUCT_DETAIL_QUERY = defineQuery(`
  *[_type == "product" && vertical == "automotive" && _id == $docId][0] {
    _id,
    _updatedAt,
    title,
    "slug": slug.current,
    sku,
    inStock,
    "category": category->{ _id, title, "slug": slug.current, level },
    "categoryPath": [category->parent->parent->title, category->parent->title, category->title][defined(@)],
    "attributes": attributeValues[]->{
      _id,
      label,
      "slug": slug.current,
      "attribute": attribute->{ title, "slug": slug.current }
    },
    "images": images[]{ "url": asset->url, alt },
    description
  }
`);

/** Run with the `raw` perspective; `$keys` mixes ids (published and `drafts.`), SKUs and slugs. */
export const PRODUCT_LOOKUP_QUERY = defineQuery(`
  *[_type == "product" && vertical == "automotive"
    && (sku in $keys || slug.current in $keys || _id in $keys)] {
    _id,
    title,
    "slug": slug.current,
    sku,
    inStock
  }
`);

export const PRODUCT_SLUGS_TAKEN_QUERY = defineQuery(`
  *[_type == "product" && vertical == "automotive" && slug.current in $candidates].slug.current
`);

export const CATEGORIES_QUERY = defineQuery(`
  *[_type == "category" && vertical == "automotive"] | order(level asc, sortOrder asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    level,
    "parentId": parent._ref,
    sortOrder
  }
`);

export const ATTRIBUTES_QUERY = defineQuery(`
  *[_type == "attribute" && vertical == "automotive"] | order(sortOrder asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    filterable,
    allowMultiple,
    sortOrder,
    "values": *[_type == "attributeValue" && attribute._ref == ^._id] | order(sortOrder asc, label asc) {
      _id,
      label,
      "slug": slug.current,
      sortOrder
    }
  }
`);

const REVIEW_PROJECTION = `{ _id, quote, name, role, city, rating, sortOrder }`;

export const REVIEWS_QUERY = defineQuery(`
  *[_type == "testimonial" && vertical == "automotive"] | order(sortOrder asc, _createdAt asc) ${REVIEW_PROJECTION}
`);

/** Run with the `raw` perspective. */
export const HIDDEN_REVIEWS_QUERY = defineQuery(`
  *[_type == "testimonial" && vertical == "automotive" && ${HIDDEN_ONLY("testimonial")}]
    | order(sortOrder asc, _createdAt asc) ${REVIEW_PROJECTION}
`);
