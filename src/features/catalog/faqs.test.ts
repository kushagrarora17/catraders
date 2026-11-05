import { expect, test } from "bun:test";
import type { PRODUCT_BY_SLUG_QUERY_RESULT } from "@/sanity/types";
import { productFaqs } from "./faqs";

const product = { title: "Test Oil", inStock: true, attributeValues: [] } as unknown as NonNullable<PRODUCT_BY_SLUG_QUERY_RESULT>;

test("custom answers come first and replace matching defaults", () => {
  const result = productFaqs({ ...product, faqs: [{ _key: "a", _type: "faq", question: " Where can I buy Test Oil? ", answer: "Custom answer" }] });
  expect(result[0].answer).toBe("Custom answer");
  expect(result.filter((faq) => faq.question === "Where can I buy Test Oil?")).toHaveLength(1);
});

test("suppression can remove the entire FAQ section", () => {
  expect(productFaqs({ ...product, suppressDefaultFaqs: true })).toEqual([]);
});

test("local content requires cities and stock controls quote instructions", () => {
  expect(productFaqs(product).some((faq) => faq.question.includes("near me"))).toBe(false);
  const result = productFaqs({ ...product, inStock: false }, ["London", "Windsor"]);
  expect(result.find((faq) => faq.question.includes("near me"))?.answer).toContain("London, Windsor");
  expect(result.some((faq) => faq.answer.includes("Add to quote"))).toBe(false);
});
