export function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="self-start text-xs text-success">In stock</span>
  ) : (
    <span className="self-start rounded-xs bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">Out of stock</span>
  );
}
