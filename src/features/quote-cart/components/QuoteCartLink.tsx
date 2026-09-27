"use client";

import Link from "next/link";
import { useQuoteStore } from "../store/useQuoteStore";
import { useHydrated } from "../useHydrated";

export function QuoteCartLink() {
  const hydrated = useHydrated();
  const count = useQuoteStore((s) => s.items.length);
  return (
    <Link href="/quote" className="rounded-base border border-line px-3 py-1 text-sm hover:border-brand">
      Quote{hydrated && count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
