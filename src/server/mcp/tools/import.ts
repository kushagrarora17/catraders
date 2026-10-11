import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getWriteClient } from "@/sanity/write-client";
import { csvToRecords } from "../csv";
import {
  type ExistingProductDoc,
  type ImportPlan,
  MAX_IMPORT_ROWS,
  planImport,
  type RowPlan,
  slugCandidatesForNewRows,
} from "../import-plan";
import { type UploadedImage, uploadImageFromUrl } from "../images";
import { buildProductDocument, buildProductPatch, lookupBySku } from "../products";
import { PRODUCT_SLUGS_TAKEN_QUERY } from "../queries";
import { revalidateCatalog } from "../revalidate";
import { loadTaxonomy } from "../taxonomy";
import { fail, ok, WRITE } from "./util";

const REPORT_ROW_LIMIT = 100;

async function applyPlan(plan: ImportPlan) {
  const client = getWriteClient();
  const transaction = client.transaction();

  for (const value of plan.newValues) {
    transaction.create({
      _id: value._id,
      _type: "attributeValue",
      attribute: { _type: "reference", _ref: value.attribute._id },
      label: value.label,
      slug: { _type: "slug", current: value.slug },
    });
  }

  let writes = plan.newValues.length;
  for (const row of plan.rows) {
    try {
      if (row.create) {
        const images: UploadedImage[] = [];
        for (const url of row.create.imageUrls) images.push(await uploadImageFromUrl(url, row.create.fields.title));
        transaction.create(buildProductDocument(row.create.id, { ...row.create.fields, images }));
        writes++;
      } else if (row.update) {
        const { set, unset } = buildProductPatch(row.update.patch);
        const images: UploadedImage[] = [];
        for (const url of row.update.imageUrls) images.push(await uploadImageFromUrl(url, row.sku));
        transaction.patch(row.update.docId, (patch) => {
          if (Object.keys(set).length) patch.set(set);
          if (unset.length) patch.unset(unset);
          if (images.length) patch.setIfMissing({ images: [] }).insert("after", "images[-1]", images);
          return patch;
        });
        writes++;
      }
    } catch (error) {
      // Skip just this row; the rest of the file still goes through.
      row.action = "error";
      row.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (writes) await transaction.commit();
  return writes;
}

const summarize = (rows: RowPlan[]) => ({
  create: rows.filter((r) => r.action === "create").length,
  update: rows.filter((r) => r.action === "update").length,
  unchanged: rows.filter((r) => r.action === "unchanged").length,
  error: rows.filter((r) => r.action === "error").length,
});

export function registerImportTool(server: McpServer) {
  server.registerTool(
    "import_products_csv",
    {
      title: "Import products from CSV",
      description: [
        "Create or update many products from CSV text, matched by SKU. Defaults to a dry run that validates every row and reports what would change without writing; run it first, then repeat with dryRun false.",
        "Columns (header row required, case-insensitive): sku (required); title and category (required for new products; category is a slug or exact title); in_stock (yes/no); description; image_url (https links separated by |); and one 'attr:<attribute-slug>' column per attribute with values separated by | (e.g. attr:viscosity = 5W-30).",
        "For existing SKUs, only non-blank cells change anything, and an attr: cell replaces that attribute's values. Rows with errors are skipped and reported; valid rows still apply. Max 500 rows.",
      ].join(" "),
      inputSchema: z.object({
        csv: z.string().min(1).max(1_000_000).describe("The CSV file contents"),
        dryRun: z.boolean().default(true),
        createMissingValues: z
          .boolean()
          .default(false)
          .describe("Create attribute values that don't exist yet (attributes and categories are never created)"),
      }),
      annotations: { ...WRITE, openWorldHint: true },
    },
    async ({ csv, dryRun, createMissingValues }) => {
      let parsed: ReturnType<typeof csvToRecords>;
      try {
        parsed = csvToRecords(csv);
      } catch (error) {
        return fail(error instanceof Error ? error.message : "Couldn't parse the CSV");
      }
      if (!parsed.headers.includes("sku")) return fail("The CSV needs a 'sku' column in its header row");
      if (!parsed.records.length) return fail("The CSV has no data rows");
      if (parsed.records.length > MAX_IMPORT_ROWS) {
        return fail(`The CSV has ${parsed.records.length} rows; the limit is ${MAX_IMPORT_ROWS} per import. Split it up`);
      }

      const client = getWriteClient();
      const taxonomy = await loadTaxonomy();
      const skus = [...new Set(parsed.records.map((r) => r.values.sku).filter(Boolean))];
      const existing = await lookupBySku(skus);

      const docIds = [...existing.values()].flatMap((products) => (products.length === 1 ? [products[0].docId] : []));
      const docs = docIds.length ? await client.getDocuments<ExistingProductDoc & { _id: string }>(docIds) : [];
      const existingDocs = new Map(docs.flatMap((doc) => (doc ? [[doc._id, doc] as const] : [])));

      const candidates = slugCandidatesForNewRows(parsed.records, new Set(existing.keys()));
      const takenSlugs = candidates.length ? await client.fetch(PRODUCT_SLUGS_TAKEN_QUERY, { candidates }) : [];

      const plan = planImport({
        headers: parsed.headers,
        records: parsed.records,
        taxonomy,
        existing,
        existingDocs,
        takenSlugs,
        createMissingValues,
      });

      let written = 0;
      if (!dryRun) {
        written = await applyPlan(plan);
        if (written) revalidateCatalog();
      }

      const shown = plan.rows.filter((r) => r.action !== "unchanged");
      return ok({
        dryRun,
        ...(dryRun ? { note: "Nothing was written. Repeat with dryRun false to apply." } : { documentsWritten: written }),
        summary: summarize(plan.rows),
        newAttributeValues: plan.newValues.map((v) => ({ attribute: v.attribute.slug, label: v.label })),
        ...(plan.unknownColumns.length ? { ignoredColumns: plan.unknownColumns } : {}),
        rows: shown.slice(0, REPORT_ROW_LIMIT).map((r) => ({
          line: r.line,
          sku: r.sku,
          action: r.action,
          ...(r.changes.length ? { changes: r.changes } : {}),
          ...(r.errors.length ? { errors: r.errors } : {}),
        })),
        ...(shown.length > REPORT_ROW_LIMIT ? { truncated: `${shown.length - REPORT_ROW_LIMIT} more rows not shown` } : {}),
      });
    },
  );
}
