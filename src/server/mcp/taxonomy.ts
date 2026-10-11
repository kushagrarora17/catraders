import "server-only";
import { randomUUID } from "node:crypto";
import type { ATTRIBUTES_QUERY_RESULT, CATEGORIES_QUERY_RESULT } from "@/sanity/types";
import { getWriteClient } from "@/sanity/write-client";
import { ATTRIBUTES_QUERY, CATEGORIES_QUERY } from "./queries";
import { findMultiValueClashes, slugify } from "./validation";

export type Category = CATEGORIES_QUERY_RESULT[number];
export type Attribute = ATTRIBUTES_QUERY_RESULT[number];
export type AttributeValue = Attribute["values"][number];

export interface Taxonomy {
  categories: Category[];
  attributes: Attribute[];
  categoryBySlug: Map<string, Category>;
  categoryById: Map<string, Category>;
  attributeBySlug: Map<string, Attribute>;
  /** Every attribute value by its document id, with the attribute it belongs to. */
  valueById: Map<string, { value: AttributeValue; attribute: Attribute }>;
}

export async function loadTaxonomy(): Promise<Taxonomy> {
  const client = getWriteClient();
  const [categories, attributes] = await Promise.all([client.fetch(CATEGORIES_QUERY), client.fetch(ATTRIBUTES_QUERY)]);
  const valueById = new Map<string, { value: AttributeValue; attribute: Attribute }>();
  for (const attribute of attributes) for (const value of attribute.values) valueById.set(value._id, { value, attribute });
  return {
    categories,
    attributes,
    categoryBySlug: new Map(categories.map((c) => [c.slug, c])),
    categoryById: new Map(categories.map((c) => [c._id, c])),
    attributeBySlug: new Map(attributes.map((a) => [a.slug, a])),
    valueById,
  };
}

/** Titles from the top-level category down to `category`. */
export function categoryPath(taxonomy: Taxonomy, category: Category) {
  const path: string[] = [];
  for (let current: Category | undefined = category; current; ) {
    path.unshift(current.title);
    current = current.parentId ? taxonomy.categoryById.get(current.parentId) : undefined;
  }
  return path;
}

/** Resolves a category by slug, falling back to a case-insensitive title match. */
export function resolveCategory(taxonomy: Taxonomy, input: string): Category | string {
  const bySlug = taxonomy.categoryBySlug.get(input) ?? taxonomy.categoryBySlug.get(slugify(input));
  if (bySlug) return bySlug;
  const byTitle = taxonomy.categories.filter((c) => c.title.toLowerCase() === input.trim().toLowerCase());
  if (byTitle.length === 1) return byTitle[0];
  if (byTitle.length > 1) {
    return `Category "${input}" is ambiguous (${byTitle.map((c) => c.slug).join(", ")}); use the slug`;
  }
  const leaves = taxonomy.categories.filter((c) => c.level === 3).map((c) => c.slug);
  return `Unknown category "${input}". Level-3 categories: ${leaves.join(", ") || "none"}`;
}

export interface NewAttributeValue {
  _id: string;
  attribute: Attribute;
  label: string;
  slug: string;
}

export interface AttributeResolution {
  /** Attribute slug → resolved value ids (existing and to-be-created). */
  valueIds: Map<string, string[]>;
  toCreate: NewAttributeValue[];
  errors: string[];
}

const list = (items: string[], max = 15) =>
  items.length > max ? `${items.slice(0, max).join(", ")}, … (${items.length} total)` : items.join(", ") || "none";

/**
 * Maps `{ attributeSlug: [label or slug, …] }` onto attribute value ids. With `createMissing`,
 * unknown values are queued for creation (they get ids now so documents can reference them in the
 * same transaction); otherwise they are errors. `pending` carries values already queued earlier
 * in the same batch so they aren't created twice.
 */
export function resolveAttributeSelection(
  taxonomy: Taxonomy,
  selection: Record<string, string[]>,
  options: { createMissing?: boolean; pending?: NewAttributeValue[] } = {},
): AttributeResolution {
  const result: AttributeResolution = { valueIds: new Map(), toCreate: [], errors: [] };
  const pending = options.pending ?? [];

  for (const [attributeSlug, inputs] of Object.entries(selection)) {
    const attribute = taxonomy.attributeBySlug.get(attributeSlug);
    if (!attribute) {
      result.errors.push(
        `Unknown attribute "${attributeSlug}". Attributes: ${list(taxonomy.attributes.map((a) => a.slug))}`,
      );
      continue;
    }

    const ids = new Set<string>();
    for (const input of inputs.map((v) => v.trim()).filter(Boolean)) {
      const wanted = input.toLowerCase();
      const slug = slugify(input, 48);
      const existing = attribute.values.find((v) => v.slug === slug || v.label.toLowerCase() === wanted);
      const queued = pending.find(
        (v) => v.attribute._id === attribute._id && (v.slug === slug || v.label.toLowerCase() === wanted),
      );
      if (existing) ids.add(existing._id);
      else if (queued) ids.add(queued._id);
      else if (options.createMissing && slug) {
        const created = { _id: randomUUID(), attribute, label: input, slug };
        pending.push(created);
        result.toCreate.push(created);
        ids.add(created._id);
      } else {
        result.errors.push(
          `Unknown value "${input}" for attribute "${attributeSlug}". Existing values: ${list(attribute.values.map((v) => v.label))}. Add it with upsert_attribute_value first`,
        );
      }
    }

    const clashes = findMultiValueClashes([{ title: attribute.title, allowMultiple: !!attribute.allowMultiple, count: ids.size }]);
    if (clashes.length) result.errors.push(`Only one value allowed for: ${clashes.join(", ")}`);
    result.valueIds.set(attributeSlug, [...ids]);
  }
  return result;
}

/**
 * Merges a product's current attribute value ids with per-attribute replacements: attributes named
 * in `replacements` get exactly those values (an empty list clears them); others are kept.
 */
export function mergeAttributeValueIds(
  taxonomy: Taxonomy,
  currentIds: string[],
  replacements: Map<string, string[]>,
) {
  const kept = currentIds.filter((id) => {
    const entry = taxonomy.valueById.get(id);
    return !entry || !replacements.has(entry.attribute.slug);
  });
  return [...new Set([...kept, ...[...replacements.values()].flat()])];
}
