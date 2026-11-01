import type { MetadataRoute } from "next";
import { getLandingLinks } from "@/features/catalog/api";
import { getSitemapEntries } from "@/features/catalog/api";
import { getSiteUrl } from "@/features/site/url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [products, links] = await Promise.all([getSitemapEntries(), getLandingLinks()]);
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/products`, changeFrequency: "weekly", priority: 0.8 },
    ...links.categories.map((category) => ({ url: `${base}/categories/${category.slug}`, lastModified: category._updatedAt })),
    ...links.cities.map((city) => ({ url: `${base}/service-areas/${city.slug}`, lastModified: city._updatedAt })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p._updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
