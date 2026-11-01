import { getWriteClient } from "../src/sanity/write-client";
import {
  revalidateCatalog,
  revalidateServiceArea,
} from "../src/server/mcp/revalidate";
import { categoryGuides, cityGuide, type Guide } from "./seo-content";

const client = getWriteClient();
const apply = process.argv.includes("--apply");
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const key = () => crypto.randomUUID().replaceAll("-", "");
function content(guide: Guide) {
  return {
    _type: "landingContent",
    heading: guide.heading,
    seo: { _type: "seo", title: guide.title, description: guide.description },
    introduction: guide.introduction,
    keywords: guide.keywords,
    sections: guide.sections.map(([heading, paragraphs]) => ({
      _type: "editorialSection",
      _key: key(),
      heading,
      body: paragraphs.map((text) => ({
        _type: "block",
        _key: key(),
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: key(), text, marks: [] }],
      })),
    })),
    comparison: guide.comparison.map(([option, usage, selection]) => ({
      _type: "comparisonRow",
      _key: key(),
      option,
      usage,
      selection,
    })),
    faqs: guide.faqs.map(([question, answer]) => ({
      _type: "faq",
      _key: key(),
      question,
      answer,
    })),
    sources: guide.sources.map(([title, url]) => ({
      _type: "source",
      _key: key(),
      title,
      url,
    })),
  };
}

type Category = { _id: string; _rev: string; slug: string; landing?: unknown };
type CityPage = { _id: string; city: string; slug: string };
const raw = client.withConfig({ perspective: "raw" });
const [categories, area, existingCities] = await Promise.all([
  raw.fetch<Category[]>(
    '*[_type == "category" && vertical == "automotive" && level == 1]{_id, _rev, "slug": slug.current, landing}',
  ),
  client.fetch<{ _id: string; cities: string[] } | null>(
    '*[_type == "serviceArea" && vertical == "automotive" && _id == "serviceArea"][0]{_id, cities}',
  ),
  raw.fetch<CityPage[]>(
    '*[_type == "serviceAreaLandingPage" && vertical == "automotive"]{_id, city, "slug": slug.current}',
  ),
]);
if (!area?.cities?.length)
  throw new Error("Confirmed service cities are required");
const plans = Object.entries(categoryGuides).map(([slug, guide]) => {
  const matches = categories.filter(
    (category) => category.slug === slug && !category._id.startsWith("drafts."),
  );
  if (matches.length !== 1)
    throw new Error(`Expected one published category: ${slug}`);
  const category = matches[0];
  const hasDraft = categories.some(
    (entry) => entry._id === `drafts.${category._id}`,
  );
  return { category, guide, skip: Boolean(category.landing || hasDraft) };
});
const cityPlans = area.cities.map((city) => {
  const slug = slugify(city);
  const guide = cityGuide(city);
  if (existingCities.some((page) => page.slug === slug && page.city !== city))
    throw new Error(`City slug collision: ${slug}`);
  return {
    city,
    slug,
    guide,
    skip: existingCities.some(
      (page) => page.city === city || page.slug === slug,
    ),
  };
});
for (const guide of [
  ...plans.map((plan) => plan.guide),
  ...cityPlans.map((plan) => plan.guide),
]) {
  if (
    guide.sections.length < 3 ||
    guide.faqs.length < 4 ||
    !guide.title ||
    !guide.description ||
    !guide.introduction
  )
    throw new Error(`Incomplete content: ${guide.heading}`);
}
console.log(
  JSON.stringify({
    mode: apply ? "publish" : "dry-run",
    categoryPages: plans.length,
    cityPages: cityPlans.length,
    preserved:
      plans.filter((plan) => plan.skip).length +
      cityPlans.filter((plan) => plan.skip).length,
  }),
);
if (apply) {
  for (const { category, guide, skip } of plans) {
    if (!skip)
      await client
        .patch(category._id)
        .ifRevisionId(category._rev)
        .setIfMissing({ landing: content(guide) })
        .commit();
  }
  for (const { city, slug, guide, skip } of cityPlans) {
    if (!skip)
      await client.create({
        _type: "serviceAreaLandingPage",
        vertical: "automotive",
        city,
        slug: { _type: "slug", current: slug },
        serviceArea: { _type: "reference", _ref: area._id },
        content: content(guide),
      });
  }
  const invalidation = await Promise.all([
    revalidateCatalog(),
    revalidateServiceArea(),
  ]);
  console.log(
    JSON.stringify({
      published: true,
      cacheWarnings: invalidation.flatMap((result) =>
        result.cacheWarning ? [result.cacheWarning] : [],
      ),
    }),
  );
}
