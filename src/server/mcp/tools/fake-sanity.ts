// Test double for the Sanity client used by the MCP tools: an in-memory document store that
// understands just the queries and mutations the tools issue. Not a GROQ engine; it answers each
// known query constant from the store.
import {
  ATTRIBUTES_QUERY,
  CATEGORIES_QUERY,
  PRODUCT_LOOKUP_QUERY,
  PRODUCT_SLUGS_TAKEN_QUERY,
} from "../queries";

export type Doc = { _id: string; _type: string; [field: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

type Op =
  | { kind: "create"; doc: Doc }
  | { kind: "createOrReplace"; doc: Doc }
  | { kind: "delete"; id: string }
  | { kind: "patch"; id: string; apply: (doc: Doc) => void };

class FakePatch {
  ops: ((doc: Doc) => void)[] = [];
  set(values: Record<string, unknown>) {
    this.ops.push((doc) => Object.assign(doc, values));
    return this;
  }
  unset(fields: string[]) {
    this.ops.push((doc) => fields.forEach((f) => delete doc[f]));
    return this;
  }
  setIfMissing(values: Record<string, unknown>) {
    this.ops.push((doc) => {
      for (const [key, value] of Object.entries(values)) if (doc[key] === undefined) doc[key] = value;
    });
    return this;
  }
  insert(_position: "after", selector: string, items: unknown[]) {
    const field = selector.replace(/\[-1\]$/, "");
    this.ops.push((doc) => (doc[field] = [...(doc[field] ?? []), ...items]));
    return this;
  }
  apply(doc: Doc) {
    this.ops.forEach((op) => op(doc));
  }
}

export class FakeSanity {
  docs = new Map<string, Doc>();
  /** Every committed batch of mutations, for assertions about atomicity. */
  commits: string[][] = [];
  private counter = 0;

  constructor(docs: Doc[] = []) {
    for (const doc of docs) this.docs.set(doc._id, structuredClone(doc));
  }

  byType(type: string) {
    return [...this.docs.values()].filter((d) => d._type === type);
  }

  // --- reads ---------------------------------------------------------------------------------

  async fetch(query: string, params: Record<string, any> = {}) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (query === CATEGORIES_QUERY) {
      return this.byType("category").map((c) => ({
        _id: c._id,
        title: c.title,
        slug: c.slug.current,
        level: c.level,
        parentId: c.parent?._ref ?? null,
        sortOrder: c.sortOrder ?? null,
      }));
    }
    if (query === ATTRIBUTES_QUERY) {
      return this.byType("attribute").map((a) => ({
        _id: a._id,
        title: a.title,
        slug: a.slug.current,
        filterable: a.filterable ?? null,
        allowMultiple: a.allowMultiple ?? null,
        sortOrder: a.sortOrder ?? null,
        values: this.byType("attributeValue")
          .filter((v) => v.attribute._ref === a._id)
          .map((v) => ({ _id: v._id, label: v.label, slug: v.slug.current, sortOrder: v.sortOrder ?? null })),
      }));
    }
    if (query === PRODUCT_LOOKUP_QUERY) {
      const keys: string[] = params.keys;
      return this.byType("product")
        .filter((p) => keys.includes(p.sku) || keys.includes(p.slug.current) || keys.includes(p._id))
        .map((p) => ({ _id: p._id, title: p.title, slug: p.slug.current, sku: p.sku ?? null, inStock: p.inStock }));
    }
    if (query === PRODUCT_SLUGS_TAKEN_QUERY) {
      return this.byType("product")
        .map((p) => p.slug.current as string)
        .filter((slug) => (params.candidates as string[]).includes(slug));
    }
    throw new Error(`FakeSanity: unhandled query ${query.slice(0, 60)}`);
  }

  async getDocument(id: string) {
    return structuredClone(this.docs.get(id)) ?? undefined;
  }

  async getDocuments(ids: string[]) {
    return ids.map((id) => structuredClone(this.docs.get(id)) ?? null);
  }

  // --- writes --------------------------------------------------------------------------------

  async create(doc: Omit<Doc, "_id"> & { _id?: string }) {
    const created = { ...doc, _id: doc._id ?? `fake-${++this.counter}` } as Doc;
    this.run([{ kind: "create", doc: created }]);
    return structuredClone(created);
  }

  patch(id: string) {
    const patch = new FakePatch();
    return Object.assign(patch, {
      commit: async () => this.run([{ kind: "patch", id, apply: (doc: Doc) => patch.apply(doc) }]),
    });
  }

  transaction() {
    const ops: Op[] = [];
    const tx = {
      create: (doc: Doc) => (ops.push({ kind: "create", doc }), tx),
      createOrReplace: (doc: Doc) => (ops.push({ kind: "createOrReplace", doc }), tx),
      delete: (id: string) => (ops.push({ kind: "delete", id }), tx),
      patch: (id: string, change: Record<string, any> | ((patch: FakePatch) => unknown)) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const patch = new FakePatch();
        if (typeof change === "function") change(patch);
        else {
          if (change.set) patch.set(change.set);
          if (change.unset) patch.unset(change.unset);
        }
        ops.push({ kind: "patch", id, apply: (doc) => patch.apply(doc) });
        return tx;
      },
      commit: async () => this.run(ops),
    };
    return tx;
  }

  /** All-or-nothing: validates first, then applies. */
  private run(ops: Op[]) {
    const next = new Map([...this.docs].map(([id, doc]) => [id, structuredClone(doc)]));
    const log: string[] = [];
    for (const op of ops) {
      if (op.kind === "create") {
        if (next.has(op.doc._id)) throw new Error(`Document ${op.doc._id} already exists`);
        next.set(op.doc._id, structuredClone(op.doc));
        log.push(`create ${op.doc._id}`);
      } else if (op.kind === "createOrReplace") {
        next.set(op.doc._id, structuredClone(op.doc));
        log.push(`createOrReplace ${op.doc._id}`);
      } else if (op.kind === "delete") {
        next.delete(op.id);
        log.push(`delete ${op.id}`);
      } else {
        const doc = next.get(op.id);
        if (!doc) throw new Error(`Document ${op.id} not found`);
        op.apply(doc);
        log.push(`patch ${op.id}`);
      }
    }
    this.docs = next;
    this.commits.push(log);
  }
}
