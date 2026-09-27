export function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="text-xs text-green-400">In stock</span>
  ) : (
    <span className="rounded-base bg-brand px-1.5 py-0.5 text-xs text-white">Out of stock</span>
  );
}
