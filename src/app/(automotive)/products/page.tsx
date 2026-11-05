import type { Metadata, Route } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { notFound } from "next/navigation";
import { getCategory, getFacets, getProductCount, getProducts } from "@/features/catalog/api";
import { Breadcrumbs, type Crumb } from "@/features/catalog/components/Breadcrumbs";
import { AppliedFilters, FacetFilters, ProductSearch } from "@/features/catalog/components/FacetFilters";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { catalogPageHref, type CatalogFilters, parseCatalogFilters, parseCatalogPage, PRODUCTS_PER_PAGE } from "@/features/catalog/filters";

export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const page = parseCatalogPage(params);
  const category = filters.category ? await getCategory(filters.category) : null;
  const title = category ? `Wholesale ${category.title}` : "Wholesale Automotive Products";
  const description = category
    ? `Browse wholesale ${category.title.toLowerCase()} for automotive shops in Southwestern Ontario. Compare specifications and pack sizes, then request pricing from CA Traders.`
    : "Browse wholesale engine oils, transmission fluids, coolants, filters and shop supplies. Request pricing and availability from CA Traders in Southwestern Ontario.";
  return {
    title, description,
    alternates: { canonical: catalogPageHref({ ...filters, q: null, available: false, attributes: {} }, page) },
    ...(filters.q ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description },
  };
}

const categoryHref = (slug: string) => `/products?category=${encodeURIComponent(slug)}` as Route;

function Pagination({ filters, page, total }: { filters: CatalogFilters; page: number; total: number }) {
  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={catalogPageHref(filters, page - 1) as Route} rel="prev" className="rounded-xs border border-border px-3 py-2 hover:border-primary">
          Previous
        </Link>
      ) : <span />}
      <span aria-current="page">Page {page} of {totalPages}</span>
      {page < totalPages ? (
        <Link href={catalogPageHref(filters, page + 1) as Route} rel="next" className="rounded-xs border border-border px-3 py-2 hover:border-primary">
          Next
        </Link>
      ) : <span />}
    </nav>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const page = parseCatalogPage(params);
  const [category, products, facets, total] = await Promise.all([
    filters.category ? getCategory(filters.category) : null,
    getProducts(filters, page),
    getFacets(filters),
    getProductCount(filters),
  ]);
  if (filters.category && !category) notFound();
  if (page > 1 && !products.length) notFound();

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
    <Container className="py-8">
      <Breadcrumbs items={crumbs} />
      <h1 className="mb-4 text-2xl font-semibold">{category?.title ?? "All products"}</h1>

      {category && category.children.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2 text-sm">
          {category.children.map((child) => (
            <li key={child._id}>
              <Link href={categoryHref(child.slug)} className="rounded-xs border border-border px-2 py-1 hover:border-primary">
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
        <section className="min-w-0">
          <ProductSearch filters={filters} />
          <AppliedFilters facets={facets} filters={filters} />
          <p className="mb-3 text-sm text-muted-foreground">
            {total > PRODUCTS_PER_PAGE
              ? `Showing ${(page - 1) * PRODUCTS_PER_PAGE + 1}–${Math.min(page * PRODUCTS_PER_PAGE, total)} of ${total} products`
              : `${total} product${total === 1 ? "" : "s"}`}
          </p>
          {products.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No products match these filters.</p>
          )}
          <Pagination filters={filters} page={page} total={total} />
        </section>
      </div>
    </Container>
  );
}
