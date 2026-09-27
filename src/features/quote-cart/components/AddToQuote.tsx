"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_ITEM_QUANTITY } from "../schema";
import { type QuoteItem, useQuoteStore } from "../store/useQuoteStore";

export function AddToQuote({ product, inStock }: { product: Omit<QuoteItem, "quantity">; inStock: boolean }) {
  const addItem = useQuoteStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!inStock) {
    return (
      <button type="button" disabled className="cursor-not-allowed rounded-base border border-line px-3 py-1 text-muted">
        Out of stock — cannot be quoted
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        addItem({ ...product, quantity });
        setAdded(true);
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        Qty
        <input
          type="number"
          min={1}
          max={MAX_ITEM_QUANTITY}
          value={quantity}
          onChange={(e) => setQuantity(Math.min(MAX_ITEM_QUANTITY, Math.max(1, Number(e.target.value) || 1)))}
          className="w-20 rounded-base border border-line bg-transparent px-2 py-1"
        />
      </label>
      <button type="submit" className="rounded-base bg-brand px-3 py-1 text-white">
        Add to quote
      </button>
      {added && (
        <Link href="/quote" className="text-sm text-accent hover:underline">
          Added — view quote
        </Link>
      )}
    </form>
  );
}
