import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { QuoteCart } from "@/features/quote-cart/components/QuoteCart";
import { CONTACT_HREF } from "@/features/site/nav";

export const metadata: Metadata = { title: "Quote list" };

export default function QuotePage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Quote list</h1>
        <p className="text-sm text-muted-foreground">
          Set quantities and send your list for itemized wholesale pricing. Not sure what you need?{" "}
          <Link href={CONTACT_HREF} className="text-highlight hover:underline">
            Send us an inquiry
          </Link>
          .
        </p>
      </div>
      <QuoteCart />
    </Container>
  );
}
