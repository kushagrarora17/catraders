import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getCategoryLanding, getProducts } from "@/features/catalog/api";
import { getLandingLinks } from "@/features/catalog/api";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import {
  EditorialBody,
  LandingLinks,
  landingMetadata,
} from "@/features/seo/content";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryLanding(slug);
  return landingMetadata(category?.landing, `/categories/${slug}`);
}

export default async function CategoryLandingPage({
  params,
}: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryLanding(slug);
  if (!category?.landing) notFound();
  const [products, links] = await Promise.all([
    getProducts({ q: null, category: slug, available: false, attributes: {} }),
    getLandingLinks(),
  ]);
  const brands = [
    ...new Set(products.flatMap((product) => (product.brandLabels ?? []).filter((brand): brand is string => Boolean(brand)))),
  ].sort();
  return (
    <Container className="py-10 sm:py-16">
      <Breadcrumbs
        items={[
          { title: "Home", href: "/" },
          { title: "Products", href: "/products" },
          { title: category.title },
        ]}
      />
      <header className="max-w-4xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-highlight">
          Wholesale buying guide · Southwestern Ontario
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          {category.landing.heading}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {category.landing.introduction}
        </p>
      </header>
      <LandingLinks
        title="Explore subcategories"
        items={category.children.map((child) => ({
          title: child.title,
          href: `/products?category=${encodeURIComponent(child.slug)}`,
        }))}
      />
      {!!brands.length && (
        <section className="my-8 border border-border p-6">
          <h2 className="font-heading text-2xl font-bold">
            Brands in our catalog
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {brands.join(" · ")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Brand selection reflects current catalog listings. Confirm the exact
            product, specification, stock, and pack size when requesting a
            quote.
          </p>
        </section>
      )}
      <EditorialBody content={category.landing} />
      <section className="my-12">
        <h2 className="mb-5 font-heading text-2xl font-bold">
          Explore {category.title.toLowerCase()}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
      <LandingLinks
        title="Browse the full selection"
        items={[
          {
            title: `All ${category.title.toLowerCase()}`,
            href: `/products?category=${encodeURIComponent(slug)}`,
          },
        ]}
      />
      <LandingLinks
        title="Wholesale supply in your area"
        items={links.cities.map((city) => ({
          title: `${city.city}, ON`,
          href: `/service-areas/${city.slug}`,
        }))}
      />
    </Container>
  );
}
