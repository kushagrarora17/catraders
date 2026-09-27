import { defineQuery } from "groq";

// Every catalog query is scoped to the automotive vertical (TRD §8 isolation).

export const CATEGORY_TREE_QUERY = defineQuery(`
  *[_type == "category" && vertical == "automotive" && level == 1] | order(sortOrder asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    "children": *[_type == "category" && vertical == "automotive" && parent._ref == ^._id] | order(sortOrder asc, title asc) {
      _id,
      title,
      "slug": slug.current,
      "children": *[_type == "category" && vertical == "automotive" && parent._ref == ^._id] | order(sortOrder asc, title asc) {
        _id,
        title,
        "slug": slug.current
      }
    }
  }
`);

export const CATEGORY_BY_SLUG_QUERY = defineQuery(`
  *[_type == "category" && vertical == "automotive" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    level,
    "ancestors": [
      parent->parent->{ title, "slug": slug.current },
      parent->{ title, "slug": slug.current }
    ][defined(slug)],
    "children": *[_type == "category" && vertical == "automotive" && parent._ref == ^._id] | order(sortOrder asc, title asc) {
      _id,
      title,
      "slug": slug.current
    }
  }
`);

// Shared by the static (typed) listing query and the runtime query that adds
// attribute filters; keep both in sync by editing these constants only.
const PRODUCT_LIST_FILTER = `
  _type == "product" && vertical == "automotive"
  && (!defined($q) || title match $q || sku match $q)
  && (!defined($category) || $category in [
    category->slug.current,
    category->parent->slug.current,
    category->parent->parent->slug.current
  ])
  && (!$available || inStock == true)
`;

const PRODUCT_CARD_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  sku,
  inStock,
  "image": images[0],
  "category": category->{ title, "slug": slug.current },
  "attributeLabels": attributeValues[]->label
}`;

export const PRODUCT_LIST_QUERY = defineQuery(
  `*[${PRODUCT_LIST_FILTER}] | order(title asc) ${PRODUCT_CARD_PROJECTION}`,
);

/** Same shape as PRODUCT_LIST_QUERY, with extra `&& …` attribute clauses spliced in. */
export function productListQueryWithFilters(extraFilter: string) {
  return `*[${PRODUCT_LIST_FILTER} ${extraFilter}] | order(title asc) ${PRODUCT_CARD_PROJECTION}`;
}

export const FACETS_QUERY = defineQuery(`
  *[_type == "attribute" && vertical == "automotive" && filterable == true] | order(sortOrder asc, title asc) {
    _id,
    title,
    "key": slug.current,
    "values": *[_type == "attributeValue" && attribute._ref == ^._id] | order(sortOrder asc, label asc) {
      _id,
      label,
      "key": slug.current,
      "count": count(*[${PRODUCT_LIST_FILTER} && references(^._id)])
    }[count > 0]
  }[count(values) > 0]
`);

const PRODUCT_ATTRIBUTE_VALUES_PROJECTION = `attributeValues[]->{
  label,
  sortOrder,
  "attribute": attribute->{ _id, title, sortOrder }
}`;

const CATEGORY_PATH_PROJECTION = `[
  category->parent->parent->{ title, "slug": slug.current },
  category->parent->{ title, "slug": slug.current },
  category->{ title, "slug": slug.current }
][defined(slug)]`;

export const PRODUCT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "product" && vertical == "automotive" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    sku,
    inStock,
    images,
    description,
    "categoryPath": ${CATEGORY_PATH_PROJECTION},
    "attributeValues": ${PRODUCT_ATTRIBUTE_VALUES_PROJECTION}
  }
`);

export const PRODUCT_AVAILABILITY_QUERY = defineQuery(`
  *[_type == "product" && vertical == "automotive" && _id in $ids] { _id, inStock }
`);

export const QUOTE_PRODUCTS_QUERY = defineQuery(`
  *[_type == "product" && vertical == "automotive" && _id in $ids] {
    _id,
    title,
    sku,
    inStock,
    "categoryPath": ${CATEGORY_PATH_PROJECTION},
    "attributeValues": ${PRODUCT_ATTRIBUTE_VALUES_PROJECTION}
  }
`);
