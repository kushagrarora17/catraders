import "server-only";
import { getProductsForQuote } from "@/features/catalog/api";
import { groupAttributeValues } from "@/features/catalog/attributes";
import type { QuoteRequest } from "@/features/quote-cart/schema";
import { getDb } from "@/server/db";
import { insertQuote, type NewQuote } from "./repository";

export type SubmitQuoteResult =
  | { ok: true; referenceNumber: string; quote: NewQuote }
  | { ok: false; status: 400 | 409; error: "UNKNOWN_PRODUCTS" | "OUT_OF_STOCK"; productIds: string[] };

/**
 * Re-validates the cart against Sanity (existence, vertical, stock) and stores
 * the RFQ using canonical product data rather than what the client sent.
 */
export async function submitQuoteRequest(request: QuoteRequest): Promise<SubmitQuoteResult> {
  const ids = request.items.map((i) => i.productId);
  const products = new Map((await getProductsForQuote(ids)).map((p) => [p._id, p]));

  const unknown = ids.filter((id) => !products.has(id));
  if (unknown.length) {
    return { ok: false, status: 400, error: "UNKNOWN_PRODUCTS", productIds: unknown };
  }
  const outOfStock = ids.filter((id) => !products.get(id)!.inStock);
  if (outOfStock.length) {
    return { ok: false, status: 409, error: "OUT_OF_STOCK", productIds: outOfStock };
  }

  const quote: NewQuote = {
    customer: request.customer,
    notes: request.notes,
    items: request.items.map((item) => {
      const product = products.get(item.productId)!;
      return {
        sanityProductId: product._id,
        productTitle: product.title,
        sku: product.sku,
        quantity: item.quantity,
        specificationsSnapshot: {
          categoryPath: product.categoryPath.flatMap((c) => (c ? [c.title] : [])),
          attributes: groupAttributeValues(product.attributeValues),
        },
      };
    }),
  };

  const { referenceNumber } = await insertQuote(getDb(), quote);
  return { ok: true, referenceNumber, quote };
}
