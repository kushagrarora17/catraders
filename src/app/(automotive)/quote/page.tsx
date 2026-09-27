import type { Metadata } from "next";
import { QuoteCart } from "@/features/quote-cart/components/QuoteCart";

export const metadata: Metadata = { title: "Your quote" };

export default function QuotePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Request a quote</h1>
      <QuoteCart />
    </div>
  );
}
