import Image from "next/image";
import Link from "next/link";
import { urlFor } from "@/sanity/image";
import type { PRODUCT_LIST_QUERY_RESULT } from "@/sanity/types";
import { StockBadge } from "./StockBadge";

type Product = PRODUCT_LIST_QUERY_RESULT[number];

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  return (
    <article className="flex flex-col gap-2 rounded-xs border border-b-3 border-border p-3 transition-[border-color,box-shadow,translate] duration-250 hover:border-b-primary hover:shadow-xl motion-safe:hover:-translate-y-1">
      <div className="relative aspect-square w-full rounded-xs bg-white">
        {product.image?.asset ? (
          <Image
            src={urlFor(product.image.asset).width(800).height(800).fit("max").url()}
            alt={product.image.alt?.trim() ? product.image.alt : product.title}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4"
          />
        ) : (
          <div className="absolute inset-0 rounded-xs bg-card" />
        )}
      </div>
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
