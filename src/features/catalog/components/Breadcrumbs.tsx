import Link from "next/link";

export interface Crumb {
  title: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="flex gap-1">
            {i > 0 && <span aria-hidden>›</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-fg">
                {item.title}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
