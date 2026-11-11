import { randomUUID } from "node:crypto";
import { type CsvRecord, parseBoolean } from "./csv";
import { blocksToText } from "./portable-text";
import type { ProductFields, ProductPatch, ProductRef } from "./products";
import {
  mergeAttributeValueIds,
  type NewAttributeValue,
  resolveAttributeSelection,
  resolveCategory,
  type Taxonomy,
} from "./taxonomy";
import { firstFreeSlug, slugCandidates, slugify } from "./validation";

export const MAX_IMPORT_ROWS = 500;

const COLUMN_ALIASES: Record<string, string> = {
  instock: "in_stock",
  "in stock": "in_stock",
  stock: "in_stock",
  image: "image_url",
  "image url": "image_url",
  images: "image_url",
  image_urls: "image_url",
};
const KNOWN_COLUMNS = new Set(["sku", "title", "category", "in_stock", "description", "image_url"]);
const ATTRIBUTE_PREFIX = "attr:";

/** Maps a lower-cased CSV header to its canonical column name. */
export const canonicalColumn = (header: string) => COLUMN_ALIASES[header] ?? header.replace(/^attr:\s*/, ATTRIBUTE_PREFIX);

/** The parts of an existing product document the plan compares against. */
export interface ExistingProductDoc {
  title?: string;
  inStock?: boolean;
  category?: { _ref: string };
  attributeValues?: { _ref: string }[];
  description?: { children?: { text?: string }[] }[];
}

export interface RowPlan {
  line: number;
  sku: string;
  action: "create" | "update" | "unchanged" | "error";
  errors: string[];
  changes: string[];
  create?: { id: string; fields: ProductFields; imageUrls: string[] };
  update?: { docId: string; patch: ProductPatch; imageUrls: string[] };
}

export interface ImportPlan {
  rows: RowPlan[];
  /** Attribute values to create first (only those needed by rows that are valid). */
  newValues: NewAttributeValue[];
  unknownColumns: string[];
}

/** Slugs a new product from this file could take; the caller asks Sanity which are already used. */
export function slugCandidatesForNewRows(records: CsvRecord[], knownSkus: Set<string>) {
  const candidates = new Set<string>();
  for (const { values } of records) {
    const title = values.title;
    if (!title || knownSkus.has(values.sku)) continue;
    const base = slugify(title);
    if (base) for (const candidate of slugCandidates(base)) candidates.add(candidate);
  }
  return [...candidates];
}

const splitList = (cell: string) => cell.split("|").map((part) => part.trim()).filter(Boolean);
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

function rowStock(cells: Record<string, string>, errors: string[]) {
  const parsed = cells.in_stock ? parseBoolean(cells.in_stock) : undefined;
  if (parsed === null) errors.push(`in_stock "${cells.in_stock}" isn't yes/no or true/false`);
  return parsed ?? undefined;
}

function rowCategory(taxonomy: Taxonomy, cell: string, errors: string[]) {
  if (!cell) return undefined;
  const category = resolveCategory(taxonomy, cell);
  if (typeof category === "string") {
    errors.push(category);
    return undefined;
  }
  return category._id;
}

function rowSelection(cells: Record<string, string>) {
  const selection: Record<string, string[]> = {};
  for (const [column, cell] of Object.entries(cells)) {
    if (column.startsWith(ATTRIBUTE_PREFIX) && cell) selection[column.slice(ATTRIBUTE_PREFIX.length).trim()] = splitList(cell);
  }
  return selection;
}

function rowImages(cell: string, errors: string[]) {
  const urls = cell ? splitList(cell) : [];
  for (const url of urls) if (!/^https:\/\//i.test(url)) errors.push(`image_url "${url}" must be an https link`);
  return urls;
}

function rowMatches(row: RowPlan, existing: Map<string, ProductRef[]>, seenSkus: Map<string, number>) {
  const {sku} = row;
    if (!sku) {
      row.errors.push("sku is required");
      return null;
    }
    const firstLine = seenSkus.get(sku);
    if (firstLine) {
      row.errors.push(`Duplicate SKU in the file (first seen on line ${firstLine})`);
      return null;
    }
    seenSkus.set(sku, row.line);

    const matches = existing.get(sku) ?? [];
    if (matches.length > 1) {
      row.errors.push(`${matches.length} products already share this SKU (${matches.map((m) => m.baseId).join(", ")}); fix the duplicates first`);
      return null;
    }

  return matches;
}

function createSlug(cells: Record<string, string>, row: RowPlan, takenSlugs: Set<string>) {
      if (!cells.title) row.errors.push("title is required for new products");
      if (!cells.category) row.errors.push("category is required for new products");
      const slugBase = slugify(cells.title ?? "");
      const slug = slugBase ? firstFreeSlug(slugBase, takenSlugs) : null;
      if (cells.title && !slug) row.errors.push(`Couldn't derive a free slug from "${cells.title}"`);

  return slug;
}

export function planImport(input: {
  headers: string[];
  records: CsvRecord[];
  taxonomy: Taxonomy;
  /** Existing products by exact SKU. */
  existing: Map<string, ProductRef[]>;
  /** Existing product documents by document id. */
  existingDocs: Map<string, ExistingProductDoc>;
  takenSlugs: Iterable<string>;
  createMissingValues: boolean;
}): ImportPlan {
  const { taxonomy } = input;
  const takenSlugs = new Set(input.takenSlugs);
  const plan: ImportPlan = {
    rows: [],
    newValues: [],
    unknownColumns: input.headers.filter((h) => {
      const column = canonicalColumn(h);
      return h && !KNOWN_COLUMNS.has(column) && !column.startsWith(ATTRIBUTE_PREFIX);
    }),
  };
  const seenSkus = new Map<string, number>();

  for (const record of input.records) {
    // Re-key the row by canonical column name.
    const cells: Record<string, string> = {};
    for (const [header, value] of Object.entries(record.values)) cells[canonicalColumn(header)] = value;

    const sku = cells.sku ?? "";
    const row: RowPlan = { line: record.line, sku, action: "error", errors: [], changes: [] };
    plan.rows.push(row);

    const matches = rowMatches(row, input.existing, seenSkus);
    if (!matches) continue;

    const inStock = rowStock(cells, row.errors);
    const categoryId = rowCategory(taxonomy, cells.category, row.errors);

    const selection = rowSelection(cells);
    const pendingBefore = plan.newValues.length;
    const resolution = resolveAttributeSelection(taxonomy, selection, {
      createMissing: input.createMissingValues,
      pending: plan.newValues,
    });
    row.errors.push(...resolution.errors);

    const imageUrls = rowImages(cells.image_url, row.errors);

    const description = cells.description || undefined;

    function planCreate() {
      const slug = createSlug(cells, row, takenSlugs);

      if (row.errors.length || !slug || !categoryId) {
        plan.newValues.length = pendingBefore; // don't create values for a row that won't be written
        return;
      }
      takenSlugs.add(slug);
      row.action = "create";
      row.changes = ["create"];
      row.create = {
        id: randomUUID(),
        imageUrls,
        fields: {
          title: cells.title,
          sku,
          slug,
          inStock: inStock ?? true,
          categoryId,
          attributeValueIds: [...resolution.valueIds.values()].flat(),
          description,
        },
      };
      return;
    }
    if (matches.length === 0) {
      planCreate();
      continue;
    }

    if (row.errors.length) {
      plan.newValues.length = pendingBefore;
      continue;
    }

    function planUpdate(ref: ProductRef) {
    const doc = input.existingDocs.get(ref.docId) ?? {};
    const patch: ProductPatch = {};

    function scalarPatch() {
    if (cells.title && cells.title !== doc.title) patch.title = cells.title;
    if (inStock !== undefined && inStock !== doc.inStock) patch.inStock = inStock;
    if (categoryId && categoryId !== doc.category?._ref) patch.categoryId = categoryId;
    }
    scalarPatch();
    function attributePatch() {
    if (Object.keys(selection).length) {
      const current = (doc.attributeValues ?? []).map((v) => v._ref);
      const merged = mergeAttributeValueIds(taxonomy, current, resolution.valueIds);
      if (!sameSet(current, merged)) patch.attributeValueIds = merged;
    }
    }
    attributePatch();
    if (description && description !== blocksToText(doc.description)) patch.description = description;

    const label: Record<string, string> = { categoryId: "category", attributeValueIds: "attributes" };
    row.changes = [...Object.keys(patch).map((field) => label[field] ?? field), ...(imageUrls.length ? ["images (added)"] : [])];
    row.action = row.changes.length ? "update" : "unchanged";
    if (row.action === "update") row.update = { docId: ref.docId, patch, imageUrls };
    else plan.newValues.length = pendingBefore;
    }
    planUpdate(matches[0]);
  }

  return plan;
}
