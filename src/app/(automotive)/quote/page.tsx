import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { QuoteCart } from "@/features/quote-cart/components/QuoteCart";

export const metadata: Metadata = { title: "Your quote" };

export default function QuotePage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Request a quote</h1>
      <QuoteCart />
    </Container>
  );
}
