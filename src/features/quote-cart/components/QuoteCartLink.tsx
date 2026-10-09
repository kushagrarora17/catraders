"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/useHydrated";
import { useQuoteStore } from "../store/useQuoteStore";

export function QuoteCartLink() {
  const hydrated = useHydrated();
  const count = useQuoteStore((s) => s.items.length);
  return (
    <Link href="/quote" className="inline-flex min-h-10 items-center whitespace-nowrap border border-border px-3 text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-highlight">
      Quote list{hydrated && count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
