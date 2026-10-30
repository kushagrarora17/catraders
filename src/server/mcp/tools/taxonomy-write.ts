import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getWriteClient } from "@/sanity/write-client";
import { revalidateCatalog } from "../revalidate";
import { loadTaxonomy } from "../taxonomy";
import { checkAttributeSlug, checkCategoryPlacement, slugify } from "../validation";
import { fail, IDEMPOTENT_WRITE, ok } from "./util";

const slugRef = (current: string) => ({ _type: "slug" as const, current });

export function registerTaxonomyWriteTools(server: McpServer) {
  server.registerTool(
    "upsert_category",
    {
      title: "Create or update a category",
      description:
        "Create a category, or update the one with the same slug. Level 1 is top-level; level 2 and 3 need a parent exactly one level up (give its slug). An existing category's level can't change.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(100),
        slug: z.string().trim().max(96).optional().describe("Defaults to a slug derived from the title"),
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        parent: z.string().optional().describe("Parent category slug (required for levels 2 and 3)"),
        sortOrder: z.number().optional().describe("Lower numbers are listed first"),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ title, slug, level, parent, sortOrder }) => {
      const taxonomy = await loadTaxonomy();
      const categorySlug = slugify(slug ?? title);
      if (!categorySlug) return fail("Slug has no usable characters");

      const parentCategory = parent ? taxonomy.categoryBySlug.get(slugify(parent)) : undefined;
      if (parent && !parentCategory) return fail(`Unknown parent category "${parent}"`);
      const placementError = checkCategoryPlacement(level, parentCategory?.level ?? null);
      if (placementError) return fail(placementError);

      const existing = taxonomy.categoryBySlug.get(categorySlug);
      const client = getWriteClient();

      if (existing) {
        if (existing.level !== level) {
          return fail(`Category "${categorySlug}" is level ${existing.level}; the level of an existing category can't change`);
        }
        let patch = client.patch(existing._id).set({ title });
        if (parentCategory) patch = patch.set({ parent: { _type: "reference", _ref: parentCategory._id } });
        if (sortOrder !== undefined) patch = patch.set({ sortOrder });
        await patch.commit();
        await revalidateCatalog();
        return ok({ id: existing._id, slug: categorySlug, created: false });
      }

      const created = await client.create({
        _type: "category",
        vertical: "automotive",
        title,
        slug: slugRef(categorySlug),
        level,
        ...(parentCategory ? { parent: { _type: "reference", _ref: parentCategory._id } } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      });
      await revalidateCatalog();
      return ok({ id: created._id, slug: categorySlug, created: true });
    },
  );

  server.registerTool(
    "upsert_attribute",
    {
      title: "Create or update an attribute",
      description:
        "Create a product attribute (e.g. Viscosity Grade), or update the one with the same slug. Its slug becomes a catalog filter in URLs, so a few names are reserved (q, category, available, page, sort). Set allowMultiple for attributes where a product can have several values, such as approvals.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(100),
        slug: z.string().trim().max(48).optional().describe("Defaults to a slug derived from the title"),
        filterable: z.boolean().optional().describe("Show as a catalog filter (default true for new attributes)"),
        allowMultiple: z.boolean().optional().describe("Products may have several values (default false for new attributes)"),
        sortOrder: z.number().optional(),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ title, slug, filterable, allowMultiple, sortOrder }) => {
      const attributeSlug = slugify(slug ?? title, 48);
      const slugError = checkAttributeSlug(attributeSlug);
      if (slugError) return fail(slugError);

      const taxonomy = await loadTaxonomy();
      const existing = taxonomy.attributeBySlug.get(attributeSlug);
      const client = getWriteClient();

      if (existing) {
        const set: Record<string, unknown> = { title };
        if (filterable !== undefined) set.filterable = filterable;
        if (allowMultiple !== undefined) set.allowMultiple = allowMultiple;
        if (sortOrder !== undefined) set.sortOrder = sortOrder;
        await client.patch(existing._id).set(set).commit();
        await revalidateCatalog();
        return ok({ id: existing._id, slug: attributeSlug, created: false });
      }

      const created = await client.create({
        _type: "attribute",
        vertical: "automotive",
        title,
        slug: slugRef(attributeSlug),
        filterable: filterable ?? true,
        allowMultiple: allowMultiple ?? false,
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      });
      await revalidateCatalog();
      return ok({ id: created._id, slug: attributeSlug, created: true });
    },
  );

  server.registerTool(
    "upsert_attribute_value",
    {
      title: "Create or update an attribute value",
      description:
        "Add an allowed value to an attribute (e.g. '5W-30' under viscosity), or update the value with the same slug. Products can only use values that exist.",
      inputSchema: z.object({
        attribute: z.string().min(1).describe("Attribute slug"),
        label: z.string().trim().min(1).max(100).describe("Display label, e.g. 5W-30 or 4 L"),
        slug: z.string().trim().max(48).optional().describe("Defaults to a slug derived from the label"),
        sortOrder: z.number().optional(),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ attribute, label, slug, sortOrder }) => {
      const taxonomy = await loadTaxonomy();
      const parent = taxonomy.attributeBySlug.get(attribute);
      if (!parent) {
        return fail(`Unknown attribute "${attribute}". Attributes: ${taxonomy.attributes.map((a) => a.slug).join(", ") || "none"}`);
      }
      const valueSlug = slugify(slug ?? label, 48);
      if (!valueSlug) return fail("Slug has no usable characters");

      const existing = parent.values.find((v) => v.slug === valueSlug);
      const client = getWriteClient();

      if (existing) {
        const set: Record<string, unknown> = { label };
        if (sortOrder !== undefined) set.sortOrder = sortOrder;
        await client.patch(existing._id).set(set).commit();
        await revalidateCatalog();
        return ok({ id: existing._id, attribute, slug: valueSlug, created: false });
      }

      const created = await client.create({
        _type: "attributeValue",
        attribute: { _type: "reference", _ref: parent._id },
        label,
        slug: slugRef(valueSlug),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
      });
      await revalidateCatalog();
      return ok({ id: created._id, attribute, slug: valueSlug, created: true });
    },
  );
}
