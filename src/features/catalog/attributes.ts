export interface AttributeValueRow {
  label: string;
  sortOrder: number | null;
  attribute: { _id: string; title: string; sortOrder: number | null } | null;
}

export interface AttributeGroup {
  attribute: string;
  values: string[];
}

const bySortThenName = <T>(sort: (t: T) => number | null, name: (t: T) => string) => (a: T, b: T) =>
  (sort(a) ?? Number.MAX_SAFE_INTEGER) - (sort(b) ?? Number.MAX_SAFE_INTEGER) ||
  name(a).localeCompare(name(b));

/** Groups a product's dereferenced attribute values by attribute, in editor-defined order. */
export function groupAttributeValues(rows: (AttributeValueRow | null)[] | null | undefined): AttributeGroup[] {
  const groups = new Map<string, { title: string; sortOrder: number | null; values: AttributeValueRow[] }>();
  for (const row of rows ?? []) {
    if (!row?.attribute) continue;
    const group = groups.get(row.attribute._id) ?? {
      title: row.attribute.title,
      sortOrder: row.attribute.sortOrder,
      values: [],
    };
    group.values.push(row);
    groups.set(row.attribute._id, group);
  }
  return [...groups.values()]
    .sort(bySortThenName((g) => g.sortOrder, (g) => g.title))
    .map((g) => ({
      attribute: g.title,
      values: g.values.sort(bySortThenName((v) => v.sortOrder, (v) => v.label)).map((v) => v.label),
    }));
}
