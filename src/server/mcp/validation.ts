// Studio enforces these rules in its schema validators; API writes bypass Studio, so the MCP
// tools re-check them here. Keep in sync with studio/schemaTypes/documents/*.ts.

/** Attribute slugs become catalog query-string keys; these are taken by the catalog itself. */
export const RESERVED_ATTRIBUTE_SLUGS = ["q", "category", "available", "page", "sort"];

/** Same normalisation as Sanity's default slugifier (lowercase, hyphens), plus accent stripping. */
export function slugify(text: string, maxLength = 96) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}

/** `base`, `base-2`, `base-3`… — candidates to test against existing slugs. */
export function slugCandidates(base: string, count = 25) {
  return [base, ...Array.from({ length: count - 1 }, (_, i) => `${base}-${i + 2}`)];
}

/** First candidate that isn't taken, or null if all are. */
export function firstFreeSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  return slugCandidates(base).find((candidate) => !used.has(candidate)) ?? null;
}

/** L1 has no parent; L2/L3 need a parent exactly one level above. Returns an error message or null. */
export function checkCategoryPlacement(level: number, parentLevel: number | null) {
  if (level === 1) return parentLevel === null ? null : "L1 categories cannot have a parent";
  if (parentLevel === null) return "L2 and L3 categories need a parent";
  return parentLevel === level - 1 ? null : `An L${level} category needs an L${level - 1} parent`;
}

/** Titles of single-valued attributes that were given more than one value. */
export function findMultiValueClashes(selections: { title: string; allowMultiple: boolean; count: number }[]) {
  return selections.filter((s) => !s.allowMultiple && s.count > 1).map((s) => s.title);
}

export function checkAttributeSlug(slug: string) {
  if (!slug) return "Attribute slug can't be empty";
  return RESERVED_ATTRIBUTE_SLUGS.includes(slug) ? `"${slug}" is reserved; choose another slug` : null;
}
