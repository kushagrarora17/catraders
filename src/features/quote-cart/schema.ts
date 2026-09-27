import { z } from "zod";

export const MAX_QUOTE_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 10_000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || undefined);

export const quoteItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{1,128}$/, "Invalid product id"),
  title: z.string().trim().min(1).max(255),
  sku: optionalText(100),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
});

export const quoteRequestSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(255),
    email: z.string().trim().max(255).pipe(z.email("Enter a valid email address")),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
    company: optionalText(255),
  }),
  items: z
    .array(quoteItemSchema)
    .min(1, "Add at least one product to your quote")
    .max(MAX_QUOTE_ITEMS)
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      "Each product may only appear once",
    ),
  notes: optionalText(2000),
});

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
export type QuoteRequest = z.output<typeof quoteRequestSchema>;

export interface FieldIssue {
  path: string;
  message: string;
}

export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Response bodies of POST /api/quotes. */
export type QuoteResponse =
  | { success: true; referenceNumber: string; message: string }
  | {
      success: false;
      error: "INVALID_JSON" | "VALIDATION_FAILED" | "UNKNOWN_PRODUCTS" | "OUT_OF_STOCK" | "PAYLOAD_TOO_LARGE" | "INTERNAL_ERROR";
      message: string;
      issues?: FieldIssue[];
      productIds?: string[];
    };

/** Response body of GET /api/availability. */
export interface AvailabilityResponse {
  products: { id: string; exists: boolean; inStock: boolean }[];
}
