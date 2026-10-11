import "server-only";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getDb } from "@/server/db";
import { quoteStatus } from "@/server/db/schema";
import { INQUIRY_REFERENCE_PATTERN, REFERENCE_NUMBER_PATTERN } from "@/server/quotes/reference";
import { getInquiry, getQuote, listInquiries, listQuotes, setRequestStatus } from "../requests";
import { fail, IDEMPOTENT_WRITE, ok, READ_ONLY } from "./util";

const statusSchema = z.enum(quoteStatus.enumValues);

const referenceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (ref) => REFERENCE_NUMBER_PATTERN.test(ref) || INQUIRY_REFERENCE_PATTERN.test(ref),
    "Use an RFQ-YYYY-NNNNN or INQ-YYYY-NNNNN reference",
  );

export function registerRequestTools(server: McpServer) {
  server.registerTool(
    "list_requests",
    {
      title: "List quote requests or inquiries",
      description:
        "Newest first. 'quote' = RFQs submitted from the quote cart; 'inquiry' = landing-page contact form messages. Filter by status or by created-since date.",
      inputSchema: z.object({
        kind: z.enum(["quote", "inquiry"]),
        status: statusSchema.optional(),
        since: z.string().optional().describe("ISO date or datetime; only requests created at or after it"),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      annotations: READ_ONLY,
    },
    async ({ kind, status, since, limit }) => {
      const sinceDate = since ? new Date(since) : undefined;
      if (sinceDate && Number.isNaN(sinceDate.getTime())) return fail(`"${since}" is not a valid date`);
      const filter = { status, since: sinceDate, limit };
      return ok(kind === "quote" ? await listQuotes(getDb(), filter) : await listInquiries(getDb(), filter));
    },
  );

  server.registerTool(
    "get_request",
    {
      title: "Get a quote request or inquiry",
      description:
        "Full details by reference number (RFQ-… for quotes, INQ-… for inquiries). Quotes include their line items with the specifications captured when the customer submitted them.",
      inputSchema: z.object({ reference: referenceSchema }),
      annotations: READ_ONLY,
    },
    async ({ reference }) => {
      const isInquiry = INQUIRY_REFERENCE_PATTERN.test(reference);
      const found = isInquiry ? await getInquiry(getDb(), reference) : await getQuote(getDb(), reference);
      return found ? ok(found) : fail(`No ${isInquiry ? "inquiry" : "quote request"} with reference ${reference}`);
    },
  );

  server.registerTool(
    "update_request_status",
    {
      title: "Update request status",
      description:
        "Move a quote request or inquiry through its lifecycle: pending → under_review → quoted → closed, or rejected. This only records the status; it doesn't email the customer.",
      inputSchema: z.object({ reference: referenceSchema, status: statusSchema }),
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ reference, status }) => {
      const isInquiry = INQUIRY_REFERENCE_PATTERN.test(reference);
      const previous = await setRequestStatus(getDb(), isInquiry ? "inquiry" : "quote", reference, status);
      if (previous === null) return fail(`No ${isInquiry ? "inquiry" : "quote request"} with reference ${reference}`);
      return ok({ reference, previousStatus: previous, status, changed: previous !== status });
    },
  );
}
