import type { Route } from "next";
import Link from "next/link";
import { JsonLd } from "@/features/seo/content";
import { getSiteUrl } from "@/features/site/url";

export interface Crumb {
  title: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
    <JsonLd value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, ...(item.href ? { item: new URL(item.href, getSiteUrl()).href } : {}) })) }} />
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex gap-1">
            {i > 0 && <span aria-hidden>›</span>}
            {item.href ? (
              <Link href={item.href as Route} className="hover:text-foreground">
                {item.title}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
    </>
  );
}
