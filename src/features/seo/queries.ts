import { defineQuery } from "groq";

const CATEGORY_FILTER = `_type == "category" && vertical == "automotive" && level == 1 && defined(slug.current) && defined(landing.heading) && defined(landing.introduction) && defined(landing.seo.title) && defined(landing.seo.description) && count(landing.sections) >= 3 && count(landing.faqs) >= 4`;
const CITY_FILTER = `_type == "serviceAreaLandingPage" && vertical == "automotive" && defined(slug.current) && serviceArea->vertical == "automotive" && city in serviceArea->cities && defined(content.heading) && defined(content.introduction) && defined(content.seo.title) && defined(content.seo.description) && count(content.sections) >= 3 && count(content.faqs) >= 4`;

export const SEO_CATEGORY_QUERY =
  defineQuery(`*[${CATEGORY_FILTER} && slug.current == $slug][0]{
  _id, title, "slug": slug.current, landing,
  "children": *[_type == "category" && vertical == "automotive" && parent._ref == ^._id] | order(sortOrder asc, title asc){_id, title, "slug": slug.current}
}`);

export const SEO_CITY_QUERY =
  defineQuery(`*[${CITY_FILTER} && slug.current == $slug][0]{
  _id, city, "slug": slug.current, content
}`);

export const SEO_LINKS_QUERY = defineQuery(`{
  "categories": *[${CATEGORY_FILTER}] | order(sortOrder asc, title asc){title, "slug": slug.current, _updatedAt},
  "cities": *[${CITY_FILTER}] | order(city asc){city, "slug": slug.current, _updatedAt}
}`);
