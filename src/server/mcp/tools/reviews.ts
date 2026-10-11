import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { HIDDEN_REVIEWS_QUERY_RESULT, REVIEWS_QUERY_RESULT } from "@/sanity/types";
import { getWriteClient } from "@/sanity/write-client";
import { baseId } from "../products";
import { HIDDEN_REVIEWS_QUERY, REVIEWS_QUERY } from "../queries";
import { revalidateReviews } from "../revalidate";
import { fail, IDEMPOTENT_WRITE, ok, READ_ONLY } from "./util";

export function registerReviewTools(server: McpServer) {
  server.registerTool(
    "list_reviews",
    {
      title: "List customer reviews",
      description: "Reviews shown on the landing page. Use visibility 'hidden' to see unpublished ones.",
      inputSchema: z.object({ visibility: z.enum(["visible", "hidden"]).default("visible") }),
      annotations: READ_ONLY,
    },
    async ({ visibility }) => {
      const client = getWriteClient();
      const reviews =
        visibility === "hidden"
          ? await client.fetch<HIDDEN_REVIEWS_QUERY_RESULT>(HIDDEN_REVIEWS_QUERY, {}, { perspective: "raw" })
          : await client.fetch<REVIEWS_QUERY_RESULT>(REVIEWS_QUERY);
      return ok(reviews.map((review) => ({ ...review, _id: undefined, id: baseId(review._id) })));
    },
  );

  server.registerTool(
    "upsert_review",
    {
      title: "Create or update a review",
      description:
        "Add a customer review, or edit an existing one by id (only the fields you pass change). Reviewer names are shown as first name and last initial, e.g. 'Ranjit K.'. New reviews are published immediately.",
      inputSchema: z.object({
        id: z.string().optional().describe("Existing review id; omit to create a new review"),
        quote: z.string().trim().min(1).max(500).optional(),
        name: z.string().trim().min(1).max(100).optional().describe("First name and last initial"),
        role: z.string().trim().max(150).optional().describe("e.g. Owner — Windsor Auto Service"),
        city: z.string().trim().max(100).optional(),
        rating: z.number().int().min(1).max(5).optional().describe("1–5 (defaults to 5 for new reviews)"),
        sortOrder: z.number().optional().describe("Lower numbers are listed first"),
      }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, quote, name, role, city, rating, sortOrder }) => {
      const client = getWriteClient();
      const fields = Object.fromEntries(
        Object.entries({ quote, name, role, city, rating, sortOrder }).filter(([, value]) => value !== undefined),
      );

      if (!id) {
        if (!quote || !name) return fail("New reviews need at least a quote and a name");
        const created = await client.create({
          _type: "testimonial",
          vertical: "automotive",
          rating: 5,
          ...fields,
        });
        revalidateReviews();
        return ok({ id: created._id, created: true });
      }

      const published = baseId(id);
      const [live, draft] = await client.getDocuments<{ _id: string; _type: string; vertical?: string }>([
        published,
        `drafts.${published}`,
      ]);
      const existing = live ?? draft;
      if (!existing || existing._type !== "testimonial" || existing.vertical !== "automotive") {
        return fail(`No review with id "${published}"`);
      }
      if (!Object.keys(fields).length) return fail("Nothing to update: pass at least one field to change");

      await client.patch(existing._id).set(fields).commit();
      revalidateReviews();
      return ok({ id: published, created: false, visible: !!live });
    },
  );
}
