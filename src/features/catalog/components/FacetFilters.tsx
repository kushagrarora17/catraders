"use client";

import type { Route } from "next";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { FACETS_QUERY_RESULT } from "@/sanity/types";
import { catalogFilterParams as filterParams, type CatalogFilters } from "../filters";

type Props = { facets: FACETS_QUERY_RESULT; filters: CatalogFilters };


function href(params: URLSearchParams) {
  return `/products${params.size ? `?${params}` : ""}` as Route;
}

export function ProductSearch({ filters }: { filters: CatalogFilters }) {
  const id = useId();
  const params = filterParams(filters);
  params.delete("q");
  return (
    <form action="/products" className="mb-5">
      {Array.from(params.entries()).map(([name, value]) => <input key={`${name}:${value}`} type="hidden" name={name} value={value} />)}
      <label htmlFor={id} className="mb-2 block text-lg font-semibold">Search products</label>
      <div className="flex gap-2">
        <input id={id} name="q" type="search" defaultValue={filters.q ?? ""} placeholder="Search by product name or SKU" className="min-h-12 min-w-0 flex-1 rounded-xs border border-border bg-background px-4 text-base focus:border-primary focus:outline-2 focus:outline-primary" />
        <button type="submit" className="min-h-12 rounded-xs bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover">Search</button>
      </div>
    </form>
  );
}

function categoryParams(filters: CatalogFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  return params;
}

type Facet = FACETS_QUERY_RESULT[number];
const facetTitle = (facet: Facet | undefined, key: string) => facet?.title ?? key;
const facetValue = (facet: Facet | undefined, value: string) => facet?.values.find((item) => item.key === value)?.label ?? value;

export function AppliedFilters({ facets, filters }: Props) {
  const params = filterParams(filters);
  const chips = [
    ...(filters.q ? [{ key: "q", value: filters.q, label: `Search: ${filters.q}` }] : []),
    ...(filters.available ? [{ key: "available", value: "1", label: "In stock" }] : []),
    ...Object.entries(filters.attributes).flatMap(([key, values]) => {
      const facet = facets.find((item) => item.key === key);
      return values.map((value) => ({ key, value, label: `${facetTitle(facet, key)}: ${facetValue(facet, value)}` }));
    }),
  ];
  if (!chips.length) return null;
  const clear = categoryParams(filters);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Applied filters">
      <span className="text-sm font-medium">Applied filters</span>
      {chips.map((chip) => {
        const remaining = new URLSearchParams(params);
        remaining.delete(chip.key, chip.value);
        return (
          <Link key={`${chip.key}:${chip.value}`} href={href(remaining)} aria-label={`Remove ${chip.label}`} className="inline-flex min-h-11 items-center gap-2 rounded-xs border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-medium hover:bg-primary/20">
            {chip.label}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </Link>
        );
      })}
      <Link href={href(clear)} className="px-2 py-2 text-sm underline underline-offset-4">Clear all</Link>
    </div>
  );
}

function FilterToggle({count, expanded, id, onToggle}: {count: number; expanded: boolean; id: string; onToggle: () => void}) {
  return <>
      {count > 6 && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={onToggle} className="mt-2 min-h-9 text-primary underline underline-offset-4">{expanded ? "Show less" : `Show all (${count})`}</button>}
  </>;
}

function FacetSearch({facet, search, onSearch}: {facet: Facet; search: string; onSearch: (value: string) => void}) {
  return <>
      {facet.values.length > 10 && (
        <input type="search" aria-label={`Search ${facet.title}`} placeholder={`Search ${facet.title.toLowerCase()}`} value={search} onChange={(event) => onSearch(event.target.value)} className="mt-3 w-full rounded-xs border border-border bg-background px-3 py-2" />
      )}
  </>;
}

function FilterGroup({ facet, selected }: { facet: FACETS_QUERY_RESULT[number]; selected: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const id = useId();
  const matching = facet.values.filter((value) => value.label.toLowerCase().includes(search.toLowerCase()));
  const visible = matching.filter((value, index) => expanded || index < 6 || selected.includes(value.key));
  return (
    <details open className="border-t border-border py-3">
      <summary className="cursor-pointer font-medium">{facet.title}{selected.length > 0 && <span className="ml-2 text-primary">{selected.length} selected</span>}</summary>
      <FacetSearch facet={facet} search={search} onSearch={setSearch} />
      <fieldset id={id} className="mt-2 space-y-1">
        <legend className="sr-only">{facet.title}</legend>
        {facet.values.map((value) => (
          <label key={value._id} className={`${visible.includes(value) ? "flex" : "hidden"} min-h-9 cursor-pointer items-center gap-2 rounded-xs px-2 py-1 has-checked:bg-primary/10 has-checked:font-medium`}>
            <input type="checkbox" name={facet.key} value={value.key} defaultChecked={selected.includes(value.key)} className="size-4 accent-primary" />
            <span className="min-w-0 flex-1">{value.label}</span>{" "}<span className="text-muted-foreground">({value.count})</span>
          </label>
        ))}
      </fieldset>
      {!matching.length && <p className="py-2 text-muted-foreground">No matching options.</p>}
      <FilterToggle count={matching.length} expanded={expanded} id={id} onToggle={() => setExpanded(!expanded)} />
    </details>
  );
}

function FilterForm({ facets, filters }: Props) {
  const [draft, setDraft] = useState(filters);
  const clear = categoryParams(filters);
  const dirty = filterParams(draft).toString() !== filterParams(filters).toString();
  return (
    <form action="/products" className="flex min-h-0 flex-1 flex-col text-sm" onChange={(event) => {
      const data = new FormData(event.currentTarget);
      setDraft({ ...filters, q: String(data.get("q") ?? "").trim() || null, available: data.has("available"), attributes: Object.fromEntries(facets.map((facet) => [facet.key, data.getAll(facet.key).map(String)])) });
    }}>
      {filters.category && <input type="hidden" name="category" value={filters.category} />}
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        <label className="my-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-xs px-2 has-checked:bg-primary/10 has-checked:font-medium">
          <input type="checkbox" name="available" value="1" defaultChecked={filters.available} className="size-4 accent-primary" />In stock only
        </label>
        {facets.map((facet) => <FilterGroup key={facet._id} facet={facet} selected={draft.attributes[facet.key] ?? []} />)}
      </div>
      <div className="shrink-0 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p role="status" className="mb-2 min-h-5 text-xs text-muted-foreground">{dirty ? "Unapplied changes" : "Filters are up to date"}</p>
        <button type="submit" className="min-h-11 w-full rounded-xs bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary-hover">Apply filters</button>
        <Link href={href(clear)} className="mt-2 block py-2 text-center underline underline-offset-4">Clear filters</Link>
      </div>
    </form>
  );
}

const filterTitle = (count: number) => `Filters${count > 0 ? ` (${count})` : ""}`;

export function FacetFilters(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const titleId = useId();
  const count = Number(props.filters.available) + Object.values(props.filters.attributes).reduce((total, values) => total + values.length, 0);
  const title = filterTitle(count);
  return (
    <>
      <div className="sticky top-[calc(var(--header-height)+1rem)] hidden max-h-[calc(100dvh-var(--header-height)-2rem)] flex-col overflow-hidden rounded-xs border border-border bg-background md:flex">
        <h2 className="p-4 font-semibold">{title}</h2>
        <FilterForm {...props} />
      </div>
      <button type="button" onClick={() => { setMobileOpen(true); dialog.current?.showModal(); }} className="min-h-11 w-full rounded-xs border border-border px-4 py-2 text-left font-medium md:hidden">{title}</button>
      <dialog ref={dialog} onClose={() => setMobileOpen(false)} aria-labelledby={titleId} className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-sm border-l border-border bg-background p-0 text-foreground backdrop:bg-black/50" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4">
            <h2 id={titleId} className="font-semibold">{title}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 px-3" aria-label="Close filters">✕</button>
          </div>
          {mobileOpen && <FilterForm {...props} />}
        </div>
      </dialog>
    </>
  );
}
