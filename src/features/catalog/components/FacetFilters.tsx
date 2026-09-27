import Link from "next/link";
import type { FACETS_QUERY_RESULT } from "@/sanity/types";
import type { CatalogFilters } from "../filters";

/** Plain GET form: works without JavaScript and keeps filters in the URL. */
export function FacetFilters({ facets, filters }: { facets: FACETS_QUERY_RESULT; filters: CatalogFilters }) {
  const clearHref = filters.category ? `/products?category=${encodeURIComponent(filters.category)}` : "/products";
  return (
    <form action="/products" className="space-y-4 text-sm">
      {filters.category && <input type="hidden" name="category" value={filters.category} />}
      <div>
        <label htmlFor="q" className="mb-1 block font-medium">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Name or SKU"
          className="w-full rounded-base border border-line bg-transparent px-2 py-1"
        />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="available" value="1" defaultChecked={filters.available} />
        In stock only
      </label>
      {facets.map((facet) => (
        <fieldset key={facet._id}>
          <legend className="mb-1 font-medium">{facet.title}</legend>
          {facet.values.map((value) => (
            <label key={value._id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={facet.key}
                value={value.key}
                defaultChecked={filters.attributes[facet.key]?.includes(value.key) ?? false}
              />
              {value.label} <span className="text-muted">({value.count})</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-base bg-brand px-3 py-1 text-white">
          Apply
        </button>
        <Link href={clearHref} className="text-muted hover:text-fg">
          Clear
        </Link>
      </div>
    </form>
  );
}
