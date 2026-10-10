import { z } from "zod";

export interface FieldIssue {
  path: string;
  message: string;
}

export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Trimmed optional string; empty becomes undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || undefined);

export const requiredCity = z.string().trim().min(1, "Enter your city").max(100);

export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

/** Header the forms send (one UUID per submission) so the API can ignore repeats. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** The key if it's a valid UUID, otherwise undefined (the request is then processed without dedupe). */
export const parseIdempotencyKey = (value: string | null) => z.uuid().safeParse(value).data;
