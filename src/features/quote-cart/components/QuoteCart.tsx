"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type AvailabilityResponse, MAX_ITEM_QUANTITY } from "../schema";
import { useQuoteStore } from "../store/useQuoteStore";
import { useHydrated } from "../useHydrated";
import { QuoteForm } from "./QuoteForm";

type Availability = Record<string, { exists: boolean; inStock: boolean }>;

export function QuoteCart() {
  const hydrated = useHydrated();
  const items = useQuoteStore((s) => s.items);
  const updateQuantity = useQuoteStore((s) => s.updateQuantity);
  const removeItem = useQuoteStore((s) => s.removeItem);
  const clearQuote = useQuoteStore((s) => s.clearQuote);

  const [availability, setAvailability] = useState<Availability>({});
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  // Re-check stock whenever the set of products changes; the CMS may have
  // marked something out of stock since it was added.
  const idsKey = items.map((i) => i.productId).sort().join(",");
  useEffect(() => {
    if (!idsKey) return;
    const controller = new AbortController();
    fetch(`/api/availability?ids=${encodeURIComponent(idsKey)}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<AvailabilityResponse>) : null))
      .then((data) => {
        if (data) setAvailability(Object.fromEntries(data.products.map((p) => [p.id, p])));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [idsKey]);

  if (referenceNumber) {
    return (
      <div className="space-y-2">
        <p>
          Thanks! Your quote request <strong>{referenceNumber}</strong> has been submitted. We&apos;ll be in touch soon.
        </p>
        <Link href="/products" className="text-brand hover:underline">
          Continue browsing
        </Link>
      </div>
    );
  }

  if (!hydrated) return <p className="text-muted">Loading your quote…</p>;

  if (!items.length) {
    return (
      <p className="text-muted">
        Your quote is empty.{" "}
        <Link href="/products" className="text-brand hover:underline">
          Browse products
        </Link>
      </p>
    );
  }

  const unavailableReason = (productId: string) => {
    const status = availability[productId];
    if (!status) return null;
    if (!status.exists) return "No longer available";
    if (!status.inStock) return "Out of stock";
    return null;
  };
  const hasUnavailable = items.some((i) => unavailableReason(i.productId));

  return (
    <div className="space-y-8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2">Product</th>
            <th className="py-2">SKU</th>
            <th className="py-2">Qty</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const reason = unavailableReason(item.productId);
            return (
              <tr key={item.productId} className="border-b border-line">
                <td className="py-2">
                  <Link href={`/products/${item.slug}`} className="hover:text-brand">
                    {item.title}
                  </Link>
                  {reason && <span className="ml-2 text-brand">— {reason}, please remove</span>}
                </td>
                <td className="py-2 text-muted">{item.sku ?? "—"}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min={1}
                    max={MAX_ITEM_QUANTITY}
                    value={item.quantity}
                    aria-label={`Quantity for ${item.title}`}
                    onChange={(e) =>
                      updateQuantity(
                        item.productId,
                        Math.min(MAX_ITEM_QUANTITY, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                    className="w-20 rounded-base border border-line bg-transparent px-2 py-1"
                  />
                </td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => removeItem(item.productId)} className="text-muted hover:text-brand">
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your details</h2>
        {hasUnavailable && (
          <p className="text-sm text-brand">Remove unavailable products before submitting.</p>
        )}
        <QuoteForm
          items={items}
          disabled={hasUnavailable}
          onSubmitted={(ref) => {
            setReferenceNumber(ref);
            clearQuote();
          }}
          onUnavailable={(ids) =>
            setAvailability((prev) => ({
              ...prev,
              ...Object.fromEntries(ids.map((id) => [id, { exists: prev[id]?.exists ?? true, inStock: false }])),
            }))
          }
        />
      </section>
    </div>
  );
}
