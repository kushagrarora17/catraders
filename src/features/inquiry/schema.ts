import { z } from "zod";
import { type FieldIssue, optionalText, PHONE_PATTERN, requiredCity } from "@/lib/validation";

export const INQUIRY_CATEGORIES = [
  "Engine Oils",
  "ATF / Transmission Fluid",
  "Gear Oil",
  "Coolant",
  "Additives & Maintenance",
  "Filters (Oil / Cabin / Engine)",
  "Refrigerants",
  "Aerosols & Undercoating",
  "Functional Fluids",
  "Shop Supplies",
  "Multiple / Full Order",
] as const;

export const MAX_MESSAGE_LENGTH = 2000;

export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(255),
  business: z.string().trim().min(1, "Enter your business name").max(255),
  city: requiredCity,
  email: z.string().trim().max(255).pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid phone number")
    .transform((value) => value || undefined),
  category: z
    .union([z.literal(""), z.enum(INQUIRY_CATEGORIES)], { error: "Choose a category from the list" })
    .transform((value) => value || undefined),
  message: optionalText(MAX_MESSAGE_LENGTH),
});

/** Name of the hidden honeypot field; checked by the API before validation (unknown keys are stripped). */
export const HONEYPOT_FIELD = "website";

export type InquiryInput = z.input<typeof inquirySchema>;
export type Inquiry = z.output<typeof inquirySchema>;

/** Response bodies of POST /api/inquiries. */
export type InquiryResponse =
  | { success: true; referenceNumber: string; message: string }
  | {
      success: false;
      error: "INVALID_JSON" | "VALIDATION_FAILED" | "PAYLOAD_TOO_LARGE" | "INTERNAL_ERROR";
      message: string;
      issues?: FieldIssue[];
    };
