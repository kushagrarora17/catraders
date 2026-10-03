import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/features/site/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/quote"] },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
