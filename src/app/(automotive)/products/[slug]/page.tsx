import { productFaqs } from "@/features/catalog/faqs";
import { getServiceArea } from "@/features/landing/api";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import { Container } from "@/components/ui/container";
import { getProduct } from "@/features/catalog/api";
import { groupAttributeValues } from "@/features/catalog/attributes";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { StockBadge } from "@/features/catalog/components/StockBadge";
import { AddToQuote } from "@/features/quote-cart/components/AddToQuote";
import { JsonLd } from "@/features/seo/content";
import { urlFor } from "@/sanity/image";

// Render product pages on first request, then serve them from the ISR cache
// until the Sanity webhook revalidates the catalog tag.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const details = product.attributeValues?.flatMap((value) => value?.label ? [value.label] : []).join(", ");
  const fallback = `${product.title}${details ? ` — ${details}` : ""}. Request wholesale pricing from CA Elite Lubes in Southwestern Ontario.`;
  const description = product.seo?.description?.trim() || (product.descriptionText?.trim() || fallback).replace(/\s+/g, " ").slice(0, 180);
  const title = product.seo?.title?.trim() || product.title;
  return {
    title, description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title, description, url: `/products/${product.slug}`,
      ...(product.images?.[0]?.asset ? { images: [{ url: urlFor(product.images[0]).width(1200).url(), alt: product.images[0].alt ?? product.title }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const attributes = groupAttributeValues(product.attributeValues);
  const categoryPath = product.categoryPath.flatMap((c) => (c ? [c] : []));
  const images = product.images?.filter((image) => image.asset) ?? [];
  const area = await getServiceArea();
  const faqs = productFaqs(product, area?.cities ?? []);

  return (
    <Container className="py-8">
      <article>
      {faqs.length > 0 && <JsonLd value={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }} />}
      <Breadcrumbs
        items={[
          { title: "Home", href: "/" },
          { title: "Products", href: "/products" },
          ...categoryPath.map((c) => ({ title: c.title, href: `/products?category=${encodeURIComponent(c.slug)}` })),
          { title: product.title },
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {images.length ? (
            images.map((image, index) =>
              image.asset ? (
                <div key={image._key} className="relative aspect-square w-full rounded-xs bg-white">
                  <Image
                    src={urlFor(image.asset).width(1200).height(1200).fit("max").url()}
                    alt={image.alt ?? product.title}
                    loading={index === 0 ? "eager" : "lazy"}
                    fill
                    sizes="(min-width: 1280px) 584px, (min-width: 768px) 50vw, 100vw"
                    className="object-contain p-4 sm:p-6"
                  />
                </div>
              ) : null,
            )
          ) : (
            <div className="aspect-square w-full rounded-xs bg-card" />
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
          />

          {attributes.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {attributes.map((group) => (
                  <tr key={group.attribute} className="border-b border-border">
                    <th className="py-1 pr-4 text-left font-medium text-muted-foreground">{group.attribute}</th>
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
      {faqs.length > 0 && <section aria-labelledby="product-faq-heading" className="mt-12 max-w-3xl">
        <h2 id="product-faq-heading" className="mb-4 text-xl font-semibold">Frequently asked questions</h2>
        {faqs.map(({ question, answer }) => (
          <details key={question} className="border-t border-border py-5">
            <summary className="cursor-pointer font-medium">{question}</summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </details>
        ))}
      </section>}
      </article>
    </Container>
  );
}
