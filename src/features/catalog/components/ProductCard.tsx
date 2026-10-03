import Image from "next/image";
import Link from "next/link";
import { urlFor } from "@/sanity/image";
import type { PRODUCT_LIST_QUERY_RESULT } from "@/sanity/types";
import { StockBadge } from "./StockBadge";

type Product = PRODUCT_LIST_QUERY_RESULT[number];

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex flex-col gap-2 rounded-xs border border-b-3 border-border p-3 transition-[border-color,box-shadow,translate] duration-250 hover:border-b-primary hover:shadow-xl motion-safe:hover:-translate-y-1">
      {product.image?.asset ? (
        <Image
          src={urlFor(product.image).width(400).height(300).fit("crop").url()}
          alt={product.image.alt ?? product.title}
          width={400}
          height={300}
          className="aspect-[4/3] w-full rounded-xs object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full rounded-xs bg-card" />
      )}
      <Link href={`/products/${product.slug}`} className="font-medium hover:text-highlight">
        {product.title}
      </Link>
      <div className="text-xs text-muted-foreground">
        {[product.sku, product.category.title].filter(Boolean).join(" · ")}
      </div>
      {product.attributeLabels && product.attributeLabels.length > 0 && (
        <div className="text-xs text-muted-foreground">{product.attributeLabels.join(", ")}</div>
      )}
      <StockBadge inStock={product.inStock} />
    </article>
  );
}
