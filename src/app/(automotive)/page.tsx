import Link from "next/link";
import { getCategoryTree } from "@/features/catalog/api";
import { CategoryTree } from "@/features/catalog/components/CategoryTree";

export default async function HomePage() {
  const categories = await getCategoryTree();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Automotive fluids</h1>
        <form action="/products" className="flex max-w-md gap-2">
          <input
            name="q"
            type="search"
            placeholder="Search by name or SKU"
            aria-label="Search products"
            className="flex-1 rounded-base border border-line bg-transparent px-2 py-1"
          />
          <button type="submit" className="rounded-base bg-brand px-3 py-1 text-white">
            Search
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Browse by category</h2>
        <CategoryTree categories={categories} />
      </section>

      <Link href="/products" className="inline-block text-brand hover:underline">
        View all products →
      </Link>
    </div>
  );
}
