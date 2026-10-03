import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/features/catalog/api";
import { getSiteUrl } from "@/features/site/url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const products = await getSitemapEntries();
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/products`, changeFrequency: "weekly", priority: 0.8 },
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p._updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
