import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getFacets, getProducts } from "@/features/catalog/api";
import { Breadcrumbs, type Crumb } from "@/features/catalog/components/Breadcrumbs";
import { FacetFilters } from "@/features/catalog/components/FacetFilters";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { parseCatalogFilters } from "@/features/catalog/filters";

export const metadata: Metadata = { title: "Products" };

const categoryHref = (slug: string) => `/products?category=${encodeURIComponent(slug)}`;

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const filters = parseCatalogFilters(await searchParams);
  const [category, products, facets] = await Promise.all([
    filters.category ? getCategory(filters.category) : null,
    getProducts(filters),
    getFacets(filters),
  ]);
  if (filters.category && !category) notFound();

  const crumbs: Crumb[] = [
    { title: "Home", href: "/" },
    { title: "Products", href: category ? "/products" : undefined },
    ...(category
      ? [
          ...category.ancestors.flatMap((a) => (a ? [{ title: a.title, href: categoryHref(a.slug) }] : [])),
          { title: category.title },
        ]
      : []),
  ];

  return (
    <div>
      <Breadcrumbs items={crumbs} />
      <h1 className="mb-4 text-2xl font-semibold">{category?.title ?? "All products"}</h1>

      {category && category.children.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2 text-sm">
          {category.children.map((child) => (
            <li key={child._id}>
              <Link href={categoryHref(child.slug)} className="rounded-base border border-line px-2 py-1 hover:border-brand">
                {child.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside>
          <FacetFilters facets={facets} filters={filters} />
        </aside>
        <section>
          <p className="mb-3 text-sm text-muted">
            {products.length} product{products.length === 1 ? "" : "s"}
          </p>
          {products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-muted">No products match these filters.</p>
          )}
        </section>
      </div>
    </div>
  );
}
