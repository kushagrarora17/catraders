import { getSiteUrl } from "@/features/site/url";

export const dynamic = "force-static";

export function GET() {
  return new Response(
    `User-Agent: *
Content-Signal: ai-train=no, search=yes, ai-input=yes
Allow: /
Disallow: /api/
Disallow: /cdn-cgi/
Disallow: /oauth/
Disallow: /quote

Sitemap: ${getSiteUrl()}/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
