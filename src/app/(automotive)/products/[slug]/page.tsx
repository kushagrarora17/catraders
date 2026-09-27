import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { getProduct } from "@/features/catalog/api";
import { groupAttributeValues } from "@/features/catalog/attributes";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { StockBadge } from "@/features/catalog/components/StockBadge";
import { AddToQuote } from "@/features/quote-cart/components/AddToQuote";
import { urlFor } from "@/sanity/image";

// Render product pages on first request, then serve them from the ISR cache
// until the Sanity webhook revalidates the catalog tag.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.title ?? "Product not found" };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const attributes = groupAttributeValues(product.attributeValues);
  const categoryPath = product.categoryPath.flatMap((c) => (c ? [c] : []));

  return (
    <article>
      <Breadcrumbs
        items={[
          { title: "Home", href: "/" },
          { title: "Products", href: "/products" },
          ...categoryPath.map((c) => ({ title: c.title, href: `/products?category=${encodeURIComponent(c.slug)}` })),
          { title: product.title },
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-2">
          {product.images?.length ? (
            product.images.map((image) =>
              image.asset ? (
                <Image
                  key={image._key}
                  src={urlFor(image).width(800).url()}
                  alt={image.alt ?? product.title}
                  width={800}
                  height={600}
                  className="w-full rounded-base"
                />
              ) : null,
            )
          ) : (
            <div className="aspect-[4/3] w-full rounded-base bg-brand-secondary" />
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted">
            {product.sku && <span>SKU: {product.sku}</span>}
            <StockBadge inStock={product.inStock} />
          </div>

          <AddToQuote
            product={{
              productId: product._id,
              title: product.title,
              sku: product.sku ?? undefined,
              slug: product.slug,
            }}
            inStock={product.inStock}
          />

          {attributes.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {attributes.map((group) => (
                  <tr key={group.attribute} className="border-b border-line">
                    <th className="py-1 pr-4 text-left font-medium text-muted">{group.attribute}</th>
                    <td className="py-1">{group.values.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {product.description && (
            <div className="space-y-2 text-sm leading-relaxed">
              <PortableText value={product.description} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
