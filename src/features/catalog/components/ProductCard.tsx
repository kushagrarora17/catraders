import Image from "next/image";
import Link from "next/link";
import { urlFor } from "@/sanity/image";
import type { PRODUCT_LIST_QUERY_RESULT } from "@/sanity/types";
import { StockBadge } from "./StockBadge";

type Product = PRODUCT_LIST_QUERY_RESULT[number];

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col gap-2 rounded-base border border-line p-3">
      {product.image?.asset ? (
        <Image
          src={urlFor(product.image).width(400).height(300).fit("crop").url()}
          alt={product.image.alt ?? product.title}
          width={400}
          height={300}
          className="aspect-[4/3] w-full rounded-base object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full rounded-base bg-brand-secondary" />
      )}
      <Link href={`/products/${product.slug}`} className="font-medium hover:text-brand">
        {product.title}
      </Link>
      <div className="text-xs text-muted">
        {[product.sku, product.category.title].filter(Boolean).join(" · ")}
      </div>
      {product.attributeLabels && product.attributeLabels.length > 0 && (
        <div className="text-xs text-muted">{product.attributeLabels.join(", ")}</div>
      )}
      <StockBadge inStock={product.inStock} />
    </article>
  );
}
