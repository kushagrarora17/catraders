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

export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
