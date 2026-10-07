import { expect, test } from "bun:test";
import { toFieldIssues } from "@/lib/validation";
import { inquirySchema } from "./schema";

const valid = {
  name: "  Jane Smith ",
  business: "Smith Auto",
  city: " Windsor ",
  email: "jane@smithauto.ca",
  phone: "",
  category: "",
  message: "",
};

test("accepts a minimal inquiry and normalises empty optionals to undefined", () => {
  const result = inquirySchema.parse(valid);
  expect(result).toEqual({
    name: "Jane Smith",
    business: "Smith Auto",
    city: "Windsor",
    email: "jane@smithauto.ca",
    phone: undefined,
    category: undefined,
    message: undefined,
  });
});

test("keeps provided optional fields", () => {
  const result = inquirySchema.parse({
    ...valid,
    phone: "(416) 555-0000",
    category: "Engine Oils",
    message: "20 cases of 5W-30",
  });
  expect(result.phone).toBe("(416) 555-0000");
  expect(result.category).toBe("Engine Oils");
  expect(result.message).toBe("20 cases of 5W-30");
});

test("reports field-level issues for missing and invalid values", () => {
  const result = inquirySchema.safeParse({ ...valid, name: " ", city: " ", email: "nope", phone: "abc", category: "Tyres" });
  expect(result.success).toBe(false);
  const paths = toFieldIssues(result.error!).map((i) => i.path);
  expect(paths).toEqual(expect.arrayContaining(["name", "city", "email", "phone", "category"]));
});

test("strips unknown keys such as the honeypot", () => {
  const result = inquirySchema.parse({ ...valid, website: "spam" });
  expect("website" in result).toBe(false);
});
